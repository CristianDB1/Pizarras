import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { id } = params;
        
        // Verificar que el colegio existe
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
        
        // Buscar administrador del colegio
        const [admin] = await pool.query(
            `SELECT 
                id_usuario, 
                nombre, 
                usuario, 
                estatus, 
                created_at,
                rol
             FROM usuarios 
             WHERE colegio_id = ? AND rol = 'admin_colegio'
             LIMIT 1`,
            [id]
        );
        
        if (admin.length === 0) {
            return NextResponse.json({
                success: true,
                admin: null,
                message: 'No se encontró administrador para este colegio'
            });
        }
        
        return NextResponse.json({
            success: true,
            admin: admin[0]
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo administrador:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Error obteniendo administrador',
                admin: null
            },
            { status: 500 }
        );
    }
}