// app/api/resultados-loteria-nacional/[id]/route.js
import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import { procesarResultadoLN } from "@/lib/loteria/procesarResultadoLN";

export const dynamic = 'force-dynamic';

// GET - Obtener un resultado específico
export async function GET(request, { params }) {
  let connection;
  try {
    const { id } = params;
    
    connection = await pool.getConnection();
    
    try {
      const [resultados] = await connection.query(
        `SELECT rln.*, 
                u.nombre as nombre_publicador
         FROM resultados_loteria_nacional rln
         LEFT JOIN usuarios u ON rln.publicado_por = u.id_usuario
         WHERE rln.id_resultado = ?`,
        [id]
      );
      
      if (resultados.length === 0) {
        return NextResponse.json(
          { error: 'Resultado no encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(resultados[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al obtener resultado:', error);
    return NextResponse.json(
      { error: 'Error al obtener el resultado' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar resultado
export async function PUT(request, { params }) {
  let connection;
  try {
    const { id } = params;
    const body = await request.json();
    const {
      numero_sorteo_ln,
      fecha_sorteo_ln,
      primer_premio_ln,
      segundo_premio_ln,
      estado,
      publicado_por
    } = body;

    connection = await pool.getConnection();
    
    try {
      // Verificar si existe
      const [existing] = await connection.query(
        'SELECT * FROM resultados_loteria_nacional WHERE id_resultado = ?',
        [id]
      );
      
      if (existing.length === 0) {
        return NextResponse.json(
          { error: 'Resultado no encontrado' },
          { status: 404 }
        );
      }

      // Preparar campos para actualizar
      const updateFields = [];
      const updateValues = [];
      
      if (numero_sorteo_ln !== undefined) {
        updateFields.push('numero_sorteo_ln = ?');
        updateValues.push(numero_sorteo_ln);
      }
      
      if (fecha_sorteo_ln !== undefined) {
        updateFields.push('fecha_sorteo_ln = ?');
        updateValues.push(fecha_sorteo_ln);
      }
      
      if (primer_premio_ln !== undefined) {
        updateFields.push('primer_premio_ln = ?');
        updateValues.push(primer_premio_ln);
      }
      
      if (segundo_premio_ln !== undefined) {
        updateFields.push('segundo_premio_ln = ?');
        updateValues.push(segundo_premio_ln);
      }
      
      if (estado !== undefined) {
        updateFields.push('estado = ?');
        updateValues.push(estado);
        
        // Si se publica, actualizar fecha_publicacion y publicado_por
        if (estado === 'publicado') {
          updateFields.push('fecha_publicacion = NOW()');
          try {
            console.log(`[DEBUG] Procesando ganadores para resultado ID: ${id}`);
            await procesarResultadoLN(id);
          } catch (error) {
            console.error('[DEBUG] Error al procesar ganadores:', error);
            await connection.rollback();
            throw error;
          }
          if (publicado_por !== undefined) {
            updateFields.push('publicado_por = ?');
            updateValues.push(publicado_por);
          }
        }
      }
      
      updateFields.push('updated_at = NOW()');
      
      if (updateFields.length === 1) { // Solo updated_at
        return NextResponse.json(
          { error: 'No hay campos para actualizar' },
          { status: 400 }
        );
      }
      
      updateValues.push(id);
      
      const query = `
        UPDATE resultados_loteria_nacional 
        SET ${updateFields.join(', ')} 
        WHERE id_resultado = ?
      `;
      
      await connection.query(query, updateValues);

      if (estado === 'publicado') {
        await procesarResultadoLN(id);
      }
      
      // En la función PUT, actualiza la consulta que obtiene el registro actualizado
        const [updated] = await connection.query(
        `SELECT rln.*, 
                u.nombre as nombre_publicador
        FROM resultados_loteria_nacional rln
        LEFT JOIN usuarios u ON rln.publicado_por = u.id_usuario
        WHERE rln.id_resultado = ?`,
        [id]
        );
      
      return NextResponse.json({
        success: true,
        message: 'Resultado actualizado exitosamente',
        data: updated[0]
      });
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar resultado:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Ya existe un resultado con ese número de sorteo' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al actualizar el resultado' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar resultado
export async function DELETE(request, { params }) {
  let connection;
  try {
    const { id } = params;
    
    connection = await pool.getConnection();
    
    try {
      // Verificar si existe
      const [existing] = await connection.query(
        'SELECT * FROM resultados_loteria_nacional WHERE id_resultado = ?',
        [id]
      );
      
      if (existing.length === 0) {
        return NextResponse.json(
          { error: 'Resultado no encontrado' },
          { status: 404 }
        );
      }

      await connection.query(
        'DELETE FROM resultados_loteria_nacional WHERE id_resultado = ?',
        [id]
      );
      
      return NextResponse.json({
        success: true,
        message: 'Resultado eliminado exitosamente'
      });
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    console.error('Error al eliminar resultado:', error);
    return NextResponse.json(
      { error: 'Error al eliminar el resultado' },
      { status: 500 }
    );
  }
}