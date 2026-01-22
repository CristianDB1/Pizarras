import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(req, { params }) {
  const { id } = params;

  const [rows] = await pool.query(
    `SELECT id_contacto, valor, activo
     FROM colegio_contactos
     WHERE colegio_id = ? AND tipo = 'whatsapp'
     LIMIT 1`,
    [id]
  );

  return NextResponse.json({
    success: true,
    whatsapp: rows.length
      ? {
          id_contacto: rows[0].id_contacto,
          numero: rows[0].valor,
          activo: rows[0].activo
        }
      : null
  });
}

export async function POST(req, { params }) {
  const { id } = params;
  const { numero, activo = 1 } = await req.json();

  if (!numero) {
    return NextResponse.json(
      { success: false, error: "Número requerido" },
      { status: 400 }
    );
  }

  // Validación lógica (a tu estilo)
  const [colegio] = await pool.query(
    "SELECT id_colegio FROM colegios WHERE id_colegio = ?",
    [id]
  );

  if (!colegio.length) {
    return NextResponse.json(
      { success: false, error: "Colegio no existe" },
      { status: 404 }
    );
  }

  await pool.query(
    `
    INSERT INTO colegio_contactos (colegio_id, tipo, valor, activo)
    VALUES (?, 'whatsapp', ?, ?)
    ON DUPLICATE KEY UPDATE
      valor = VALUES(valor),
      activo = VALUES(activo)
    `,
    [id, numero, activo]
  );

  return NextResponse.json({
    success: true,
    message: "WhatsApp guardado correctamente"
  });
}

