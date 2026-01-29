// app/api/colegios/estadisticas/route.js (versión final)
import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import { cerrarSorteosVencidos } from "@/lib/cerrarSorteosVencidos";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
    await cerrarSorteosVencidos();
    try {
        const { searchParams } = new URL(request.url);
        const fechaInicio = searchParams.get('fechaInicio');
        const fechaFin = searchParams.get('fechaFin');
        const estatus = searchParams.get('estatus');
        
        // Construir la consulta base
        let query = `
            SELECT 
                c.id_colegio,
                c.nombre,
                c.logo_url,
                c.created_at,
                c.estatus,
                COUNT(DISTINCT s.id_sorteo) as sorteos_activos
            FROM colegios c
            LEFT JOIN sorteo s ON c.id_colegio = s.colegio_id 
                AND s.estatus = 'activo'
        `;
        
        const conditions = [];
        const params = [];
        
        // Aplicar filtros
        if (fechaInicio) {
            conditions.push(`c.created_at >= ?`);
            params.push(fechaInicio);
        }
        
        if (fechaFin) {
            conditions.push(`c.created_at <= DATE_ADD(?, INTERVAL 1 DAY)`);
            params.push(fechaFin);
        }
        
        if (estatus && estatus !== 'todos') {
            conditions.push(`c.estatus = ?`);
            params.push(estatus);
        }
        
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // Agrupar por colegio
        query += ` GROUP BY c.id_colegio ORDER BY c.created_at DESC`;
        
        const [colegios] = await pool.query(query, params);
        
        // Obtener datos de recaudación y comisiones para cada colegio
        for (const colegio of colegios) {
            // 1. Obtener datos de sorteos activos individualmente
            const [sorteosData] = await pool.query(
                `SELECT 
                    s.id_sorteo,
                    s.precio_boleto,
                    s.digitos_boleto,
                    s.comision_vendedor,
                    -- Boletos vendidos por sorteo
                    (SELECT COUNT(*) FROM boletos b WHERE b.id_sorteo = s.id_sorteo) as boletos_vendidos_sorteo,
                    -- Venta por sorteo
                    (SELECT SUM(b.precio) FROM boletos b WHERE b.id_sorteo = s.id_sorteo) as venta_sorteo
                 FROM sorteo s
                 WHERE s.colegio_id = ? AND s.estatus = 'activo'`,
                [colegio.id_colegio]
            );
            
            // Inicializar acumuladores
            let recaudacionEsperadaTotal = 0;
            let recaudacionActualTotal = 0;
            let boletosVendidosTotal = 0;
            let comisionEsperadaTotal = 0;
            let totalBoletosPotenciales = 0;
            
            // Calcular por cada sorteo
            sorteosData.forEach(sorteo => {
                const boletosPotencialesSorteo = Math.pow(10, sorteo.digitos_boleto);
                const recaudacionEsperadaSorteo = boletosPotencialesSorteo * sorteo.precio_boleto;
                const recaudacionActualSorteo = sorteo.venta_sorteo || 0;
                const comisionEsperadaSorteo = recaudacionEsperadaSorteo * (sorteo.comision_vendedor / 100);
                
                recaudacionEsperadaTotal += recaudacionEsperadaSorteo;
                recaudacionActualTotal += recaudacionActualSorteo;
                boletosVendidosTotal += sorteo.boletos_vendidos_sorteo || 0;
                comisionEsperadaTotal += comisionEsperadaSorteo;
                totalBoletosPotenciales += boletosPotencialesSorteo;
            });
            
            // 2. Obtener comisiones actuales (de cortes de caja)
            const [comisionActualData] = await pool.query(
                `SELECT SUM(comision) as comision_actual_total
                 FROM cortesdecaja
                 WHERE colegio_id = ?`,
                [colegio.id_colegio]
            );
            
            // Asignar valores al colegio
            colegio.recaudacion_esperada_total = recaudacionEsperadaTotal;
            colegio.recaudacion_actual = recaudacionActualTotal;
            colegio.comision_actual_total = comisionActualData[0]?.comision_actual_total || 0;
            colegio.comision_esperada_total = comisionEsperadaTotal;
            colegio.boletos_vendidos = boletosVendidosTotal;
            // Mantener venta_total para compatibilidad (opcional)
            colegio.venta_total = colegio.recaudacion_actual;
            
            // Calcular porcentaje de venta
            colegio.porcentaje_venta = totalBoletosPotenciales > 0 
                ? (boletosVendidosTotal / totalBoletosPotenciales * 100).toFixed(2)
                : 0;
                
            // Calcular netos
            colegio.neto_actual = colegio.recaudacion_actual - colegio.comision_actual_total;
            colegio.neto_esperado = colegio.recaudacion_esperada_total - colegio.comision_esperada_total;
        }
        
        return NextResponse.json({
            success: true,
            colegios: colegios,
            total: colegios.length,
            filtros: {
                fechaInicio,
                fechaFin,
                estatus
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Error interno del servidor',
                details: error.message 
            },
            { status: 500 }
        );
    }
}