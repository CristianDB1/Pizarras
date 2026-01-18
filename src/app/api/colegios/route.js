import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET() {
    try {
        const [rows] = await pool.query(
            `SELECT id_colegio, nombre, logo_url, estatus, created_at 
             FROM colegios 
             ORDER BY 
                 CASE WHEN estatus = 'activo' THEN 1 ELSE 2 END, 
                 nombre ASC`
        );
        
        return NextResponse.json({
            success: true,
            colegios: rows || [],
            total: rows.length
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo colegios:', error);
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

export async function POST() {
    return NextResponse.json(
        { 
            success: false,
            error: 'Método no permitido' 
        },
        { status: 405 }
    );
}