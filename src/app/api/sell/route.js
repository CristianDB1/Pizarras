import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import QRCode from "qrcode";

//normal
export async function POST(req, res) {
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

  let sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  let sqlTopes = `SELECT * FROM topes WHERE Numero = ? AND Fecha_sorteo = ?`;
  let sqlUpdateTope = `UPDATE topes SET Cantidad = Cantidad + ${prizebox} WHERE Numero = ${ticketNumber}`;
  let sqlValidation = `
    SELECT b.Idsorteo AS idsorteo, b.Fecha AS Fecha_sorteo , b.Boleto AS boleto, s.Tipo_sorteo AS tipo
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    WHERE s.Tipo_sorteo = 'especial' AND b.Fecha = ? AND b.Boleto = ?
  `;
  let sqlSelect = `
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
    // Verificar el tope
    let [resultTopes] = await pool.query(sqlTopes, [ticketNumber, fechaModificada]);
    if (resultTopes.length > 0) {
      let tope = resultTopes[0].Tope;
      let cantidadActual = resultTopes[0].Cantidad;
      if (cantidadActual + prizebox > tope) {
        return NextResponse.json({
          error: "La cantidad de boletos vendidos supera el tope permitido",
        });
      }
    }

    // Normalizar tipoSorteo
    let tipoSorteoNormalized = tipoSorteo;
    if (!isNaN(tipoSorteo)) {
      const [rows] = await pool.query('SELECT Tipo_sorteo FROM sorteo WHERE Idsorteo = ?', [tipoSorteo]);
      if (rows.length > 0) tipoSorteoNormalized = rows[0].Tipo_sorteo;
    }

    // Validación para especial
    if (tipoSorteoNormalized == "especial") {
      let [resultValidation] = await pool.query(sqlValidation, [fechaModificada, ticketNumber]);
      if (resultValidation.length > 0) {
        return NextResponse.json({ error: "El boleto ya fue vendido" });
      }
    }

    // Insertar boleto y obtener insertId
    const [insertResult] = await pool.query(sqlInsert, insertValues);
    const insertedId = insertResult.insertId;

    // Generar QR con el Idsorteo autoincrement (numero de serie)
    const numeroSerie = `N${insertedId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // Actualizar el registro con el QR y numeroSerie
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    // Esperamos a que el UPDATE se complete antes de continuar
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms es más que suficiente

    // Actualizar tope
    await pool.query(sqlUpdateTope);

    // Recuperar y retornar el boleto insertado correctamente
    const [resultSelect] = await pool.query(
      `
      SELECT b.*, c.leyenda1, s.leyenda2
      FROM boletos b
      JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
      CROSS JOIN configuracion c
      WHERE b.Idsorteo = ?
      LIMIT 1;
      `,
      [insertedId]
    );

    return NextResponse.json(resultSelect);


  } catch (error) {
    console.error("ERROR EN INSERTAR BOLETO:", error, { datos, insertValues });
    return NextResponse.json({ error: error.message, detalle: error, datos, insertValues }, { status: 500 });
  }
}

//serie
export async function PUT(req, res) {
  let datos = await req.json();
  const {
    fecha,
    idSorteo,
    idVendedor,
    name,
    primerPremio,
    prizebox,
    segundoPremio,
    ticketNumber
  } = datos;

  // Usar solo la fecha (YYYY-MM-DD)
  const fechaModificada = fecha.split("T")[0];

  // Inserción base (sin QR todavía)
  const sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  // Seleccionar boletos del comprador
  const sqlSelect = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE comprador = ?
    ORDER BY b.Idsorteo DESC
    LIMIT 10;
  `;

  const values = [
    fechaModificada,
    primerPremio,
    segundoPremio,
    ticketNumber,
    prizebox,
    name,
    idVendedor,
    idSorteo
  ];

  try {
    // Insertar el boleto
    const [insertResult] = await pool.query(sqlInsert, values);
    const insertedId = insertResult.insertId;

    // Generar el número de serie y QR
    const numeroSerie = `N${insertedId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // Actualizar el registro con el QR y número de serie
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    //  Esperamos un pequeño tiempo para garantizar la escritura
    await new Promise(resolve => setTimeout(resolve, 100));

    // Consultar los últimos boletos del comprador (ya con QR)
    const [resultSelect] = await pool.query(sqlSelect, [name]);

    // Retornar los boletos actualizados
    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("ERROR EN INSERTAR BOLETO SERIE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


