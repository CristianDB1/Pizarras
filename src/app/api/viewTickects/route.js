import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(req) {
  try {
    const data = await req.json();
    const idVendedor = data.Idvendedor || data.idVendedor;
    
    if (!idVendedor) {
      return NextResponse.json({ 
        success: false,
        error: "Se requiere el ID del vendedor" 
      }, { status: 400 });
    }

    console.log('📋 Obteniendo boletos NO CORTADOS para vendedor:', idVendedor);

    // CONSULTA FINAL - Boletos que NO están incluidos en un corte de caja
    // Un boleto está "cortado" si existe un corte para ese sorteo-fecha
    const sql = `
        SELECT 
            b.*, 
            c.leyenda1, 
            s.leyenda2, 
            s.fecha AS FechaSorteo,
            s.nombre AS nombreSorteo,
            s.primer_premio,
            s.segundo_premio,
            v.Nombre AS nombreVendedor, 
            v.Comision AS comisiones, 
            d.cantidad AS deuda,
            CASE 
                WHEN cc.id_corte IS NOT NULL THEN TRUE
                ELSE FALSE
            END AS cortado
        FROM boletos b
        CROSS JOIN configuracion c
        JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
        JOIN vendedores v ON b.id_vendedor = v.Idvendedor
        LEFT JOIN deuda d ON v.Idvendedor = d.usuario
        LEFT JOIN cortesdecaja cc ON 
            b.id_vendedor = cc.id_vendedor 
            AND b.tipo_sorteo = cc.id_sorteo
            AND DATE(s.fecha) = DATE(cc.fecha_sorteo)
            AND cc.id_vendedor = ?
        WHERE b.id_vendedor = ?
          AND b.estado_pago = 'pendiente'
          AND cc.id_corte IS NULL  -- Solo boletos NO incluidos en cortes
        ORDER BY b.created_at DESC;
        `;

    const [boletos] = await pool.query(sql, [idVendedor, idVendedor]);

    console.log(`✅ ${boletos.length} boletos pendientes (no cortados) para vendedor ${idVendedor}`);

    // Formatear respuesta
    const boletosFormateados = boletos.map(boleto => ({
      // Campos originales del boleto
      id_boleto: boleto.id_boleto,
      tipo_sorteo: boleto.tipo_sorteo,
      boleto: boleto.boleto,
      comprador: boleto.comprador,
      id_vendedor: boleto.id_vendedor,
      colegio_id: boleto.colegio_id,
      precio: boleto.precio,
      estado_pago: boleto.estado_pago,
      qr_code: boleto.qr_code,
      created_at: boleto.created_at,
      fecha_venta: boleto.fecha_venta,
      
      // Campos calculados/relacionados
      Idsorteo: boleto.tipo_sorteo,
      Idvendedor: boleto.id_vendedor,
      Boleto: boleto.boleto,
      Costo: boleto.precio,
      Fecha: boleto.created_at || boleto.fecha_venta,
      
      // Datos del vendedor
      nombreVendedor: boleto.nombreVendedor,
      comisiones: boleto.comisiones,
      deuda: boleto.deuda || 0,
      
      // Datos del sorteo
      leyenda1: boleto.leyenda1,
      leyenda2: boleto.leyenda2,
      FechaSorteo: boleto.FechaSorteo,
      nombreSorteo: boleto.nombreSorteo,
      primer_premio: boleto.primer_premio,
      segundo_premio: boleto.segundo_premio,
      
      // Estado
      estado: 'pendiente',
      cortado: boleto.cortado || false
    }));

    return NextResponse.json(boletosFormateados);
    
  } catch (error) {
    console.error("❌ Error obteniendo boletos:", error);
    
    // Si hay error específico, intentar versión más simple
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log('⚠️ Error en campos, intentando consulta simplificada...');
      
      try {
        // Consulta de emergencia - solo datos básicos
        const sqlSimple = `
            SELECT 
                b.id_boleto,
                b.tipo_sorteo as Idsorteo,
                b.boleto as Boleto,
                b.precio as Costo,
                b.created_at as Fecha,
                b.comprador,
                b.estado_pago,
                s.nombre as nombreSorteo,
                s.fecha as FechaSorteo,
                s.primer_premio,
                s.segundo_premio,
                v.Nombre as nombreVendedor
            FROM boletos b
            JOIN sorteo s ON b.tipo_sorteo = s.Idsorteo
            JOIN vendedores v ON b.id_vendedor = v.Idvendedor
            WHERE b.id_vendedor = ?
              AND b.estado_pago = 'pendiente'
            ORDER BY b.created_at DESC;
            `;
        
        const [boletos] = await pool.query(sqlSimple, [idVendedor]);
        console.log(`✅ ${boletos.length} boletos (consulta simple)`);
        
        return NextResponse.json(boletos);
      } catch (simpleError) {
        console.error("❌ Error en consulta simple:", simpleError);
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: "Error al obtener los boletos",
      details: error.message,
      sqlError: error.code,
      sqlMessage: error.sqlMessage
    }, { status: 500 });
  }
}