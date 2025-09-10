import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const data = await req.json();
    const { boletos } = data;

    if (!Array.isArray(boletos) || boletos.length === 0) {
      return NextResponse.json(
        { error: "No se enviaron boletos válidos" },
        { status: 400 }
      );
    }

    // Query para insertar
    const sqlInsert = `
      INSERT INTO boletos_online
      (numero, precio, comprador, idSorteo, tipo_sorteo, fecha, primerPremio, segundoPremio, estado, fecha_ingreso)
      VALUES ?
    `;

    // Armamos values a partir del array recibido
    const values = boletos.map((b) => [
      b.ticketNumber,  
      b.prizebox,       
      b.name,           
      b.idSorteo,       
      b.tipoSorteo,    
      b.fecha.split("T")[0], 
      b.primerPremio,
      b.segundoPremio,
      "pendiente",      //Siempre va a estar pendiente
      new Date().toISOString().slice(0, 19).replace("T", " ")
    ]);

    const [result] = await pool.query(sqlInsert, [values]);

    // Recuperamos los boletos recién insertados para devolverlos
    const idsInsertados = result.insertId;
    const [boletosGuardados] = await pool.query(
      `SELECT * FROM boletos_online WHERE id >= ? ORDER BY id DESC LIMIT ?`,
      [idsInsertados, boletos.length]
    );

    return NextResponse.json({
      success: true,
      message: "Boletos guardados en boletos_online",
      boletos: boletosGuardados,
    });

  } catch (error) {
    console.error("Error en /api/boletosOnline:", error);
    return NextResponse.json(
      { error: "Error al guardar boletos online", detalle: error.message },
      { status: 500 }
    );
  }
}
