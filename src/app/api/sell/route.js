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

  // 🔹 Insertamos primero el boleto sin QR (porque aún no tenemos Idsorteo)
  const sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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

  const sqlTopes = `SELECT * FROM topes WHERE Numero = ? AND Fecha_sorteo = ?`;
  const sqlUpdateTope = `UPDATE topes SET Cantidad = Cantidad + ${prizebox} WHERE Numero = ${ticketNumber}`;
  const sqlValidation = `
    SELECT b.Idsorteo AS idsorteo, b.Fecha AS Fecha_sorteo, b.Boleto AS boleto, s.Tipo_sorteo AS tipo
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    WHERE s.Tipo_sorteo = 'especial' AND b.Fecha = ? AND b.Boleto = ?
  `;
  const sqlSelect = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE b.Idsorteo = ?
  `;

  try {
    // 🧩 Verificar el tope antes de insertar
    const [resultTopes] = await pool.query(sqlTopes, [ticketNumber, fechaModificada]);
    if (resultTopes.length > 0) {
      const tope = resultTopes[0].Tope;
      const cantidadActual = resultTopes[0].Cantidad;
      if (cantidadActual + prizebox > tope) {
        return NextResponse.json({
          error: "La cantidad de boletos vendidos supera el tope permitido",
        });
      }
    }

    // 🧩 Insertar boleto y obtener su Idsorteo generado
    const [insertResult] = await pool.query(sqlInsert, insertValues);
    const nuevoId = insertResult.insertId;

    // 🧩 Generar QR con ese Idsorteo único
    const numeroSerie = `N${nuevoId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // 🧩 Actualizar el boleto con el QR generado
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, nuevoId]
    );

    // 🧩 Actualizar el tope de ventas
    await pool.query(sqlUpdateTope);

    // 🧩 Obtener los datos completos del boleto insertado
    const [resultSelect] = await pool.query(sqlSelect, [nuevoId]);

    // ✅ Devolver el boleto completo con QR
    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("❌ ERROR EN INSERTAR BOLETO:", error, { datos });
    return NextResponse.json({ error: error.message, detalle: error }, { status: 500 });
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
    ticketNumber,
    topePermitido,
  } = datos;

  // 🔹 Usar solo la fecha (YYYY-MM-DD)
  const fechaModificada = fecha.split("T")[0];

  // 🔹 SQL base de inserción sin QR (aún no tenemos el Idsorteo)
  const sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
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

  // 🔹 Consulta para traer últimos boletos del comprador
  const sqlSelect = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE comprador = ?
    ORDER BY b.Idsorteo DESC
    LIMIT 10;
  `;

  try {
    // 🧩 Insertar primero el boleto
    const [insertResult] = await pool.query(sqlInsert, insertValues);
    const nuevoId = insertResult.insertId;

    // 🧩 Generar número de serie basado en el Idsorteo real
    const numeroSerie = `N${nuevoId}`;
    const qrCodeBase64 = await QRCode.toDataURL(numeroSerie);

    // 🧩 Actualizar boleto con su QR y número de serie
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, nuevoId]
    );

    // 🧩 Consultar últimos boletos vendidos por el comprador
    const [resultSelect] = await pool.query(sqlSelect, [name]);

    // ✅ Devolver los boletos más recientes
    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("❌ ERROR EN INSERTAR BOLETO (SERIE):", error, { datos });
    return NextResponse.json({ error: error.message, detalle: error }, { status: 500 });
  }
}



