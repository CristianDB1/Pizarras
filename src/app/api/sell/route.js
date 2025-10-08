import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import QRCode from "qrcode";

//normal
export async function POST(req) {
  const datos = await req.json();
  const {
    fecha,
    idSorteo,
    idVendedor,
    name,
    primerPremio,
    prizebox,
    segundoPremio,
    ticketNumber,
    tipoSorteo,
  } = datos;

  const fechaModificada = fecha.split("T")[0];

  const sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const sqlSelectById = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE b.Idsorteo = ?
    LIMIT 1;
  `;

  try {
    // 1️⃣ Insertar boleto
    const [insertResult] = await pool.execute(sqlInsert, [
      fechaModificada,
      primerPremio,
      segundoPremio,
      ticketNumber,
      prizebox,
      name,
      idVendedor,
      idSorteo,
    ]);

    const insertedId = insertResult.insertId;

    if (!insertedId) throw new Error("No se pudo obtener el ID del boleto insertado");

    // 2️⃣ Generar el número de serie basado en el ID real del boleto
    const numeroSerie = `N${insertedId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // 3️⃣ Actualizar el boleto con el QR
    const [updateResult] = await pool.execute(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    if (updateResult.affectedRows === 0)
      throw new Error("No se pudo actualizar el QR en el boleto");

    // 4️⃣ Seleccionar el boleto recién insertado por su Idsorteo
    const [resultSelect] = await pool.query(sqlSelectById, [insertedId]);

    if (!resultSelect || resultSelect.length === 0)
      throw new Error("No se pudo obtener la información del boleto recién insertado");

    console.log("✅ Boleto completo listo para el PDF:", resultSelect[0]);

    // 5️⃣ Retornar el boleto correcto al frontend
    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("🔥 ERROR AL INSERTAR BOLETO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

//serie
export async function PUT(req) {
  let datos = await req.json();
  const {
    fecha,
    idSorteo,
    idVendedor,
    name,
    primerPremio,
    prizebox,
    segundoPremio,
    ticketNumber,
  } = datos;

  const fechaModificada = fecha.split("T")[0];

  const sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const sqlSelect = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE comprador = ?
    ORDER BY b.Idsorteo DESC
    LIMIT 10;
  `;

  const insertValues = [
    fechaModificada,
    primerPremio,
    segundoPremio,
    ticketNumber,
    prizebox,
    name,
    idVendedor,
    idSorteo,
  ];

  try {
    // Insertar boleto en serie
    const [insertResult] = await pool.query(sqlInsert, insertValues);
    const insertedId = insertResult?.insertId;

    if (!insertedId) throw new Error("No se pudo obtener el ID del boleto insertado (serie)");

    // Generar QR
    const numeroSerie = `N${insertedId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // Actualizar QR en el registro
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    // Traer últimos boletos del comprador
    const [resultSelect] = await pool.query(sqlSelect, [name]);

    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("❌ ERROR EN INSERTAR BOLETO SERIE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



