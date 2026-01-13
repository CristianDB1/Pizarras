import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegioId');
    const asignados = searchParams.get('asignados'); // Nuevo parámetro

    const connection = await pool.getConnection();
    
    try {
      let query = 'SELECT * FROM Terminales';
      let params = [];
      
      if (colegioId) {
        query += ' WHERE ColegioID = ?';
        params.push(colegioId);
      } else if (asignados === 'false' || asignados === 'no') {
        // Obtener terminales sin asignar
        query += ' WHERE ColegioID IS NULL OR ColegioID = ""';
      }
      
      query += ' ORDER BY Id_terminal DESC';
      
      const [rows] = await connection.query(query, params);
      return NextResponse.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al obtener terminales:', error);
    return NextResponse.json(
      { error: 'Error al obtener terminales' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
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

    // Validaciones
    if (!NumeroSerie || NumeroSerie.trim() === '') {
      return NextResponse.json({ error: 'El número de serie es requerido' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Verificar si el número de serie ya existe
      const [existingTerminal] = await connection.query(
        'SELECT Id_terminal FROM Terminales WHERE NumeroSerie = ?',
        [NumeroSerie.trim()]
      );

      if (existingTerminal.length > 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Ya existe un terminal con este número de serie' },
          { status: 400 }
        );
      }

      // 2. Si ColegioID viene vacío, manejarlo como null
      const colegioIdValue = ColegioID && ColegioID.toString().trim() !== '' ? parseInt(ColegioID) : null;
      const asignadoValue = colegioIdValue ? (Asignado?.trim() || 'Sí') : 'No';

      // 3. Insertar (NO incluir Id_terminal - se generará automáticamente)
      const [result] = await connection.query(
        `INSERT INTO Terminales 
         (NumeroSerie, Modelo, Color, CobroTarjeta, Colegio, Asignado, FechaEntrega, FechaRecoger, Costo, ColegioID) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          NumeroSerie.trim(),
          Modelo?.trim() || '',
          Color?.trim() || '',
          CobroTarjeta || 'NO',
          Colegio?.trim() || '',
          asignadoValue,
          FechaEntrega || null,
          FechaRecoger || null,
          parseFloat(Costo) || 0,
          colegioIdValue
        ]
      );

      // 4. Obtener el registro recién creado (con el ID generado automáticamente)
      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [result.insertId]
      );

      await connection.commit();
      return NextResponse.json(rows[0], { status: 201 });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error al crear terminal:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes("'NumeroSerie'")) {
        return NextResponse.json(
          { error: 'Ya existe un terminal con este número de serie' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Error: ID duplicado. Contacte al administrador.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: `Error al crear terminal: ${error.message}` },
      { status: 500 }
    );
  }
}