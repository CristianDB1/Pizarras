import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegioId');

    if (!colegioId) {
      return NextResponse.json({ error: 'colegioId es requerido' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.query(
        'SELECT * FROM Terminales WHERE ColegioID = ? ORDER BY Id_terminal DESC',
        [colegioId]
      );
      
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

    // Validaciones básicas
    if (!NumeroSerie || NumeroSerie.trim() === '') {
      return NextResponse.json({ error: 'El número de serie es requerido' }, { status: 400 });
    }

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
          Asignado?.trim() || '',
          FechaEntrega || null,
          FechaRecoger || null,
          Costo || 0,
          ColegioID
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
    
    // Manejar errores de duplicación
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