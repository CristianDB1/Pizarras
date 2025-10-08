import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import QRCode from "qrcode";

async function safeQuery(conn, sql, params = []) {
  // wrapper simple por si necesitas cambiar behavior (logs, etc)
  return conn.query(sql, params);
}

// normal
export async function POST(req) {
  const datos = await req.json();
  const {
    fecha,
    idSorteo, // este es el tipo_sorteo (idsorteo de la tabla sorteo)
    idVendedor,
    name,
    primerPremio,
    prizebox,
    segundoPremio,
    ticketNumber,
    tipoSorteo,
  } = datos;

  const fechaModificada = (fecha && fecha.split ? fecha.split("T")[0] : fecha);

  // Queries
  const sqlTopes = `SELECT * FROM topes WHERE Numero = ? AND Fecha_sorteo = ?`;
  const sqlUpdateTope = `UPDATE topes SET Cantidad = Cantidad + ? WHERE Numero = ? AND Fecha_sorteo = ?`;
  const sqlValidationEspecial = `
    SELECT b.Idsorteo AS idsorteo
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    WHERE s.Tipo_sorteo = 'especial' AND b.Fecha = ? AND b.Boleto = ?
    LIMIT 1
  `;

  // INSERT - CORREGIDO: asegurar que Idsorteo sea autoincrement
  const sqlInsertBase = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  // SELECT - CORREGIDO: usar Idsorteo correctamente
  const sqlSelectById = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE b.Idsorteo = ?
    LIMIT 1
  `;

  const prizeboxNum = Number(prizebox) || 0;
  const ticketNum = ticketNumber;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1️⃣ Verificar tope
    const [topesRows] = await safeQuery(connection, sqlTopes, [ticketNum, fechaModificada]);
    if (topesRows.length > 0) {
      const tope = Number(topesRows[0].Tope) || 0;
      const cantidadActual = Number(topesRows[0].Cantidad) || 0;
      if (cantidadActual + prizeboxNum > tope) {
        await connection.rollback();
        connection.release();
        return NextResponse.json({ error: "La cantidad de boletos vendidos supera el tope permitido" }, { status: 400 });
      }
    }

    // 2️⃣ Normalizar tipo de sorteo
    let tipoSorteoNormalized = tipoSorteo;
    if (!isNaN(tipoSorteo)) {
      const [rows] = await safeQuery(connection, "SELECT Tipo_sorteo FROM sorteo WHERE Idsorteo = ?", [tipoSorteo]);
      if (rows && rows.length > 0) tipoSorteoNormalized = rows[0].Tipo_sorteo;
    }

    // 3️⃣ Validar duplicado (solo especial)
    if (tipoSorteoNormalized === "especial") {
      const [valid] = await safeQuery(connection, sqlValidationEspecial, [fechaModificada, ticketNum]);
      if (valid && valid.length > 0) {
        await connection.rollback();
        connection.release();
        return NextResponse.json({ error: "El boleto ya fue vendido" }, { status: 400 });
      }
    }

    // 4️⃣ Insertar boleto sin QR
    const [insertResult] = await safeQuery(connection, sqlInsertBase, [
      fechaModificada,
      primerPremio,
      segundoPremio,
      ticketNum,
      prizeboxNum,
      name,
      idVendedor,
      idSorteo, // este va a tipo_sorteo
    ]);

    const insertedId = insertResult?.insertId;
    if (!insertedId) {
      await connection.rollback();
      connection.release();
      throw new Error("No se obtuvo insertId al crear el boleto");
    }

    console.log("📝 Boleto insertado con Idsorteo:", insertedId); // DEBUG

    // 🧩 5️⃣ Generar QR basado en el Idsorteo autoincrement
    const numeroSerie = `N${insertedId}`;
    const qrPayload = numeroSerie;
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload);

    console.log("🎯 Generando QR para:", numeroSerie); // DEBUG

    // 🧩 6️⃣ Actualizar el boleto con QR - CORREGIDO
    // Usar WHERE Idsorteo = insertedId (el ID autoincrement de boletos)
    const [updateResult] = await safeQuery(connection, 
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`, 
      [qrCodeBase64, numeroSerie, insertedId]
    );

    console.log("✅ Update result:", updateResult.affectedRows, "filas afectadas"); // DEBUG

    if (updateResult.affectedRows === 0) {
      throw new Error("No se pudo actualizar el QR en la base de datos");
    }

    // 7️⃣ Actualizar tope
    await safeQuery(connection, sqlUpdateTope, [prizeboxNum, ticketNum, fechaModificada]);

    // 8️⃣ Commit
    await connection.commit();

    // 🧩 9️⃣ Traer el boleto completo (ya con QR y leyendas)
    const [resultSelect] = await safeQuery(connection, sqlSelectById, [insertedId]);

    if (!resultSelect || resultSelect.length === 0) {
      throw new Error("No se pudo recuperar el boleto recién insertado");
    }

    console.log("📋 Boleto recuperado:", resultSelect[0].Idsorteo, "QR:", resultSelect[0].qr_code ? "SI" : "NO"); // DEBUG

    connection.release();

    return NextResponse.json([[resultSelect[0]], []]);

  } catch (error) {
    console.error("❌ ERROR EN INSERTAR BOLETO (POST):", error, { datos });
    try { 
      if (connection) { 
        await connection.rollback(); 
        connection.release(); 
      } 
    } catch (e) {
      console.error("Error en rollback:", e);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// serie 
export async function PUT(req) {
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
    topePermitido,
  } = datos;

  const fechaModificada = (fecha && fecha.split ? fecha.split("T")[0] : fecha);

  const sqlInsertBase = `
    INSERT INTO boletos
    (Fecha, Primerpremio, Segundopremio, Boleto, Costo, comprador, Idvendedor, tipo_sorteo, Fecha_venta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;

  const sqlSelectByBuyer = `
    SELECT b.*, c.leyenda1, s.leyenda2
    FROM boletos b
    JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
    CROSS JOIN configuracion c
    WHERE comprador = ?
    ORDER BY b.Idsorteo DESC
    LIMIT 10
  `;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const prizeboxNum = Number(prizebox) || 0;
    const ticketNum = ticketNumber;

    // Insert
    const [insertResult] = await safeQuery(connection, sqlInsertBase, [
      fechaModificada,
      primerPremio,
      segundoPremio,
      ticketNum,
      prizeboxNum,
      name,
      idVendedor,
      idSorteo,
    ]);

    const insertedId = insertResult?.insertId;
    if (!insertedId) {
      await connection.rollback();
      connection.release();
      throw new Error("No se obtuvo insertId al crear el boleto de serie");
    }

    // Generar QR con Idsorteo
    const numeroSerie = `N${insertedId}`;
    const qrPayload = `${numeroSerie}`;
    const qrCodeBase64 = await QRCode.toDataURL(qrPayload);

    // Actualizar qr - CORREGIDO
    const [updateQrResult] = await safeQuery(connection,
      `UPDATE boletos SET qr_code = ?, numero_serie = ? WHERE Idsorteo = ?`,
      [qrCodeBase64, numeroSerie, insertedId]
    );

    if (!updateQrResult || updateQrResult.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      throw new Error("Fallo al actualizar qr del boleto de serie");
    }

    await connection.commit();
    connection.release();

    // Retornar los últimos 10 del comprador
    const [resultSelect] = await pool.query(sqlSelectByBuyer, [name]);
    return NextResponse.json(resultSelect);

  } catch (error) {
    console.error("ERROR EN INSERTAR BOLETO (PUT serie):", error, { datos });
    try { 
      if (connection) { 
        await connection.rollback(); 
        connection.release(); 
      } 
    } catch (e) { /* ignore */ }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}