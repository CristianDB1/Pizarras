import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const colegioId = searchParams.get('colegio_id');
        
        let query = `
            SELECT 
                u.id_usuario,
                u.nombre,
                u.usuario,
                u.estatus,
                u.rol,
                u.colegio_id,
                u.created_at,
                c.nombre as colegio_nombre
            FROM usuarios u
            LEFT JOIN colegios c ON u.colegio_id = c.id_colegio
            WHERE u.rol = 'admin_colegio'
        `;
        
        const params = [];
        
        // Filtrar por colegio si se especifica
        if (colegioId) {
            query += ` AND u.colegio_id = ?`;
            params.push(colegioId);
        }
        
        query += ` ORDER BY u.created_at DESC`;
        
        const [admins] = await pool.query(query, params);
        
        // Obtener estadísticas
        const [estadisticas] = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estatus = 'activo' THEN 1 ELSE 0 END) as activos,
                SUM(CASE WHEN estatus != 'activo' THEN 1 ELSE 0 END) as inactivos
            FROM usuarios 
            WHERE rol = 'admin_colegio'
        `);
        
        return NextResponse.json({
            success: true,
            admins: admins,
            estadisticas: estadisticas[0] || { total: 0, activos: 0, inactivos: 0 }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo administradores:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Error obteniendo administradores'
            },
            { status: 500 }
        );
    }
}