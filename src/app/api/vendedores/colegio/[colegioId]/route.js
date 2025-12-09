import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { colegioId } = params;
        
        const [rows] = await pool.query(
            `SELECT 
                v.id_vendedor as id,
                v.nombre,
                v.usuario,
                v.estatus,
                v.rol,
                COUNT(b.id_boleto) as boletos_vendidos,
                COALESCE(SUM(b.precio), 0) as total_ventas
             FROM vendedores v
             LEFT JOIN boletos b ON v.id_vendedor = b.id_vendedor 
                AND b.colegio_id = v.colegio_id
                AND MONTH(b.created_at) = MONTH(CURDATE())
             WHERE v.colegio_id = ? 
                AND v.estatus = 'activo'
             GROUP BY v.id_vendedor
             ORDER BY total_ventas DESC`,
            [colegioId]
        );
        
        // Formatear datos para el dashboard
        const formattedData = rows.map(vendedor => ({
            id: vendedor.id,
            nombre: vendedor.nombre,
            boletos: vendedor.boletos_vendidos || 0,
            ventas: vendedor.total_ventas || 0,
            comision: (vendedor.total_ventas || 0) * 0.1, // 10% de comisión (ajusta según tu tabla)
            estado: vendedor.estatus,
            iniciales: vendedor.nombre?.substring(0, 2).toUpperCase() || 'NN'
        }));
        
        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('Error obteniendo vendedores:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}