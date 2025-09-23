import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const data = await req.json();
    const { boletos, telefono, metodo_pago } = data;

    if (!Array.isArray(boletos) || boletos.length === 0) {
      return NextResponse.json(
        { error: "No se enviaron boletos válidos" },
        { status: 400 }
      );
    }

    // Query para insertar en boletos_online
    const sqlInsert = `
      INSERT INTO boletos_online
      (id_sorteo, numero_boleto, costo, comprador, telefono, metodo_pago, tipo_sorteo, fecha_sorteo, estatus, fecha_compra)
      VALUES ?
    `;

    // Armamos values a partir del array recibido
    const values = boletos.map((b) => [
      b.idSorteo,                           
      b.ticketNumber,                       
      b.prizebox,                          
      b.name,                             
      telefono || "",                      
      metodo_pago || "",                    
      b.tipoSorteo,                         
      b.fecha.split("T")[0],                
      "pendiente",                          
      new Date().toISOString().slice(0, 19).replace("T", " ") // fecha_compra
    ]);

    const [result] = await pool.query(sqlInsert, [values]);

    // Recuperamos los boletos recién insertados
    const idsInsertados = result.insertId;
    const [boletosGuardados] = await pool.query(
      `SELECT * FROM boletos_online WHERE id_boleto_online >= ? ORDER BY id_boleto_online DESC LIMIT ?`,
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
