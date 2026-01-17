// app/api/sorteos/colegio/[id]/activos/route.js
import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
    try {
        const { id } = params;
        
        // Validar que el colegio existe
        const [colegioExiste] = await pool.query(
            `SELECT id_colegio, nombre FROM colegios WHERE id_colegio = ?`,
            [id]
        );
        
        if (colegioExiste.length === 0) {
            return NextResponse.json(
                { error: 'Colegio no encontrado' },
                { status: 404 }
            );
        }
        
        const colegio = colegioExiste[0];
        
        // Obtener sorteos activos con estadísticas detalladas
        const [sorteos] = await pool.query(
            `SELECT 
                s.id_sorteo,
                s.nombre as nombre_sorteo,
                s.fecha as fecha_sorteo,
                s.digitos_boleto as digitos,
                s.precio_boleto,
                s.comision_vendedor as porcentaje_comision,
                s.numero_sorteo,
                s.estatus,
                s.created_at,
                s.primero_premio,
                s.segundo_premio,
                
                -- Estadísticas de ventas
                (SELECT COUNT(*) FROM boletos b WHERE b.id_sorteo = s.id_sorteo) as boletos_vendidos,
                (SELECT SUM(b.precio) FROM boletos b WHERE b.id_sorteo = s.id_sorteo) as venta_total,
                
                -- Última venta
                (SELECT MAX(fecha_venta) FROM boletos WHERE id_sorteo = s.id_sorteo) as ultima_venta,
                
                -- Comisiones acumuladas
                (SELECT SUM(comision) FROM cortesdecaja WHERE id_sorteo = s.id_sorteo) as comision_acumulada
                
             FROM sorteo s
             WHERE s.colegio_id = ? AND s.estatus = 'activo'
             ORDER BY s.fecha ASC`,
            [id]
        );
        
        // Calcular estadísticas adicionales
        const sorteosConEstadisticas = sorteos.map(sorteo => {
            // Calcular total de boletos posibles
            const totalBoletosPosibles = Math.pow(10, sorteo.digitos);
            const boletosDisponibles = totalBoletosPosibles - (sorteo.boletos_vendidos || 0);
            
            // Calcular recaudación esperada
            const recaudacionEsperada = totalBoletosPosibles * sorteo.precio_boleto;
            
            // Calcular porcentaje de venta
            const porcentajeVenta = totalBoletosPosibles > 0 
                ? ((sorteo.boletos_vendidos || 0) / totalBoletosPosibles * 100).toFixed(2)
                : 0;
            
            // Calcular comisión esperada total
            const comisionEsperada = recaudacionEsperada * (sorteo.porcentaje_comision / 100);
            
            return {
                ...sorteo,
                boletos_totales: totalBoletosPosibles,
                boletos_disponibles: boletosDisponibles,
                recaudacion_esperada: recaudacionEsperada,
                comision_esperada: comisionEsperada,
                porcentaje_venta: porcentajeVenta,
                comision_actual: sorteo.comision_acumulada || 0
            };
        });
        
        // Calcular totales
        const totalRecaudacionEsperada = sorteosConEstadisticas.reduce((sum, s) => sum + s.recaudacion_esperada, 0);
        const totalRecaudacionActual = sorteosConEstadisticas.reduce((sum, s) => sum + (s.venta_total || 0), 0);
        const totalComisionEsperada = sorteosConEstadisticas.reduce((sum, s) => sum + s.comision_esperada, 0);
        const totalComisionActual = sorteosConEstadisticas.reduce((sum, s) => sum + (s.comision_acumulada || 0), 0);
        const totalBoletosVendidos = sorteosConEstadisticas.reduce((sum, s) => sum + (s.boletos_vendidos || 0), 0);
        const totalBoletosPosibles = sorteosConEstadisticas.reduce((sum, s) => sum + s.boletos_totales, 0);
        
        return NextResponse.json({
            success: true,
            colegio: {
                id: colegio.id_colegio,
                nombre: colegio.nombre
            },
            sorteos: sorteosConEstadisticas,
            total: sorteosConEstadisticas.length,
            resumen: {
                total_sorteos_activos: sorteosConEstadisticas.length,
                total_boletos_vendidos: totalBoletosVendidos,
                total_boletos_posibles: totalBoletosPosibles,
                porcentaje_venta_total: totalBoletosPosibles > 0 
                    ? (totalBoletosVendidos / totalBoletosPosibles * 100).toFixed(2)
                    : 0,
                recaudacion_esperada_total: totalRecaudacionEsperada,
                recaudacion_actual_total: totalRecaudacionActual,
                comision_esperada_total: totalComisionEsperada,
                comision_actual_total: totalComisionActual,
                neto_esperado: totalRecaudacionEsperada - totalComisionEsperada,
                neto_actual: totalRecaudacionActual - totalComisionActual
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo sorteos activos:', error);
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