import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const colegioId = searchParams.get('colegioId');
    const sorteoId = searchParams.get('sorteoId');

    if (!colegioId) {
      return NextResponse.json({ error: 'colegioId es requerido' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    
    try {
      // 1. Obtener vendedores activos del colegio
      const [vendedores] = await connection.query(
        'SELECT * FROM vendedores WHERE colegio_id = ? AND estatus = "activo" ORDER BY nombre',
        [colegioId]
      );

      // 2. Para cada vendedor, calcular su corte por sorteo
      const vendedoresConCorte = [];
      
      for (const vendedor of vendedores) {
        // 3. Obtener boletos pendientes agrupados por sorteo
        let queryBoletosPorSorteo = `
          SELECT 
            b.id_sorteo,
            COUNT(*) as total_boletos,
            SUM(b.precio) as total_venta,
            s.fecha as fecha_sorteo,
            s.nombre as nombre_sorteo
          FROM boletos b
          LEFT JOIN sorteo s ON b.id_sorteo = s.id_sorteo
          WHERE b.colegio_id = ? 
            AND b.id_vendedor = ? 
            AND b.estado_pago = 'pendiente'
        `;
        
        const params = [colegioId, vendedor.id_vendedor];
        
        // Filtrar por sorteo si se especifica
        if (sorteoId && sorteoId !== 'todos') {
          queryBoletosPorSorteo += ' AND b.id_sorteo = ?';
          params.push(sorteoId);
        }
        
        queryBoletosPorSorteo += ' GROUP BY b.id_sorteo';
        
        const [boletosPorSorteo] = await connection.query(queryBoletosPorSorteo, params);
        
        // 4. Para cada sorteo donde tenga boletos pendientes
        for (const boletosSorteo of boletosPorSorteo) {
          // 5. Verificar si ya tiene un corte registrado para este sorteo
          const [cortes] = await connection.query(
            `SELECT c.*, s.fecha as fecha_sorteo, s.nombre as nombre_sorteo
             FROM cortesdecaja c
             LEFT JOIN sorteo s ON c.id_sorteo = s.id_sorteo
             WHERE c.id_vendedor = ? 
               AND c.colegio_id = ?
               AND c.id_sorteo = ?`,
            [vendedor.id_vendedor, colegioId, boletosSorteo.id_sorteo]
          );
          
          // 6. Calcular valores
          const totalBoletos = boletosSorteo.total_boletos || 0;
          const ventaTotal = parseFloat(boletosSorteo.total_venta) || 0;
          const comisionPorcentaje = parseFloat(vendedor.comision) || 0;
          const comisionGanada = ventaTotal * (comisionPorcentaje / 100);
          const totalEntregar = ventaTotal - comisionGanada;
          
          // 7. Agregar al array
          vendedoresConCorte.push({
            id_vendedor: vendedor.id_vendedor,
            nombre: vendedor.nombre,
            usuario: vendedor.usuario,
            comision: comisionPorcentaje,
            boletosVendidos: totalBoletos,
            ventaTotal: ventaTotal,
            comisionGanada: comisionGanada,
            totalEntregar: totalEntregar,
            estado: cortes.length > 0 ? 'liquidado' : 'pendiente',
            fechaLiquidacion: cortes[0]?.fecha_actual || null,
            total_entregado: cortes[0]?.total_entregado || null,
            id_corte: cortes[0]?.id_corte || null,
            id_sorteo: boletosSorteo.id_sorteo,
            fecha_sorteo: boletosSorteo.fecha_sorteo,
            nombre_sorteo: boletosSorteo.nombre_sorteo || `Sorteo ${boletosSorteo.id_sorteo}`,
            tieneBoletosPendientes: totalBoletos > 0
          });
        }
        
        // 8. Si no tiene boletos en ningún sorteo, agregar solo info básica
        if (boletosPorSorteo.length === 0) {
          vendedoresConCorte.push({
            id_vendedor: vendedor.id_vendedor,
            nombre: vendedor.nombre,
            usuario: vendedor.usuario,
            comision: parseFloat(vendedor.comision) || 0,
            boletosVendidos: 0,
            ventaTotal: 0,
            comisionGanada: 0,
            totalEntregar: 0,
            estado: 'pendiente',
            fechaLiquidacion: null,
            total_entregado: null,
            id_corte: null,
            id_sorteo: null,
            fecha_sorteo: null,
            nombre_sorteo: null,
            tieneBoletosPendientes: false
          });
        }
      }
      
      return NextResponse.json(vendedoresConCorte);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al calcular cortes:', error);
    return NextResponse.json(
      { error: 'Error al calcular cortes de caja' },
      { status: 500 }
    );
  }
}