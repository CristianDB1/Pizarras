import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET() {
    try {
        
        const [rows] = await pool.query(
            `SELECT id_colegio, nombre, logo_url, estatus, created_at 
             FROM colegios 
             WHERE estatus = 'activo'
             ORDER BY nombre`
        );
        
        
        const response = NextResponse.json(rows);
        
        // Agregar headers de cache para evitar múltiples llamadas
        response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
        
        return response;
    } catch (error) {
        console.error('❌ Error obteniendo colegios:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

// Si quieres prevenir métodos no permitidos
export async function POST() {
    return NextResponse.json(
        { error: 'Método no permitido' },
        { status: 405 }
    );
}