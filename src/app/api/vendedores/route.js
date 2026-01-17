import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const colegioId = searchParams.get('colegioId');

        if (!colegioId) {
            return NextResponse.json({ error: 'colegioId es requerido' }, { status: 400 });
        }

        const connection = await pool.getConnection();
        
        try {
            const [vendedores] = await connection.query(
                `SELECT 
                    id_vendedor,
                    nombre,
                    usuario,
                    domicilio,
                    telefono,
                    comision,
                    estatus,
                    rol,
                    colegio_id,
                    created_at
                FROM vendedores 
                WHERE colegio_id = ? 
                AND estatus = 'activo'
                ORDER BY nombre ASC`,
                [colegioId]
            );
            
            return NextResponse.json(vendedores);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error al obtener vendedores:', error);
        return NextResponse.json(
            { error: 'Error al obtener vendedores' },
            { status: 500 }
        );
    }
}