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
        const sorteoId = searchParams.get('sorteoId');

        if (!colegioId) {
            return NextResponse.json({ error: 'colegioId es requerido' }, { status: 400 });
        }

        const connection = await pool.getConnection();
        
        try {
            // Consulta principal para ventas (boletos)
            let query = `
                SELECT 
                    b.id_boleto,
                    b.boleto as numero_boleto,
                    b.comprador,
                    b.id_vendedor,
                    v.nombre as vendedor_nombre,
                    b.id_sorteo,
                    s.nombre as sorteo_nombre,
                    DATE(b.fecha_venta) as fecha,
                    b.fecha_venta,
                    b.estado_pago,
                    b.precio as monto,
                    b.colegio_id,
                    b.created_at
                FROM boletos b
                LEFT JOIN vendedores v ON b.id_vendedor = v.id_vendedor
                LEFT JOIN sorteo s ON b.id_sorteo = s.id_sorteo
                WHERE b.colegio_id = ?
            `;
            
            const params = [colegioId];
            
            // Agregar filtros
            if (fechaInicio && fechaFin) {
                query += ` AND DATE(b.fecha_venta) BETWEEN ? AND ?`;
                params.push(fechaInicio.split('T')[0], fechaFin.split('T')[0]);
            }
            
            if (vendedorId) {
                query += ` AND b.id_vendedor = ?`;
                params.push(vendedorId);
            }
            
            if (sorteoId) {
                query += ` AND b.id_sorteo = ?`;
                params.push(sorteoId);
            }
            
            query += ` ORDER BY b.fecha_venta DESC, b.id_boleto DESC`;
            
            const [ventas] = await connection.query(query, params);
            
            // Calcular resumen estadístico
            let totalVentas = 0;
            let totalPagado = 0;
            let totalPorPagar = 0;
            const vendedoresMap = new Map(); // Para contar vendedores únicos con pendientes
            
            ventas.forEach(venta => {
                const monto = venta.monto || 0;
                totalVentas += monto;
                
                if (venta.estado_pago === 'pagado') {
                    totalPagado += monto;
                } else {
                    totalPorPagar += monto;
                    // Agregar vendedor a la lista de pendientes
                    if (venta.id_vendedor) {
                        vendedoresMap.set(venta.id_vendedor, true);
                    }
                }
            });
            
            // Consulta adicional para obtener deudas pendientes
            let deudaPendiente = 0;
            try {
                const [deudas] = await connection.query(`
                    SELECT SUM(cantidad) as total_deuda 
                    FROM deuda 
                    WHERE colegio_id = ? 
                    AND estatus = 'pendiente'
                    ${fechaInicio && fechaFin ? 
                        ` AND DATE(fecha) BETWEEN ? AND ?` : ''}
                `, fechaInicio && fechaFin ? 
                    [colegioId, fechaInicio.split('T')[0], fechaFin.split('T')[0]] : 
                    [colegioId]
                );
                
                if (deudas[0] && deudas[0].total_deuda) {
                    deudaPendiente = parseFloat(deudas[0].total_deuda);
                }
            } catch (error) {
                console.log('No se pudo obtener deuda pendiente:', error.message);
            }
            
            return NextResponse.json({
                ventas: ventas.map(v => ({
                    id: v.id_boleto,
                    fecha: v.fecha,
                    fecha_completa: v.fecha_venta,
                    vendedor_id: v.id_vendedor,
                    vendedor_nombre: v.vendedor_nombre,
                    sorteo_id: v.id_sorteo,
                    sorteo_nombre: v.sorteo_nombre,
                    numero: v.numero_boleto,
                    comprador: v.comprador,
                    monto: v.monto,
                    estado: v.estado_pago,
                    colegio_id: v.colegio_id,
                    created_at: v.created_at
                })),
                resumen: {
                    totalVentas,
                    totalPagado,
                    totalPorPagar,
                    deudaPendiente,
                    vendedoresPorPagar: vendedoresMap.size,
                    totalRegistros: ventas.length
                }
            });
            
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error al obtener reporte de ventas:', error);
        return NextResponse.json(
            { 
                error: 'Error al generar reporte de ventas',
                details: error.message 
            },
            { status: 500 }
        );
    }
}