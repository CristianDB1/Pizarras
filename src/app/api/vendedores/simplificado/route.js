import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegioId');

    if (!colegioId) {
      return NextResponse.json({ error: 'colegioId es requerido' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      // Asumiendo que tienes una tabla Vendedores
      // Ajusta la consulta según tu estructura real
      const [rows] = await connection.query(
        `SELECT 
          id, 
          nombre, 
          email, 
          telefono 
         FROM Vendedores 
         WHERE colegio_id = ? AND estado = 'ACTIVO' 
         ORDER BY nombre ASC`,
        [colegioId]
      );
      
      return NextResponse.json(rows);
    } catch (error) {
      console.error('Error al obtener vendedores:', error);
      // Si la tabla no existe, retornar array vacío
      return NextResponse.json([]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error general:', error);
    return NextResponse.json(
      { error: 'Error al obtener vendedores' },
      { status: 500 }
    );
  }
}