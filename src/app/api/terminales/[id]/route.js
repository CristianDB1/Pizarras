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
    const { 
      NumeroSerie, 
      Modelo, 
      Color, 
      CobroTarjeta, 
      Colegio, 
      Asignado,  
      FechaEntrega, 
      FechaRecoger, 
      Costo, 
      ColegioID 
    } = data;

    console.log('✏️ Editando terminal ID:', id, 'Datos:', data);

    // Validaciones
    if (!NumeroSerie || NumeroSerie.trim() === '') {
      return NextResponse.json({ error: 'El número de serie es requerido' }, { status: 400 });
    }

    if (!Asignado || Asignado.trim() === '') {
      return NextResponse.json({ error: 'El campo "Asignado a" es requerido' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verificar que el terminal existe
      const [existingTerminal] = await connection.query(
        'SELECT Id_terminal FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      if (existingTerminal.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Terminal no encontrado' },
          { status: 404 }
        );
      }

      // Verificar si el nuevo número de serie ya existe (excepto en este terminal)
      const [duplicateSerial] = await connection.query(
        'SELECT Id_terminal FROM Terminales WHERE NumeroSerie = ? AND Id_terminal != ?',
        [NumeroSerie.trim(), id]
      );

      if (duplicateSerial.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Ya existe otro terminal con este número de serie' },
          { status: 400 }
        );
      }

      // Si ColegioID viene vacío, manejarlo como null
      const colegioIdValue = ColegioID && ColegioID.toString().trim() !== '' ? parseInt(ColegioID) : null;

      // Actualizar
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
          NumeroSerie.trim(),
          Modelo?.trim() || '',
          Color?.trim() || '',
          CobroTarjeta || 'NO',
          Colegio?.trim() || '',
          Asignado.trim(), 
          FechaEntrega || null,
          FechaRecoger || null,
          parseFloat(Costo) || 0,
          colegioIdValue,
          id
        ]
      );

      console.log('✅ Terminal actualizado:', result.affectedRows, 'filas afectadas');

      // Obtener el registro actualizado
      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [id]
      );

      await connection.commit();
      return NextResponse.json(rows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error al actualizar terminal:', error);
    return NextResponse.json(
      { error: `Error al actualizar terminal: ${error.message}` },
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