import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { colegioId } = params;
        
        // Obtener ingresos totales (ejemplo)
        const [ingresos] = await pool.query(
            `SELECT SUM(precio) as total 
             FROM boletos 
             WHERE colegio_id = ? AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)`,
            [colegioId]
        );
        
        // Obtener sorteos activos
        const [sorteosActivos] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM sorteo 
             WHERE colegio_id = ? AND estatus = 'activo'`,
            [colegioId]
        );
        
        // Obtener vendedores activos
        const [vendedores] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM vendedores 
             WHERE colegio_id = ? AND estatus = 'activo'`,
            [colegioId]
        );
        
        // Obtener boletos vendidos este mes
        const [boletos] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM boletos 
             WHERE colegio_id = ? AND MONTH(created_at) = MONTH(CURDATE())`,
            [colegioId]
        );
        
        return NextResponse.json({
            ingresos: ingresos[0]?.total || 0,
            sorteosActivos: sorteosActivos[0]?.count || 0,
            vendedores: vendedores[0]?.count || 0,
            boletosVendidos: boletos[0]?.count || 0
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}