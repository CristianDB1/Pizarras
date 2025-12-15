// /api/bancos/route.js - VERSIÓN CORREGIDA
import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegio'); // ← Obtener colegio de query params
    
    let query = "SELECT id_banco, banco, cuenta FROM bancos"; // ← minúscula
    let params = [];
    
    // Filtrar por colegio si se proporciona
    if (colegioId) {
      query += " WHERE colegio_id = ?";
      params.push(colegioId);
    }
    
    query += " ORDER BY banco ASC";
    
    const [rows] = await pool.query(query, params);
    
    return NextResponse.json({
      success: true,
      bancos: rows,
      total: rows.length
    });
    
  } catch (error) {
    console.error("Error al obtener bancos:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Error al obtener bancos",
        detalle: error.message 
      },
      { status: 500 }
    );
  }
}
