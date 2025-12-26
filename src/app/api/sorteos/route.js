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
      // Ajusta el nombre de la tabla según tu base de datos
      const [sorteos] = await connection.query(
        'SELECT * FROM sorteo WHERE colegio_id = ? ORDER BY fecha DESC',
        [colegioId]
      );
      
      return NextResponse.json(sorteos);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al obtener sorteos:', error);
    return NextResponse.json(
      { error: 'Error al obtener sorteos' },
      { status: 500 }
    );
  }
}