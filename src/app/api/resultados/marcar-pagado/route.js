import { NextResponse } from 'next/server';
import pool from '@/db/MysqlConection';

export async function POST(request) {
  let connection;
  try {
    const { id_boleto, id_sorteo, colegio_id } = await request.json();

    if (!id_boleto || !id_sorteo || !colegio_id) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 1. Verificar que el boleto existe
    const sqlVerificar = `
      SELECT id_boleto, estado_pago 
      FROM boletos 
      WHERE id_boleto = ? 
        AND id_sorteo = ? 
        AND colegio_id = ?
    `;
    
    const [boletoRows] = await connection.query({ 
      sql: sqlVerificar, 
      values: [parseInt(id_boleto), parseInt(id_sorteo), parseInt(colegio_id)] 
    });
    
    const boleto = boletoRows[0];

    if (!boleto) {
      return NextResponse.json(
        { error: 'Boleto no encontrado o no pertenece al sorteo' },
        { status: 404 }
      );
    }

    if (boleto.estado_pago === 'pagado') {
      return NextResponse.json(
        { error: 'El boleto ya está marcado como pagado' },
        { status: 400 }
      );
    }

    // 2. Actualizar estado a pagado
    await connection.query({
      sql: `UPDATE boletos SET estado_pago = 'pagado', updated_at = CURRENT_TIMESTAMP() WHERE id_boleto = ?`,
      values: [parseInt(id_boleto)]
    });

    // 3. Obtener boleto actualizado
    const [boletoActualizadoRows] = await connection.query({
      sql: `
        SELECT 
          b.*,
          v.nombre as vendedor_nombre
        FROM boletos b
        LEFT JOIN vendedores v ON b.id_vendedor = v.id_vendedor
        WHERE b.id_boleto = ?
      `,
      values: [parseInt(id_boleto)]
    });
    
    const boletoActualizado = boletoActualizadoRows[0];

    return NextResponse.json({
      success: true,
      message: 'Boleto marcado como pagado exitosamente',
      boleto: boletoActualizado
    });

  } catch (error) {
    console.error('Error marcando boleto como pagado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}