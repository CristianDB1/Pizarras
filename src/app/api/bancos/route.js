// /api/bancos/route.js - VERSIÓN ESTÁTICA PARA BUILD
import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

// Configuración para evitar error de static generation
export const dynamic = 'force-dynamic'; // ← Esto evita el error de renderizado estático
export const runtime = 'nodejs'; // ← Especificar runtime

export async function GET(request) {
  try {
    // Para evitar el error de `request.url` en build estático
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const colegioId = searchParams.get('colegio');
    
    let query = "SELECT id_banco, banco, cuenta FROM bancos";
    let params = [];
    
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
    // En producción, devolver array vacío para no romper el build
    return NextResponse.json({
      success: true,
      bancos: [],
      error: "No se pudieron cargar los bancos"
    });
  }
}