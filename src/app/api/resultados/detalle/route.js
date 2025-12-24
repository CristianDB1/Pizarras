import { NextResponse } from 'next/server';
import pool from '@/db/MysqlConection';

export async function POST(request) {
  let connection;
  try {
    const { numero_sorteo_ln, colegio_id, id_sorteo } = await request.json();

    if (!numero_sorteo_ln || !colegio_id) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 1. Obtener información del sorteo del colegio
    let sqlSorteo = '';
    let paramsSorteo = [];

    if (id_sorteo) {
      sqlSorteo = `
        SELECT 
          s.*,
          c.nombre as nombre_colegio,
          r.primer_premio_ln,
          r.segundo_premio_ln,
          r.estado as estado_resultado,
          r.fecha_sorteo_ln,
          r.fecha_publicacion
        FROM sorteo s
        JOIN colegios c ON s.colegio_id = c.id_colegio
        LEFT JOIN resultados_loteria_nacional r 
          ON s.numero_sorteo = r.numero_sorteo_ln
        WHERE s.id_sorteo = ?
          AND s.colegio_id = ?
      `;
      paramsSorteo = [parseInt(id_sorteo), parseInt(colegio_id)];
    } else {
      sqlSorteo = `
        SELECT 
          s.*,
          c.nombre as nombre_colegio,
          r.primer_premio_ln,
          r.segundo_premio_ln,
          r.estado as estado_resultado,
          r.fecha_sorteo_ln,
          r.fecha_publicacion
        FROM sorteo s
        JOIN colegios c ON s.colegio_id = c.id_colegio
        LEFT JOIN resultados_loteria_nacional r 
          ON s.numero_sorteo = r.numero_sorteo_ln
        WHERE s.numero_sorteo = ?
          AND s.colegio_id = ?
        ORDER BY s.fecha DESC
        LIMIT 1
      `;
      paramsSorteo = [numero_sorteo_ln, parseInt(colegio_id)];
    }

    const [sorteoRows] = await connection.query({ 
      sql: sqlSorteo, 
      values: paramsSorteo 
    });
    const sorteo = sorteoRows[0];

    if (!sorteo) {
      return NextResponse.json(
        { error: 'Sorteo no encontrado' },
        { status: 404 }
      );
    }

    // 2. Calcular números recortados según digitos_boleto
    let resultadosRecortados = {
      primer_lugar: null,
      segundo_lugar: null
    };

    if (sorteo.primer_premio_ln && sorteo.segundo_premio_ln) {
      const digitos = sorteo.digitos_boleto;
      resultadosRecortados.primer_lugar = sorteo.primer_premio_ln.slice(-digitos);
      resultadosRecortados.segundo_lugar = sorteo.segundo_premio_ln.slice(-digitos);
    }

    // 3. Buscar boletos ganadores
    let boletosGanadores = [];

    if (resultadosRecortados.primer_lugar && resultadosRecortados.segundo_lugar) {
      const sqlBoletos = `
        SELECT 
          b.*,
          v.nombre as vendedor_nombre,
          CASE 
            WHEN b.boleto = ? THEN 'primer_lugar'
            WHEN b.boleto = ? THEN 'segundo_lugar'
          END as tipo_premio
        FROM boletos b
        LEFT JOIN vendedores v ON b.id_vendedor = v.id_vendedor
        WHERE b.id_sorteo = ?
          AND b.colegio_id = ?
          AND b.boleto IN (?, ?)
        ORDER BY 
          CASE 
            WHEN b.boleto = ? THEN 1
            WHEN b.boleto = ? THEN 2
          END,
          b.fecha_venta DESC
      `;
      
      const paramsBoletos = [
        resultadosRecortados.primer_lugar,
        resultadosRecortados.segundo_lugar,
        sorteo.id_sorteo,
        parseInt(colegio_id),
        resultadosRecortados.primer_lugar,
        resultadosRecortados.segundo_lugar,
        resultadosRecortados.primer_lugar,
        resultadosRecortados.segundo_lugar
      ];

      const [boletosRows] = await connection.query({ 
        sql: sqlBoletos, 
        values: paramsBoletos 
      });
      boletosGanadores = boletosRows;
    }

    // 4. Preparar respuesta
    const respuesta = {
      sorteo: {
        id: sorteo.id_sorteo,
        nombre: sorteo.nombre,
        fecha: sorteo.fecha,
        numero_sorteo: sorteo.numero_sorteo,
        digitos_boleto: sorteo.digitos_boleto,
        estatus: sorteo.estatus,
        colegio: {
          id: sorteo.colegio_id,
          nombre: sorteo.nombre_colegio
        }
      },
      resultados_loteria_nacional: {
        primer_lugar: sorteo.primer_premio_ln,
        segundo_lugar: sorteo.segundo_premio_ln,
        estado: sorteo.estado_resultado,
        fecha_sorteo: sorteo.fecha_sorteo_ln,
        fecha_publicacion: sorteo.fecha_publicacion
      },
      resultados_colegio: resultadosRecortados,
      boletos_ganadores: boletosGanadores,
      total_ganadores: boletosGanadores.length
    };

    return NextResponse.json(respuesta);

  } catch (error) {
    console.error('Error obteniendo detalle:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}