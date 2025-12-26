import { NextResponse } from 'next/server';
import pool from '@/db/MysqlConection';

export async function POST(request) {
  let connection;
  try {
    const { colegio_id, periodo = 'todo' } = await request.json();

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
        fechaCondicion = 'AND DATE(fecha_venta) = CURDATE()';
        break;
      case 'semana':
        fechaCondicion = 'AND fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        break;
      case 'mes':
        fechaCondicion = 'AND fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
        break;
      case 'ano':
        fechaCondicion = 'AND fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)';
        break;
      default: // 'todo'
        fechaCondicion = '';
    }

    // Query para estadísticas generales usando connection.query()
    const sqlEstadisticas = `
      SELECT 
        COUNT(*) as total_boletos,
        COALESCE(SUM(precio), 0) as total_ingresos,
        COALESCE(AVG(precio), 0) as promedio_venta,
        COUNT(DISTINCT id_vendedor) as total_vendedores,
        
        SUM(CASE WHEN DATE(fecha_venta) = CURDATE() THEN 1 ELSE 0 END) as boletos_hoy,
        COALESCE(SUM(CASE WHEN DATE(fecha_venta) = CURDATE() THEN precio ELSE 0 END), 0) as ingresos_hoy,
        
        SUM(CASE WHEN estado_pago = 'pagado' THEN 1 ELSE 0 END) as boletos_pagados,
        SUM(CASE WHEN estado_pago = 'pendiente' THEN 1 ELSE 0 END) as boletos_pendientes
        
      FROM boletos 
      WHERE colegio_id = ?
        ${fechaCondicion}
    `;

    const [estadisticasRows] = await connection.query({
      sql: sqlEstadisticas,
      values: [parseInt(colegio_id)]
    });
    
    const estadisticas = estadisticasRows[0];

    // Contar vendedores activos
    const [vendedoresRows] = await connection.query({
      sql: 'SELECT COUNT(*) as vendedores_activos FROM vendedores WHERE colegio_id = ? AND estatus = "activo"',
      values: [parseInt(colegio_id)]
    });
    
    // Sorteos activos y próximos
    const [sorteosRows] = await connection.query({
      sql: `
        SELECT 
          SUM(CASE WHEN estatus = 'activo' THEN 1 ELSE 0 END) as sorteos_activos,
          SUM(CASE WHEN estatus = 'activo' AND fecha >= CURDATE() THEN 1 ELSE 0 END) as proximos_sorteos,
          MIN(CASE WHEN estatus = 'activo' AND fecha >= CURDATE() THEN fecha ELSE NULL END) as siguiente_sorteo
        FROM sorteo 
        WHERE colegio_id = ?
      `,
      values: [parseInt(colegio_id)]
    });

    // Combinar todos los datos
    const resultado = {
      ...estadisticas,
      vendedores_activos: vendedoresRows[0]?.vendedores_activos || 0,
      sorteos_activos: sorteosRows[0]?.sorteos_activos || 0,
      proximos_sorteos: sorteosRows[0]?.proximos_sorteos || 0,
      siguiente_sorteo: sorteosRows[0]?.siguiente_sorteo || null
    };

    return NextResponse.json(resultado);

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}