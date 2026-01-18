import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(req) {
  try {
    const data = await req.json();
    const idVendedor = data.id_vendedor || data.idVendedor || data.Idvendedor;
    
    if (!idVendedor) {
      return NextResponse.json({ 
        success: false,
        error: "Se requiere el ID del vendedor" 
      }, { status: 400 });
    }

    // Consulta corregida - Sin comparar fechas
    const finalSql = `
        SELECT 
          b.*, 
          s.nombre AS nombreSorteo,
          s.numero_sorteo AS numeroSorteo,
          s.fecha AS fechaSorteo,
          s.primer_premio,
          s.segundo_premio,
          s.digitos_boleto,
          v.nombre AS nombreVendedor
        FROM boletos b
        JOIN sorteo s ON b.id_sorteo = s.id_sorteo
        JOIN vendedores v ON b.id_vendedor = v.id_vendedor
        WHERE b.id_vendedor = ?
          AND b.estado_pago = 'pendiente'
          AND NOT EXISTS (
            SELECT 1 FROM cortesdecaja cc 
            WHERE cc.id_vendedor = b.id_vendedor 
              AND cc.id_sorteo = b.id_sorteo
          )
        ORDER BY b.fecha_venta DESC;
    `;

    const [boletos] = await pool.query(finalSql, [idVendedor]);
    console.log(`✅ ${boletos.length} boletos pendientes para vendedor ${idVendedor}`);

    // Formatear respuesta
    const boletosFormateados = boletos.map(boleto => ({
      id_boleto: boleto.id_boleto,
      tipo_sorteo: boleto.id_sorteo,
      boleto: boleto.boleto,
      comprador: boleto.comprador,
      id_vendedor: boleto.id_vendedor,
      colegio_id: boleto.colegio_id,
      precio: boleto.precio,
      estado_pago: boleto.estado_pago,
      fecha_venta: boleto.fecha_venta,

      Idsorteo: boleto.id_sorteo,
      Idvendedor: boleto.id_vendedor,

      nombreVendedor: boleto.nombreVendedor,
      nombreSorteo: boleto.nombreSorteo,
      numeroSorteo: boleto.numeroSorteo,

      fechaSorteo: boleto.fechaSorteo,

      primer_premio: boleto.primer_premio,
      segundo_premio: boleto.segundo_premio,
      digitos_boleto: boleto.digitos_boleto, 

      estado: boleto.estado_pago,
      cortado: false
    }));
    return NextResponse.json(boletosFormateados);
    
  } catch (error) {
    console.error("❌ Error obteniendo boletos:", error);
    
    return NextResponse.json({ 
      success: false,
      error: "Error al obtener los boletos",
      details: error.message,
      sql: error.sql 
    }, { status: 500 });
  }
}