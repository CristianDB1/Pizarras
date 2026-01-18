// app/api/colegios/estadisticas/route.js
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
            // 1. Obtener recaudación total esperada (todos los boletos posibles)
            const [recaudacionData] = await pool.query(
                `SELECT 
                    SUM(s.precio_boleto * POW(10, s.digitos_boleto)) as recaudacion_potencial,
                    SUM(b.precio) as recaudacion_actual
                 FROM sorteo s
                 LEFT JOIN boletos b ON s.id_sorteo = b.id_sorteo
                 WHERE s.colegio_id = ? AND s.estatus = 'activo'`,
                [colegio.id_colegio]
            );
            
            // 2. Obtener comisiones totales (de cortes de caja)
            const [comisionData] = await pool.query(
                `SELECT 
                    SUM(comision) as comision_total
                 FROM cortesdecaja
                 WHERE colegio_id = ?`,
                [colegio.id_colegio]
            );
            
            // 3. Obtener boletos vendidos
            const [boletosData] = await pool.query(
                `SELECT 
                    COUNT(*) as boletos_vendidos,
                    SUM(b.precio) as venta_total
                 FROM boletos b
                 JOIN sorteo s ON b.id_sorteo = s.id_sorteo
                 WHERE s.colegio_id = ? AND s.estatus = 'activo'`,
                [colegio.id_colegio]
            );
            
            colegio.recaudacion_esperada_total = recaudacionData[0]?.recaudacion_potencial || 0;
            colegio.recaudacion_actual = recaudacionData[0]?.recaudacion_actual || 0;
            colegio.comision_total = comisionData[0]?.comision_total || 0;
            colegio.boletos_vendidos = boletosData[0]?.boletos_vendidos || 0;
            colegio.venta_total = boletosData[0]?.venta_total || 0;
            
            // Calcular porcentaje de venta
            // Primero obtener precio promedio para calcular boletos potenciales
            const [precioData] = await pool.query(
                `SELECT AVG(precio_boleto) as precio_promedio 
                 FROM sorteo 
                 WHERE colegio_id = ? AND estatus = 'activo'`,
                [colegio.id_colegio]
            );
            
            const precioPromedio = precioData[0]?.precio_promedio || 1;
            const totalBoletosPotenciales = colegio.recaudacion_esperada_total / precioPromedio;
            
            colegio.porcentaje_venta = totalBoletosPotenciales > 0 
                ? (colegio.boletos_vendidos / totalBoletosPotenciales * 100).toFixed(2)
                : 0;
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