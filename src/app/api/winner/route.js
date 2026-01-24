export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

// GET: Obtener boletos premiados, con opción de filtrar por colegio_id
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegio_id');
    const idBoleto = searchParams.get('id_boleto'); // Nuevo parámetro para buscar por ID de boleto
    
    // Si se proporciona id_boleto, buscar específicamente ese boleto
    if (idBoleto) {
      return await buscarPorIdBoleto(idBoleto, colegioId);
    }
    
    // Construir la consulta base (manteniendo tu lógica original)
    let query = `
      SELECT 
        id_ganador,
        folio,
        boleto,
        costo,
        cliente,
        premio,
        fecha_sorteo,
        vendedor,
        fecha_pago,
        ine,
        estatus,
        liquidado,
        colegio_id,
        created_at
      FROM ganadores
    `;
    
    const queryParams = [];
    
    if (colegioId) {
      query += ' WHERE colegio_id = ?';
      queryParams.push(colegioId);
    }
    
    query += ' ORDER BY fecha_sorteo DESC';
    
    const [premiados] = await pool.query(query, queryParams);
    
    if (colegioId && premiados.length === 0) {
      return NextResponse.json({
        premiados: [],
        message: `No hay ganadores registrados para el colegio con ID: ${colegioId}`,
        success: true
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
          'CDN-Cache-Control': 'no-cache',
          'Vercel-CDN-Cache-Control': 'no-cache'
        }
      });
    }

    return NextResponse.json({
      premiados,
      success: true,
      filtroAplicado: !!colegioId,
      colegioId: colegioId || null
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'no-cache',
        'Vercel-CDN-Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error("Error al obtener boletos premiados:", error);
    return NextResponse.json({
      error: "Error al obtener boletos premiados: " + error.message,
      success: false
    }, {
      status: 500
    });
  }
}

