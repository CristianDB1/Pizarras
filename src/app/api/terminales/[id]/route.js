import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
  try {
    const { id } = params;

    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Terminal no encontrado' }, { status: 404 });
      }

      return NextResponse.json(rows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al obtener terminal:', error);
    return NextResponse.json(
      { error: 'Error al obtener terminal' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    const connection = await pool.getConnection();
    
    try {
      // Verificar si el terminal existe
      const [existing] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Terminal no encontrado' }, { status: 404 });
      }

      // Actualizar el terminal
      const [result] = await connection.query(
        `UPDATE Terminales SET 
          NumeroSerie = ?, 
          Modelo = ?, 
          Color = ?, 
          CobroTarjeta = ?, 
          Colegio = ?, 
          Asignado = ?, 
          FechaEntrega = ?, 
          FechaRecoger = ?, 
          Costo = ?, 
          ColegioID = ?
         WHERE Id_terminal = ?`,
        [
          data.NumeroSerie?.trim() || '',
          data.Modelo?.trim() || '',
          data.Color?.trim() || '',
          data.CobroTarjeta || 'NO',
          data.Colegio?.trim() || '',
          data.Asignado?.trim() || '',
          data.FechaEntrega || null,
          data.FechaRecoger || null,
          data.Costo || 0,
          data.ColegioID,
          id
        ]
      );

      // Obtener el registro actualizado
      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      return NextResponse.json(rows[0]);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar terminal:', error);
    
    // Manejar errores de duplicación
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Ya existe un terminal con este número de serie' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al actualizar terminal' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const connection = await pool.getConnection();
    
    try {
      // Verificar si el terminal existe
      const [existing] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Terminal no encontrado' }, { status: 404 });
      }

      // Eliminar el terminal
      await connection.query(
        'DELETE FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      return NextResponse.json({ 
        message: 'Terminal eliminado correctamente',
        deletedId: id 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al eliminar terminal:', error);
    return NextResponse.json(
      { error: 'Error al eliminar terminal' },
      { status: 500 }
    );
  }
}