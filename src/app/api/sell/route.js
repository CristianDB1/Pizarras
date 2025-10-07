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

  // Asegurar formato de fecha (YYYY-MM-DD)
  const fechaModificada = fecha.split("T")[0];

  // Consulta base de inserción
  const sqlInsert = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  // Otras consultas utilizadas
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
    WHERE b.Boleto = ?
    ORDER BY b.Idsorteo DESC
    LIMIT 1;
  `;
  const sqlSelectEspecial = `
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
    // 1️⃣ Verificar el tope
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

    // 2️⃣ Normalizar tipo de sorteo
    let tipoSorteoNormalized = tipoSorteo;
    if (!isNaN(tipoSorteo)) {
      const [rows] = await pool.query('SELECT Tipo_sorteo FROM sorteo WHERE Idsorteo = ?', [tipoSorteo]);
      if (rows.length > 0) tipoSorteoNormalized = rows[0].Tipo_sorteo;
    }

    // 3️⃣ Validar sorteo especial (no duplicar boletos)
    if (tipoSorteoNormalized === "especial") {
      const [resultValidation] = await pool.query(sqlValidation, [fechaModificada, ticketNumber]);
      if (resultValidation.length > 0) {
        return NextResponse.json({ error: "El boleto ya fue vendido" });
      }
    }

    // 4️⃣ Insertar boleto y obtener su ID real
    const [insertResult] = await pool.query(sqlInsert, insertValues);
    const insertedId = insertResult.insertId; // Este es el identificador real del boleto

    // 5️⃣ Generar QR con el ID del boleto (N + id autoincremental)
    const numeroSerie = `N${insertedId}`;
    const qrData = `${numeroSerie}`;
    const qrCodeBase64 = await QRCode.toDataURL(qrData);

    // 6️⃣ Actualizar el registro con el QR
    await pool.query(
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    // 7️⃣ Actualizar topes
    await pool.query(sqlUpdateTope);

    // 8️⃣ Obtener información del boleto recién insertado
    let resultSelect;
    if (tipoSorteoNormalized === "especial") {
      [resultSelect] = await pool.query(sqlSelectEspecial, [ticketNumber]);
    } else {
      [resultSelect] = await pool.query(sqlSelect, [ticketNumber]);
    }

    // 9️⃣ Devolver respuesta final
    return NextResponse.json(resultSelect);
    
  } catch (error) {
    console.error("ERROR EN INSERTAR BOLETO:", error, { datos, insertValues });
    return NextResponse.json(
      { error: error.message, detalle: error, datos, insertValues },
      { status: 500 }
    );
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
  // Usar solo la fecha (YYYY-MM-DD) para el campo Fecha
  const fechaModificada = fecha.split("T")[0];
  let sql = `
        INSERT INTO boletos
        (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta, qr_code)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `;

  const numeroSerie = `N${idSorteo}`;
  const qrData = `${numeroSerie}-${ticketNumber}-${fechaModificada}`;
  const qrCodeBase64 = await QRCode.toDataURL(qrData); 

  // Obtener los últimos 10 elementos insertados
  let sqlSelect = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE comprador = ?
    ORDER BY b.Idsorteo DESC
    LIMIT 10;
  `;
  let values = [
    fechaModificada,
    primerPremio,
    segundoPremio,
    ticketNumber,
    prizebox,
    name,
    idVendedor,
    idSorteo,
    qrCodeBase64,
  ];

  try {
    const [result] = await pool.query(sql, values);
    const [resultSelect] = await pool.query(sqlSelect, [name]);
    return NextResponse.json(resultSelect);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
