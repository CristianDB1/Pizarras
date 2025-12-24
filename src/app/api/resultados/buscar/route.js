import { NextResponse } from 'next/server';
import pool from '@/db/MysqlConection';

export async function POST(request) {
  let connection;
  try {
    const { tipo, valor, colegio_id } = await request.json();

    if (!tipo || !valor || !colegio_id) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    let sql = '';
    let values = [];

    if (tipo === 'numero') {
      sql = `
        SELECT 
          s.id_sorteo,
          s.nombre as nombre_sorteo,
          s.fecha,
          s.numero_sorteo,
          s.digitos_boleto,
          s.estatus,
          r.primer_premio_ln,
          r.segundo_premio_ln,
          r.estado as estado_resultado,
          r.fecha_publicacion,
          CASE 
            WHEN r.id_resultado IS NULL THEN 'sin_resultados'
            WHEN r.estado = 'pendiente' THEN 'pendiente'
            ELSE 'publicado'
          END as estado_visual
        FROM sorteo s
        LEFT JOIN resultados_loteria_nacional r 
          ON s.numero_sorteo = r.numero_sorteo_ln
        WHERE s.colegio_id = ?
          AND s.numero_sorteo = ?
        ORDER BY s.fecha DESC
      `;
      values = [parseInt(colegio_id), valor];
    } else {
      sql = `
        SELECT 
          s.id_sorteo,
          s.nombre as nombre_sorteo,
          s.fecha,
          s.numero_sorteo,
          s.digitos_boleto,
          s.estatus,
          r.primer_premio_ln,
          r.segundo_premio_ln,
          r.estado as estado_resultado,
          r.fecha_publicacion,
          CASE 
            WHEN r.id_resultado IS NULL THEN 'sin_resultados'
            WHEN r.estado = 'pendiente' THEN 'pendiente'
            ELSE 'publicado'
          END as estado_visual
        FROM sorteo s
        LEFT JOIN resultados_loteria_nacional r 
          ON s.numero_sorteo = r.numero_sorteo_ln
        WHERE s.colegio_id = ?
          AND DATE(s.fecha) = ?
        ORDER BY s.fecha DESC
      `;
      values = [parseInt(colegio_id), valor];
    }

    const [rows] = await connection.query({ sql, values });

    return NextResponse.json(rows);
    
  } catch (error) {
    console.error('Error en búsqueda de resultados:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}