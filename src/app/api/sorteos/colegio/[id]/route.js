import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { id } = params;
        
        // Validar que el colegio existe
        const [colegioExiste] = await pool.query(
            `SELECT id_colegio FROM colegios WHERE id_colegio = ?`,
            [id]
        );
        
        if (colegioExiste.length === 0) {
            return NextResponse.json(
                { error: 'Colegio no encontrado' },
                { status: 404 }
            );
        }
        
        // Obtener sorteos del colegio (SIN la columna b.estado que no existe)
        const [sorteos] = await pool.query(
            `SELECT 
                s.id_sorteo,
                s.nombre,
                s.fecha,
                s.primer_premio,
                s.segundo_premio,
                s.estatus,
                s.numero_sorteo,
                s.precio_boleto,
                s.comision_vendedor,
                s.digitos_boleto,
                s.created_at,
                c.nombre as nombre_colegio
                /* Removido el JOIN con boletos porque no tenemos esa tabla o columna 'estado' */
             FROM sorteo s
             LEFT JOIN colegios c ON s.colegio_id = c.id_colegio
             WHERE s.colegio_id = ?
             ORDER BY s.fecha DESC`,
            [id]
        );
        
        // Estadísticas (simplificadas)
        const [estadisticas] = await pool.query(
            `SELECT 
                COUNT(*) as total_sorteos,
                SUM(CASE WHEN estatus = 'activo' THEN 1 ELSE 0 END) as sorteos_activos,
                SUM(CASE WHEN estatus = 'cerrado' THEN 1 ELSE 0 END) as sorteos_cerrados
             FROM sorteo 
             WHERE colegio_id = ?`,
            [id]
        );
        
        return NextResponse.json({
            success: true,
            colegio_id: parseInt(id),
            estadisticas: estadisticas[0] || {
                total_sorteos: 0,
                sorteos_activos: 0,
                sorteos_cerrados: 0
            },
            sorteos: sorteos || [],
            total: sorteos.length
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo sorteos del colegio:', error);
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