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

    //console.log('🔍 DEBUG: Obteniendo boletos para vendedor:', idVendedor);
    //console.log('🔍 DEBUG: Datos recibidos:', data);

    // PRIMERO: Verificar si hay boletos en general para este vendedor
    const checkSql = `
        SELECT COUNT(*) as total_boletos,
               SUM(CASE WHEN estado_pago = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
               SUM(CASE WHEN estado_pago = 'pagado' THEN 1 ELSE 0 END) as pagados
        FROM boletos 
        WHERE id_vendedor = ?;
    `;
    
    const [countResult] = await pool.query(checkSql, [idVendedor]);
    //console.log('🔍 DEBUG: Estadísticas de boletos:', countResult[0]);

    // SEGUNDO: Consulta SIMPLE sin joins complejos ni filtros de corte
    const simpleSql = `
        SELECT 
            b.id_boleto,
            b.id_sorteo,
            b.boleto,
            b.comprador,
            b.id_vendedor,
            b.precio,
            b.estado_pago,
            b.fecha_venta,
            b.colegio_id,
            s.nombre AS nombreSorteo,
            s.fecha AS FechaSorteo,
            v.nombre AS nombreVendedor
        FROM boletos b
        JOIN sorteo s ON b.id_sorteo = s.id_sorteo
        JOIN vendedores v ON b.id_vendedor = v.id_vendedor
        WHERE b.id_vendedor = ?
        ORDER BY b.fecha_venta DESC
        LIMIT 10;
    `;

    const [simpleBoletos] = await pool.query(simpleSql, [idVendedor]);
    //console.log('🔍 DEBUG: Boletos encontrados (simple query):', simpleBoletos.length);
    if (simpleBoletos.length > 0) {
      //console.log('🔍 DEBUG: Primer boleto ejemplo:', simpleBoletos[0]);
    }

    // TERCERO: Verificar si hay cortes para este vendedor
    const cortesSql = `
        SELECT * FROM cortesdecaja 
        WHERE id_vendedor = ? 
        LIMIT 5;
    `;
    
    const [cortes] = await pool.query(cortesSql, [idVendedor]);
    //console.log('🔍 DEBUG: Cortes encontrados:', cortes.length);
    if (cortes.length > 0) {
      //console.log('🔍 DEBUG: Primer corte ejemplo:', cortes[0]);
    }

    // CUARTO: Consulta final pero simplificando el filtro de corte
    const finalSql = `
        SELECT 
            b.*, 
            s.nombre AS nombreSorteo,
            s.fecha AS FechaSorteo,
            s.primer_premio,
            s.segundo_premio,
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
              AND DATE(cc.fecha_sorteo) = DATE(s.fecha)
          )
        ORDER BY b.fecha_venta DESC;
    `;

    const [boletos] = await pool.query(finalSql, [idVendedor]);
    //console.log(`✅ ${boletos.length} boletos pendientes (no cortados) para vendedor ${idVendedor}`);

    /*if (boletos.length === 0 && simpleBoletos.length > 0) {
      console.log('⚠️ ADVERTENCIA: Hay boletos pero la consulta filtrada devuelve 0.');
      console.log('   Posibles causas:');
      console.log('   1. Los boletos tienen estado_pago diferente a "pendiente"');
      console.log('   2. Ya están incluidos en cortes de caja');
      console.log('   3. El JOIN con cortesdecaja está filtrando todo');
    }*/

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
      Boleto: boleto.boleto,
      Costo: boleto.precio,
      Fecha: boleto.fecha_venta,
      
      nombreVendedor: boleto.nombreVendedor,
      nombreSorteo: boleto.nombreSorteo,
      FechaSorteo: boleto.FechaSorteo,
      primer_premio: boleto.primer_premio,
      segundo_premio: boleto.segundo_premio,
      
      estado: boleto.estado_pago,
      cortado: false
    }));

    return NextResponse.json(boletosFormateados);
    
  } catch (error) {
    console.error("❌ Error obteniendo boletos:", error);
    
    return NextResponse.json({ 
      success: false,
      error: "Error al obtener los boletos",
      details: error.message
    }, { status: 500 });
  }
}