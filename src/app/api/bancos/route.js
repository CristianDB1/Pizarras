// /api/bancos/route.js - VERSIÓN ESTÁTICA PARA BUILD
import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

// Configuración para evitar error de static generation
export const dynamic = 'force-dynamic'; // ← Esto evita el error de renderizado estático
export const runtime = 'nodejs'; // ← Especificar runtime

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const colegioId = url.searchParams.get('colegio');

    if (!colegioId) {
      return NextResponse.json(
        {
          success: false,
          message: "El colegio_id es obligatorio para listar bancos"
        },
        { status: 400 }
      );
    }

    const query = `
      SELECT id_banco, banco, cuenta
      FROM bancos
      WHERE colegio_id = ?
      ORDER BY banco ASC
    `;

    const [rows] = await pool.query(query, [colegioId]);

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
        message: "Error al cargar bancos"
      },
      { status: 500 }
    );
  }
}