// Función auxiliar para buscar por ID de boleto
async function buscarPorIdBoleto(idBoleto, colegioId = null) {
  try {
    // Primero, obtener el número de boleto desde la tabla boletos usando el id_boleto
    const [boletoInfo] = await pool.query(
      'SELECT boleto, colegio_id FROM boletos WHERE id_boleto = ?',
      [idBoleto]
    );
    
    if (boletoInfo.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No se encontró boleto con ID: ${idBoleto}`,
        boletoEncontrado: false
      }, { status: 404 });
    }
    
    const numeroBoleto = boletoInfo[0].boleto;
    const colegioBoleto = boletoInfo[0].colegio_id;
    
    // Verificar que el boleto pertenezca al colegio si se especificó
    if (colegioId && colegioBoleto != colegioId) {
      return NextResponse.json({
        success: false,
        error: `El boleto no pertenece al colegio especificado`,
        boletoEncontrado: false
      }, { status: 403 });
    }
    
    // Ahora buscar en ganadores usando el número de boleto
    let query = `
      SELECT 
        id_ganador,
        folio,
        boleto,
        costo,
        cliente,
        premio,
        fecha_sorteo,
        vendedor,
        fecha_pago,
        ine,
        estatus,
        liquidado,
        colegio_id,
        created_at
      FROM ganadores
      WHERE boleto = ?
    `;
    
    const queryParams = [numeroBoleto];
    
    // Si se especificó colegio, filtrar también por colegio
    if (colegioId) {
      query += ' AND colegio_id = ?';
      queryParams.push(colegioId);
    } else if (colegioBoleto) {
      // Si no se especificó colegio pero el boleto tiene colegio, usarlo
      query += ' AND colegio_id = ?';
      queryParams.push(colegioBoleto);
    }
    
    const [ganadores] = await pool.query(query, queryParams);
    
    if (ganadores.length === 0) {
      return NextResponse.json({
        success: true,
        boletoEncontrado: true,
        ganadorEncontrado: false,
        mensaje: `El boleto ${numeroBoleto} existe pero no está registrado como ganador`,
        numeroBoleto,
        idBoleto,
        colegioId: colegioBoleto
      });
    }
    
    return NextResponse.json({
      success: true,
      boletoEncontrado: true,
      ganadorEncontrado: true,
      ganador: ganadores[0],
      premiados: ganadores,
      numeroBoleto,
      idBoleto,
      colegioId: colegioBoleto
    });
    
  } catch (error) {
    console.error("Error al buscar por ID de boleto:", error);
    return NextResponse.json({
      success: false,
      error: "Error al buscar por ID de boleto: " + error.message
    }, { status: 500 });
  }
}

// PUT: Actualizar estado de boleto premiado a pagado
export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ine, user, liquidado } = data;

    const fecha_pago = new Date();

    if (!id) {
      return NextResponse.json({
        error: "Se requiere un ID de boleto premiado",
        success: false
      }, {
        status: 400
      });
    }

    // Verificar si el id_ganador ya está pagado
    const [boletoExistente] = await pool.query(
      'SELECT * FROM ganadores WHERE id_ganador = ? AND estatus = "pagado"',
      [id]
    );
    
    if (boletoExistente.length > 0) {
      return NextResponse.json({
        error: "El boleto ya está marcado como pagado",
        success: false
      }, {
        status: 400
      });
    }

    // Consulta actualizada para actualizar el boleto
    const [resultado] = await pool.query(
      `UPDATE ganadores 
       SET estatus = ?, 
           ine = ?, 
           fecha_pago = ?, 
           vendedor = ?,
           liquidado = ?
       WHERE id_ganador = ?`,
      ["pagado", ine, fecha_pago, user?.Nombre || user?.vendedor || '', liquidado || 'no', id]
    );

    if (resultado.affectedRows === 0) {
      return NextResponse.json({
        error: "No se encontró el boleto premiado con el ID proporcionado",
        success: false
      }, {
        status: 404
      });
    }

    // Consulta para obtener los datos actualizados
    const [boletoActualizado] = await pool.query(
      `SELECT 
        id_ganador,
        folio,
        boleto,
        costo,
        cliente,
        premio,
        fecha_sorteo,
        vendedor,
        fecha_pago,
        ine,
        estatus,
        liquidado,
        colegio_id,
        created_at
      FROM ganadores 
      WHERE id_ganador = ?`,
      [id]
    );

    return NextResponse.json({
      message: "Boleto premiado actualizado correctamente",
      success: true,
      boleto: boletoActualizado[0],
      folio: boletoActualizado[0]?.folio
    });
  } catch (error) {
    console.error("Error al actualizar boleto premiado:", error);
    return NextResponse.json({
      error: "Error al actualizar boleto premiado: " + error.message,
      success: false
    }, {
      status: 500
    });
  }
}

// POST: Crear un nuevo ganador
export async function POST(request) {
  try {
    const data = await request.json();
    const {
      folio,
      boleto,
      costo,
      cliente,
      premio,
      fecha_sorteo,
      vendedor,
      ine = null,
      estatus = 'pendiente',
      liquidado = 'no',
      colegio_id
    } = data;

    // Validar campos requeridos
    if (!folio || !boleto || !costo || !cliente || !premio || !fecha_sorteo || !vendedor || !colegio_id) {
      return NextResponse.json({
        error: "Faltan campos requeridos, incluyendo colegio_id",
        success: false
      }, {
        status: 400
      });
    }

    const [resultado] = await pool.query(
      `INSERT INTO ganadores 
       (folio, boleto, costo, cliente, premio, fecha_sorteo, vendedor, ine, estatus, liquidado, colegio_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [folio, boleto, costo, cliente, premio, fecha_sorteo, vendedor, ine, estatus, liquidado, colegio_id]
    );

    const [nuevoGanador] = await pool.query(
      `SELECT * FROM ganadores WHERE id_ganador = ?`,
      [resultado.insertId]
    );

    return NextResponse.json({
      message: "Ganador creado exitosamente",
      success: true,
      ganador: nuevoGanador[0]
    });
  } catch (error) {
    console.error("Error al crear ganador:", error);
    return NextResponse.json({
      error: "Error al crear ganador: " + error.message,
      success: false
    }, {
      status: 500
    });
  }
}