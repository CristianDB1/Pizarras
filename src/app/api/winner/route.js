export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

// GET: Obtener boletos premiados, con opción de filtrar por colegio_id
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegio_id');
    
    let query = `
      SELECT 
        id_ganador,
        folio,
        boleto,
        costo,
        cliente,
        premio,
        fecha_sorteo,
        vendedor,
        fecha_pago,
        ine,
        estatus,
        liquidado,
        colegio_id,
        created_at
      FROM ganadores
    `;
    
    const queryParams = [];
    
    if (colegioId) {
      query += ' WHERE colegio_id = ?';
      queryParams.push(colegioId);
    }
    
    query += ' ORDER BY fecha_sorteo DESC';
    
    const [premiados] = await pool.query(query, queryParams);
    
    if (colegioId && premiados.length === 0) {
      return NextResponse.json({
        premiados: [],
        message: `No hay ganadores registrados para el colegio con ID: ${colegioId}`,
        success: true
      });
    }

    return NextResponse.json({
      premiados,
      success: true,
      filtroAplicado: !!colegioId,
      colegioId: colegioId || null
    });
  } catch (error) {
    console.error("Error al obtener boletos premiados:", error);
    return NextResponse.json({
      error: "Error al obtener boletos premiados: " + error.message,
      success: false
    }, { status: 500 });
  }
}

// PUT: Actualizar estado de boleto premiado a pagado
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ine, user, liquidado } = data;

    const fecha_pago = new Date();

    if (!id) {
      return NextResponse.json({
        error: "Se requiere un ID de boleto premiado",
        success: false
      }, { status: 400 });
    }

    const [boletoExistente] = await pool.query(
      'SELECT * FROM ganadores WHERE id_ganador = ? AND estatus = "pagado"',
      [id]
    );
    
    if (boletoExistente.length > 0) {
      return NextResponse.json({
        error: "El boleto ya está marcado como pagado",
        success: false
      }, { status: 400 });
    }

    const [resultado] = await pool.query(
      `UPDATE ganadores 
       SET estatus = ?, 
           ine = ?, 
           fecha_pago = ?, 
           vendedor = ?,
           liquidado = ?
       WHERE id_ganador = ?`,
      ["pagado", ine, fecha_pago, user?.Nombre || user?.vendedor || '', liquidado || 'no', id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json({
        error: "No se encontró el boleto premiado con el ID proporcionado",
        success: false
      }, { status: 404 });
    }

    const [boletoActualizado] = await pool.query(
      `SELECT 
        id_ganador,
        folio,
        boleto,
        costo,
        cliente,
        premio,
        fecha_sorteo,
        vendedor,
        fecha_pago,
        ine,
        estatus,
        liquidado,
        colegio_id,
        created_at
      FROM ganadores 
      WHERE id_ganador = ?`,
      [id]
    );

    return NextResponse.json({
      message: "Boleto premiado actualizado correctamente",
      success: true,
      boleto: boletoActualizado[0],
      folio: boletoActualizado[0]?.folio
    });
  } catch (error) {
    console.error("Error al actualizar boleto premiado:", error);
    return NextResponse.json({
      error: "Error al actualizar boleto premiado: " + error.message,
      success: false
    }, { status: 500 });
  }
}