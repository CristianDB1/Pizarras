import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const colegioId = searchParams.get('colegioId');
        const fechaInicio = searchParams.get('fechaInicio');
        const fechaFin = searchParams.get('fechaFin');
        const vendedorId = searchParams.get('vendedorId');

        if (!colegioId) {
            return NextResponse.json({ error: 'colegioId es requerido' }, { status: 400 });
        }

        const connection = await pool.getConnection();
        
        try {
            // Consulta principal para cortes de caja
            let query = `
                SELECT 
                    cc.*,
                    s.nombre as sorteo_nombre
                FROM cortesdecaja cc
                LEFT JOIN sorteo s ON cc.id_sorteo = s.id_sorteo
                WHERE cc.colegio_id = ?
            `;
            
            const params = [colegioId];
            
            // Agregar filtros
            if (fechaInicio && fechaFin) {
                query += ` AND DATE(cc.fecha_actual) BETWEEN ? AND ?`;
                params.push(fechaInicio.split('T')[0], fechaFin.split('T')[0]);
            }
            
            if (vendedorId) {
                query += ` AND cc.id_vendedor = ?`;
                params.push(vendedorId);
            }
            
            query += ` ORDER BY cc.fecha_actual DESC, cc.id_corte DESC`;
            
            const [cortes] = await connection.query(query, params);
            
            // Obtener deudas pendientes por vendedor
            const [deudas] = await connection.query(`
                SELECT 
                    d.id_vendedor,
                    d.vendedor_nombre,
                    SUM(d.cantidad) as deuda_total
                FROM deuda d
                WHERE d.colegio_id = ?
                AND d.estatus = 'pendiente'
                ${fechaInicio && fechaFin ? 
                    ` AND DATE(d.fecha) BETWEEN ? AND ?` : ''}
                GROUP BY d.id_vendedor
            `, fechaInicio && fechaFin ? 
                [colegioId, fechaInicio.split('T')[0], fechaFin.split('T')[0]] : 
                [colegioId]
            );
            
            // Crear mapa de deudas por vendedor
            const deudasPorVendedor = new Map();
            deudas.forEach(deuda => {
                deudasPorVendedor.set(deuda.id_vendedor, {
                    nombre: deuda.vendedor_nombre,
                    deuda_total: deuda.deuda_total
                });
            });
            
            // Procesar cortes y calcular saldos
            const cortesDetallados = cortes.map(corte => {
                // Calcular saldo pendiente (venta - total_entregado)
                const ventaTotal = corte.venta || 0;
                const totalEntregado = corte.total_entregado || 0;
                const saldoPendiente = ventaTotal - totalEntregado;
                
                // Obtener deuda del vendedor si existe
                const deudaVendedor = deudasPorVendedor.get(corte.id_vendedor);
                
                // Determinar estado del corte
                let estado = 'pendiente';
                if (totalEntregado >= ventaTotal) {
                    estado = 'completado';
                } else if (totalEntregado > 0) {
                    estado = 'parcial';
                }
                
                return {
                    id_corte: corte.id_corte,
                    fecha: corte.fecha_actual,
                    id_vendedor: corte.id_vendedor,
                    vendedor_nombre: corte.nombre_vendedor || corte.nombre_vendedor,
                    id_sorteo: corte.id_sorteo,
                    sorteo_nombre: corte.sorteo_nombre,
                    boletos_vendidos: corte.boletos_vendidos,
                    venta_total: ventaTotal,
                    porcentaje_comision: corte.porcentaje_comision,
                    comision_calculada: corte.comision,
                    total_caja: corte.total_caja,
                    total_entregado: totalEntregado,
                    saldo_pendiente: saldoPendiente,
                    deuda_vendedor: deudaVendedor?.deuda_total || 0,
                    estado: estado,
                    observaciones: `Boletos: ${corte.boletos_vendidos}, Comisión: ${corte.porcentaje_comision}%`
                };
            });
            
            // Obtener vendedores con saldo pendiente
            const vendedoresPorPagar = cortesDetallados
                .filter(corte => corte.saldo_pendiente > 0)
                .map(corte => ({
                    id_vendedor: corte.id_vendedor,
                    nombre: corte.vendedor_nombre,
                    saldo_pendiente: corte.saldo_pendiente,
                    deuda_vendedor: corte.deuda_vendedor,
                    total_adeudo: corte.saldo_pendiente + corte.deuda_vendedor
                }));
            
            // Calcular resumen general
            const resumen = {
                totalCortes: cortesDetallados.length,
                totalVenta: cortesDetallados.reduce((sum, corte) => sum + corte.venta_total, 0),
                totalEntregado: cortesDetallados.reduce((sum, corte) => sum + corte.total_entregado, 0),
                totalPendiente: cortesDetallados.reduce((sum, corte) => sum + corte.saldo_pendiente, 0),
                totalDeuda: deudas.reduce((sum, deuda) => sum + (deuda.deuda_total || 0), 0),
                vendedoresPorPagar: vendedoresPorPagar.length
            };
            
            return NextResponse.json({
                cortes: cortesDetallados,
                vendedoresPorPagar,
                resumen
            });
            
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error al obtener reporte de cortes:', error);
        return NextResponse.json(
            { 
                error: 'Error al generar reporte de cortes de caja',
                details: error.message 
            },
            { status: 500 }
        );
    }
}