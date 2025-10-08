import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import QRCode from "qrcode";

//normal
export async function POST(req) {
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
    tipoSorteo,
  } = datos;

  const fechaModificada = fecha.split("T")[0];

  const sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const sqlTopes = `SELECT * FROM topes WHERE Numero = ? AND Fecha_sorteo = ?`;
  const sqlUpdateTope = `UPDATE topes SET Cantidad = Cantidad + ${prizebox} WHERE Numero = ${ticketNumber}`;
  const sqlSelect = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE b.Boleto = ?
    ORDER BY b.Idsorteo DESC
    LIMIT 1;
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
    // 🔸 Verificar tope
    const [resultTopes] = await pool.query(sqlTopes, [ticketNumber, fechaModificada]);
    if (resultTopes.length > 0) {
      const { Tope, Cantidad } = resultTopes[0];
      if (Cantidad + prizebox > Tope) {
        return NextResponse.json({ error: "La cantidad de boletos vendidos supera el tope permitido" });
      }
    }

    // 🔸 Insertar boleto
    const [insertResult] = await pool.query(sqlInsert, insertValues);
    const insertedId = insertResult?.insertId;

    if (!insertedId) throw new Error("No se pudo obtener el ID del boleto insertado");

    // 🔸 Generar QR usando el Idsorteo real
    const numeroSerie = `N${insertedId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // 🔸 Actualizar boleto con QR
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    // 🔸 Actualizar tope
    await pool.query(sqlUpdateTope);

    // 🔸 Seleccionar boleto actualizado
    const [resultSelect] = await pool.query(sqlSelect, [ticketNumber]);

    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("❌ ERROR EN INSERTAR BOLETO NORMAL:", error);
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
    // 🔸 Insertar boleto en serie
    const [insertResult] = await pool.query(sqlInsert, insertValues);
    const insertedId = insertResult?.insertId;

    if (!insertedId) throw new Error("No se pudo obtener el ID del boleto insertado (serie)");

    // 🔸 Generar QR
    const numeroSerie = `N${insertedId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // 🔸 Actualizar QR en el registro
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    // 🔸 Traer últimos boletos del comprador
    const [resultSelect] = await pool.query(sqlSelect, [name]);

    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("❌ ERROR EN INSERTAR BOLETO SERIE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



