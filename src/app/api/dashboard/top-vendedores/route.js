import { NextResponse } from 'next/server';
import pool from '@/db/MysqlConection';

export async function POST(request) {
  let connection;
  try {
    const { colegio_id, limite = 10, periodo = 'todo' } = await request.json();

    if (!colegio_id) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // Determinar fecha límite según período
    let fechaCondicion = '';
    switch(periodo) {
      case 'hoy':
        fechaCondicion = 'AND DATE(b.fecha_venta) = CURDATE()';
        break;
      case 'semana':
        fechaCondicion = 'AND b.fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        break;
      case 'mes':
        fechaCondicion = 'AND b.fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        break;
      case 'ano':
        fechaCondicion = 'AND b.fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
        break;
      default: // 'todo'
        fechaCondicion = '';
    }

    // Query para top vendedores usando connection.query()
    const sql = `
      SELECT 
        v.id_vendedor,
        v.nombre,
        v.usuario,
        v.telefono,
        v.comision,
        v.estatus,
        v.fecha_ingreso,
        COUNT(b.id_boleto) as total_boletos,
        COALESCE(SUM(b.precio), 0) as total_ventas,
        COALESCE(SUM(b.precio) * v.comision / 100, 0) as comision_total
      FROM vendedores v
      LEFT JOIN boletos b ON v.id_vendedor = b.id_vendedor 
        AND b.colegio_id = ?
        ${fechaCondicion}
      WHERE v.colegio_id = ?
        AND v.estatus = 'activo'
      GROUP BY v.id_vendedor
      ORDER BY total_boletos DESC, total_ventas DESC
      LIMIT ?
    `;

    const [vendedoresRows] = await connection.query({
      sql: sql,
      values: [parseInt(colegio_id), parseInt(colegio_id), parseInt(limite)]
    });

    return NextResponse.json(vendedoresRows);

  } catch (error) {
    console.error('Error obteniendo top vendedores:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}