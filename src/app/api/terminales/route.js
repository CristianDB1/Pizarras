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

    // Si ColegioID viene vacío, manejarlo como null para terminales sin asignar
    const colegioIdValue = ColegioID && ColegioID.toString().trim() !== '' ? ColegioID : null;
    const asignadoValue = colegioIdValue ? (Asignado?.trim() || 'Sí') : 'No';

    const connection = await pool.getConnection();
    
    try {
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
          asignadoValue, // Usar valor calculado
          FechaEntrega || null,
          FechaRecoger || null,
          Costo || 0,
          colegioIdValue // Puede ser null
        ]
      );

      // Obtener el registro recién creado
      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE Id_terminal = ?',
        [result.insertId]
      );

      return NextResponse.json(rows[0], { status: 201 });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al crear terminal:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'Ya existe un terminal con este número de serie' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Error al crear terminal' },
      { status: 500 }
    );
  }
}