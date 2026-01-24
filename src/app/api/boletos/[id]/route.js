// app/api/boletos/[id]/route.js
import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegio_id');
    
    let query = 'SELECT id_boleto, boleto, colegio_id FROM boletos WHERE id_boleto = ?';
    const queryParams = [id];
    
    if (colegioId) {
      query += ' AND colegio_id = ?';
      queryParams.push(colegioId);
    }
    
    const [boleto] = await pool.query(query, queryParams);
    
    if (boleto.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Boleto no encontrado'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      boleto: boleto[0]
    });
    
  } catch (error) {
    console.error("Error al buscar boleto:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}