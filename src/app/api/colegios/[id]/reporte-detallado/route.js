// app/api/colegios/[id]/reporte-detallado/route.js
import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import { cerrarSorteosVencidos } from "@/lib/cerrarSorteosVencidos";

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
    await cerrarSorteosVencidos();
    try {
        const { id } = params;
        
        // 1. Obtener datos básicos del colegio
        const [colegioData] = await pool.query(
            `SELECT 
                c.id_colegio,
                c.nombre,
                c.logo_url,
                c.created_at,
                c.estatus,
                c.configuracion
             FROM colegios c
             WHERE c.id_colegio = ?`,
            [id]
        );
        
        if (colegioData.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Colegio no encontrado' },
                { status: 404 }
            );
        }
        
        const colegio = colegioData[0];
        
        // 2. Obtener sorteos activos con estadísticas detalladas
        const [sorteosActivos] = await pool.query(
            `SELECT 
                s.id_sorteo,
                s.nombre as nombre_sorteo,
                s.fecha as fecha_sorteo,
                s.digitos_boleto as digitos,
                s.precio_boleto,
                s.comision_vendedor as porcentaje_comision,
                s.numero_sorteo,
                s.estatus as estado_sorteo,
                s.created_at as fecha_creacion_sorteo,
                
                -- Estadísticas de boletos
                (SELECT COUNT(*) FROM boletos b WHERE b.id_sorteo = s.id_sorteo) as boletos_vendidos,
                (SELECT SUM(b.precio) FROM boletos b WHERE b.id_sorteo = s.id_sorteo) as venta_total,
                
                -- Estadísticas de cortes de caja
                (SELECT SUM(cd.comision) FROM cortesdecaja cd WHERE cd.id_sorteo = s.id_sorteo) as comision_acumulada
                
             FROM sorteo s
             WHERE s.colegio_id = ? AND s.estatus = 'activo'
             ORDER BY s.fecha ASC`,
            [id]
        );
        
        // 3. Calcular estadísticas adicionales para cada sorteo
        const sorteosConEstadisticas = [];
        let recaudacionTotalEsperada = 0;
        let recaudacionTotalActual = 0;
        let comisionTotal = 0;
        let boletosTotalesVendidos = 0;
        let totalBoletosPosiblesTodosSorteos = 0;
        
        for (const sorteo of sorteosActivos) {
            // Calcular total de boletos posibles (basado en dígitos)
            const totalBoletosPosibles = Math.pow(10, sorteo.digitos);
            totalBoletosPosiblesTodosSorteos += totalBoletosPosibles;
            
            // Calcular recaudación esperada (potencial)
            const recaudacionEsperada = totalBoletosPosibles * sorteo.precio_boleto;
            
            // Calcular comisión esperada
            const comisionEsperada = recaudacionEsperada * (sorteo.porcentaje_comision / 100);
            
            // Calcular porcentaje de venta
            const porcentajeVenta = totalBoletosPosibles > 0 
                ? (sorteo.boletos_vendidos / totalBoletosPosibles * 100).toFixed(2)
                : 0;
            
            // Agregar al array
            sorteosConEstadisticas.push({
                ...sorteo,
                boletos_totales: totalBoletosPosibles,
                boletos_vendidos: sorteo.boletos_vendidos || 0,
                recaudacion_esperada: recaudacionEsperada,
                recaudacion_actual: sorteo.venta_total || 0,
                comision: sorteo.comision_acumulada || comisionEsperada,
                porcentaje_venta: porcentajeVenta,
                boletos_disponibles: totalBoletosPosibles - (sorteo.boletos_vendidos || 0)
            });
            
            // Sumar a totales
            recaudacionTotalEsperada += recaudacionEsperada;
            recaudacionTotalActual += sorteo.venta_total || 0;
            comisionTotal += sorteo.comision_acumulada || comisionEsperada;
            boletosTotalesVendidos += sorteo.boletos_vendidos || 0;
        }
        
        // 4. Obtener estadísticas generales del colegio
        const [estadisticasGenerales] = await pool.query(
            `SELECT 
                -- Totales de sorteos
                COUNT(*) as total_sorteos,
                SUM(CASE WHEN estatus = 'activo' THEN 1 ELSE 0 END) as sorteos_activos_count,
                SUM(CASE WHEN estatus = 'cerrado' THEN 1 ELSE 0 END) as sorteos_cerrados_count,
                
                -- Totales de boletos
                (SELECT COUNT(*) FROM boletos b 
                 JOIN sorteo s ON b.id_sorteo = s.id_sorteo 
                 WHERE s.colegio_id = ?) as total_boletos_vendidos,
                
                -- Totales de ventas
                (SELECT SUM(b.precio) FROM boletos b 
                 JOIN sorteo s ON b.id_sorteo = s.id_sorteo 
                 WHERE s.colegio_id = ?) as total_ventas,
                
                -- Totales de comisiones
                (SELECT SUM(comision) FROM cortesdecaja 
                 WHERE colegio_id = ?) as total_comisiones
                
             FROM sorteo 
             WHERE colegio_id = ?`,
            [id, id, id, id]
        );
        
        const estadisticas = estadisticasGenerales[0] || {};
        
        // Calcular porcentaje de venta total (corregido)
        const porcentajeVentaTotal = totalBoletosPosiblesTodosSorteos > 0 
            ? (boletosTotalesVendidos / totalBoletosPosiblesTodosSorteos * 100).toFixed(2)
            : 0;
        
        return NextResponse.json({
            success: true,
            colegio: {
                ...colegio,
                sorteos_activos_count: estadisticas.sorteos_activos_count || 0,
                total_sorteos: estadisticas.total_sorteos || 0,
                total_boletos_vendidos: estadisticas.total_boletos_vendidos || 0,
                total_ventas: estadisticas.total_ventas || 0,
                total_comisiones: estadisticas.total_comisiones || 0
            },
            sorteos_activos: sorteosConEstadisticas,
            resumen_financiero: {
                recaudacion_esperada_total: recaudacionTotalEsperada,
                recaudacion_actual_total: recaudacionTotalActual,
                comision_total: comisionTotal,
                neto_esperado: recaudacionTotalEsperada - comisionTotal,
                neto_actual: recaudacionTotalActual - comisionTotal,
                porcentaje_venta_total: porcentajeVentaTotal
            },
            estadisticas_ventas: {
                boletos_vendidos: boletosTotalesVendidos,
                boletos_totales_posibles: totalBoletosPosiblesTodosSorteos,
                porcentaje_venta_total: porcentajeVentaTotal
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo reporte detallado:', error);
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