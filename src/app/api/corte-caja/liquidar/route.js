import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const connection = await pool.getConnection();
  
  try {
    const data = await request.json();
    const { 
      id_vendedor,
      nombre_vendedor,
      boletos_vendidos,
      venta,
      porcentaje_comision,
      comision,
      total_caja,
      total_entregado,
      colegio_id,
      id_sorteo
    } = data;

    // Validaciones
    if (!id_vendedor || !colegio_id || !total_entregado || !id_sorteo) {
      return NextResponse.json(
        { error: 'Datos incompletos para la liquidación. Se requiere id_sorteo' },
        { status: 400 }
      );
    }

    // Iniciar transacción
    await connection.beginTransaction();

    try {
      // 1. Registrar el corte en cortesdecaja
      const [result] = await connection.query(
        `INSERT INTO cortesdecaja 
         (fecha_actual, id_vendedor, nombre_vendedor, boletos_vendidos, venta, 
          porcentaje_comision, comision, total_caja, total_entregado, id_sorteo, colegio_id) 
         VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_vendedor,
          nombre_vendedor,
          boletos_vendidos || 0,
          venta || 0,
          porcentaje_comision || 0,
          comision || 0,
          total_caja || 0,
          total_entregado,
          id_sorteo,
          colegio_id
        ]
      );

      const id_corte = result.insertId;

      // 2. Obtener TODOS los boletos pendientes del vendedor para este sorteo
      const [boletosPendientes] = await connection.query(
        `SELECT id_boleto FROM boletos 
         WHERE colegio_id = ? 
           AND id_vendedor = ? 
           AND id_sorteo = ?
           AND estado_pago = 'pendiente'`,
        [colegio_id, id_vendedor, id_sorteo]
      );

      let boletosActualizados = 0;
      
      // 3. Para cada boleto pendiente:
      for (const boleto of boletosPendientes) {
        // 3.1. Registrar en corte_boletos
        await connection.query(
          `INSERT INTO corte_boletos (id_corte, id_boleto) VALUES (?, ?)`,
          [id_corte, boleto.id_boleto]
        );
        
        // 3.2. Marcar boleto como pagado
        await connection.query(
          `UPDATE boletos SET estado_pago = 'pagado' WHERE id_boleto = ?`,
          [boleto.id_boleto]
        );
        
        boletosActualizados++;
      }

      // 4. Confirmar transacción
      await connection.commit();

      return NextResponse.json({
        success: true,
        message: 'Liquidación registrada exitosamente',
        id_corte: id_corte,
        boletos_actualizados: boletosActualizados,
        boletos_registrados_en_corte: boletosPendientes.length,
        total_entregado: total_entregado,
        id_sorteo: id_sorteo
      });

    } catch (error) {
      // Rollback en caso de error
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error al liquidar vendedor:', error);
    
    if (connection) {
      await connection.rollback();
    }
    
    return NextResponse.json(
      { error: 'Error al procesar la liquidación' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}