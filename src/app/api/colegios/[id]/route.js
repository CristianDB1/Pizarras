import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { id } = params;
        
        const [rows] = await pool.query(
            `SELECT id_colegio, nombre, logo_url, configuracion, estatus, created_at 
             FROM colegios 
             WHERE id_colegio = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Colegio no encontrado' },
                { status: 404 }
            );
        }
        
        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error obteniendo colegio:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}