// /api/boletosOnline/route.js - VERSIÓN CORREGIDA
import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const colegioId = searchParams.get('colegio');
    const idSorteo = searchParams.get('id_sorteo');
    
    // CONSULTA SIMPLIFICADA sin fecha_sorteo
    let sql = `SELECT * FROM boletos_online WHERE 1=1`;
    let params = [];
    
    if (colegioId) {
      sql += ` AND colegio_id = ?`;
      params.push(colegioId);
    }

    if (idSorteo) {
      sql += ` AND id_sorteo = ?`;
      params.push(idSorteo);
    }
    
    sql += ` ORDER BY numero_boleto ASC`;
    
    const [result] = await pool.query(sql, params);
    
    return NextResponse.json({ 
      success: true,
      boletos: result 
    });
    
  } catch (error) {
    console.error("Error en GET /api/boletosOnline:", error);
    return NextResponse.json(
      { error: "Error al obtener boletos online", detalle: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { boletos, telefono, metodo_pago, colegioId } = data;

    if (!Array.isArray(boletos) || boletos.length === 0) {
      return NextResponse.json(
        { error: "No se enviaron boletos válidos" },
        { status: 400 }
      );
    }

    const primerBoleto = boletos[0];
    const colegioIdABuscar = colegioId || primerBoleto.colegioId;
    
    if (!colegioIdABuscar) {
      return NextResponse.json(
        { error: "Falta el ID del colegio" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // MODIFICADO: Eliminar tipo_sorteo de la inserción
      const sqlInsert = `
        INSERT INTO boletos_online
        (id_sorteo, numero_boleto, costo, comprador, telefono, metodo_pago, 
         estatus, fecha_compra, colegio_id)
        VALUES ?
      `;

      const values = boletos.map((b) => [
        b.idSorteo || b.id_sorteo,                           
        b.ticketNumber || b.numero_boleto,                       
        b.precio || b.costo,          
        b.nombre || b.comprador,            
        telefono || "",                      
        metodo_pago || "",                    
        "pendiente",                          
        new Date().toISOString().slice(0, 19).replace("T", " "),
        parseInt(colegioIdABuscar)
      ]);

      //console.log("📝 Insertando boletos:", values); // Para debug

      const [result] = await connection.query(sqlInsert, [values]);
      await connection.commit();

      // Recuperar boletos insertados
      const idsInsertados = result.insertId;
      const [boletosGuardados] = await connection.query(
        `SELECT * FROM boletos_online WHERE id_boleto_online >= ? ORDER BY id_boleto_online DESC LIMIT ?`,
        [idsInsertados, boletos.length]
      );

      return NextResponse.json({
        success: true,
        message: "Boletos online registrados exitosamente",
        boletos: boletosGuardados,
        colegioId: colegioIdABuscar
      });

    } catch (error) {
      await connection.rollback();
      console.error("❌ Error en transacción:", error);
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("💥 Error en /api/boletosOnline:", error);
    return NextResponse.json(
      { error: "Error al guardar boletos online", detalle: error.message },
      { status: 500 }
    );
  }
}