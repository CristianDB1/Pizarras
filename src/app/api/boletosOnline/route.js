import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const data = await req.json();
    const { boletos } = data;

    if (!Array.isArray(boletos) || boletos.length === 0) {
      return NextResponse.json({ error: "No se enviaron boletos válidos" }, { status: 400 });
    }

    // Query para insertar varios boletos de una sola vez
    const sql = `
      INSERT INTO boletos_online
      (numero, precio, comprador, idSorteo, tipo_sorteo, fecha, primerPremio, segundoPremio, estado, fecha_ingreso)
      VALUES ?
    `;

    // Construimos los valores a partir del array recibido
    const values = boletos.map((b) => [
      b.numero,
      b.precio,
      b.comprador,
      b.idSorteo,
      b.tipoSorteo,
      b.fecha,
      b.primerPremio,
      b.segundoPremio,
      "pendiente", // estado inicial
      new Date().toISOString().slice(0, 19).replace("T", " ")
    ]);

    const [result] = await pool.query(sql, [values]);

    return NextResponse.json({
      success: true,
      message: "Boletos guardados en boletos_online",
      inserted: result.affectedRows,
    });

  } catch (error) {
    console.error("Error en /api/boletosOnline:", error);
    return NextResponse.json({ error: "Error al guardar boletos online" }, { status: 500 });
  }
}
