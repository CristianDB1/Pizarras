import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');
    
    connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT rln.*, 
               u.nombre as nombre_publicador
        FROM resultados_loteria_nacional rln
        LEFT JOIN usuarios u ON rln.publicado_por = u.id_usuario
      `;
      
      const params = [];
      
      if (estado) {
        query += ' WHERE rln.estado = ?';
        params.push(estado);
      }
      
      query += ' ORDER BY rln.fecha_sorteo_ln DESC, rln.created_at DESC';
      
      const [resultados] = await connection.query(query, params);
      
      return NextResponse.json(resultados);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al obtener resultados lotería nacional:', error);
    return NextResponse.json(
      { error: 'Error al obtener resultados' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo resultado
export async function POST(request) {
  let connection;
  try {
    const body = await request.json();
    const {
      numero_sorteo_ln,
      fecha_sorteo_ln,
      primer_premio_ln,
      segundo_premio_ln,
      estado = 'pendiente',
      publicado_por = null
    } = body;

    // Validaciones básicas
    if (!numero_sorteo_ln || !fecha_sorteo_ln) {
      return NextResponse.json(
        { error: 'Número de sorteo y fecha son requeridos' },
        { status: 400 }
      );
    }

    if (primer_premio_ln && primer_premio_ln.length !== 5) {
      return NextResponse.json(
        { error: 'El primer premio debe tener 5 dígitos' },
        { status: 400 }
      );
    }

    if (segundo_premio_ln && segundo_premio_ln.length !== 5) {
      return NextResponse.json(
        { error: 'El segundo premio debe tener 5 dígitos' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    try {
      const [result] = await connection.query(
        `INSERT INTO resultados_loteria_nacional 
         (numero_sorteo_ln, fecha_sorteo_ln, primer_premio_ln, segundo_premio_ln, estado, publicado_por, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [numero_sorteo_ln, fecha_sorteo_ln, primer_premio_ln, segundo_premio_ln, estado, publicado_por]
      );

      // Obtener el registro recién creado
      const [newRecord] = await connection.query(
        `SELECT rln.*, 
                u.nombre as nombre_publicador
         FROM resultados_loteria_nacional rln
         LEFT JOIN usuarios u ON rln.publicado_por = u.id_usuario
         WHERE rln.id_resultado = ?`,
        [result.insertId]
      );

      return NextResponse.json({
        success: true,
        message: 'Resultado creado exitosamente',
        data: newRecord[0]
      }, { status: 201 });
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    console.error('Error al crear resultado lotería nacional:', error);
    
    // Manejar error de duplicado
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Ya existe un resultado con ese número de sorteo' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear el resultado' },
      { status: 500 }
    );
  }
}