import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegioId');
    const asignados = searchParams.get('asignados');

    const connection = await pool.getConnection();
    
    try {
      let query = 'SELECT * FROM Terminales';
      let params = [];
      
      if (colegioId) {
        query += ' WHERE ColegioID = ?';
        params.push(colegioId);
      } else if (asignados === 'false' || asignados === 'no') {
        // Obtener terminales sin asignar (Asignado vacío, nulo o "No asignado")
        query += ` WHERE (Asignado IS NULL OR Asignado = '' OR Asignado LIKE '%No asignado%')`;
      } else if (asignados === 'true' || asignados === 'si') {
        // Obtener terminales asignados
        query += ` WHERE (Asignado IS NOT NULL AND Asignado != '' AND Asignado NOT LIKE '%No asignado%')`;
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

    console.log('📥 Datos recibidos para crear terminal:', data);

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
      
      // 3. Si se seleccionó colegio pero no se especificó asignación,
      // usar el nombre del colegio como asignación por defecto
      let asignadoValue = Asignado.trim();
      if (!asignadoValue && colegioIdValue && Colegio) {
        asignadoValue = Colegio.trim();
      }
      
      // 4. Validar formato de fechas
      let fechaEntregaValue = null;
      let fechaRecogerValue = null;
      
      if (FechaEntrega) {
        fechaEntregaValue = new Date(FechaEntrega);
        if (isNaN(fechaEntregaValue.getTime())) {
          throw new Error('Fecha de entrega inválida');
        }
      }
      
      if (FechaRecoger) {
        fechaRecogerValue = new Date(FechaRecoger);
        if (isNaN(fechaRecogerValue.getTime())) {
          throw new Error('Fecha de recogida inválida');
        }
      }

      // 5. Insertar
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
          asignadoValue, // Texto libre (ej: "Juan Pérez", "Almacén Central")
          fechaEntregaValue,
          fechaRecogerValue,
          parseFloat(Costo) || 0,
          colegioIdValue
        ]
      );

      console.log('✅ Terminal creado con ID:', result.insertId);

      // 6. Obtener el registro recién creado
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