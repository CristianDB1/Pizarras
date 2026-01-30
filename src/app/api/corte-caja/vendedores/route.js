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
        // 3. Obtener sorteos donde el vendedor tenga actividad
        let querySorteosVendedor = `
          SELECT DISTINCT b.id_sorteo, s.fecha as fecha_sorteo, s.nombre as nombre_sorteo
          FROM boletos b
          LEFT JOIN sorteo s ON b.id_sorteo = s.id_sorteo
          WHERE b.colegio_id = ? 
            AND b.id_vendedor = ?
        `;
        
        const paramsSorteos = [colegioId, vendedor.id_vendedor];
        
        if (sorteoId && sorteoId !== 'todos') {
          querySorteosVendedor += ' AND b.id_sorteo = ?';
          paramsSorteos.push(sorteoId);
        }
        
        querySorteosVendedor += ' ORDER BY s.fecha ASC';
        
        const [sorteosVendedor] = await connection.query(querySorteosVendedor, paramsSorteos);
        
        // 4. Para cada sorteo donde el vendedor haya vendido boletos
        for (const sorteo of sorteosVendedor) {
          // 5. Calcular boletos PENDIENTES que NO estén en corte_boletos
          const queryBoletosPendientes = `
            SELECT 
              COUNT(*) as total_boletos,
              SUM(b.precio) as total_venta
            FROM boletos b
            WHERE b.colegio_id = ? 
              AND b.id_vendedor = ? 
              AND b.id_sorteo = ?
              AND b.estado_pago = 'pendiente'
              AND b.id_boleto NOT IN (
                SELECT cb.id_boleto 
                FROM corte_boletos cb
                WHERE cb.id_boleto = b.id_boleto
              )
          `;
          
          const [boletosPendientes] = await connection.query(queryBoletosPendientes, 
            [colegioId, vendedor.id_vendedor, sorteo.id_sorteo]
          );
          
          // 6. Verificar si ya tiene cortes registrados para este sorteo
          const [cortes] = await connection.query(
            `SELECT c.* 
             FROM cortesdecaja c
             WHERE c.id_vendedor = ? 
               AND c.colegio_id = ?
               AND c.id_sorteo = ?
             ORDER BY c.fecha_actual DESC
             LIMIT 1`,
            [vendedor.id_vendedor, colegioId, sorteo.id_sorteo]
          );
          
          // 7. Calcular valores
          const totalBoletos = boletosPendientes[0]?.total_boletos || 0;
          const ventaTotal = parseFloat(boletosPendientes[0]?.total_venta) || 0;
          const comisionPorcentaje = parseFloat(vendedor.comision) || 0;
          const comisionGanada = ventaTotal * (comisionPorcentaje / 100);
          const totalEntregar = ventaTotal - comisionGanada;
          
          // 8. Determinar estado
          let estado = 'pendiente';
          let fechaLiquidacion = null;
          let total_entregado = null;
          let id_corte = null;
          
          if (cortes.length > 0) {
            const ultimoCorte = cortes[0];
            id_corte = ultimoCorte.id_corte;
            total_entregado = ultimoCorte.total_entregado;
            fechaLiquidacion = ultimoCorte.fecha_actual;
            
            // Si hay boletos pendientes después del último corte, sigue pendiente
            // Si no hay boletos pendientes, está liquidado
            estado = totalBoletos > 0 ? 'pendiente' : 'liquidado';
          }
          
          // 9. Solo agregar si tiene boletos pendientes o ya fue liquidado
          if (totalBoletos > 0 || estado === 'liquidado') {
            vendedoresConCorte.push({
              id_vendedor: vendedor.id_vendedor,
              nombre: vendedor.nombre,
              usuario: vendedor.usuario,
              comision: comisionPorcentaje,
              boletosVendidos: totalBoletos,
              ventaTotal: ventaTotal,
              comisionGanada: comisionGanada,
              totalEntregar: totalEntregar,
              estado: estado,
              fechaLiquidacion: fechaLiquidacion,
              total_entregado: total_entregado,
              id_corte: id_corte,
              id_sorteo: sorteo.id_sorteo,
              fecha_sorteo: sorteo.fecha_sorteo,
              nombre_sorteo: sorteo.nombre_sorteo || `Sorteo ${sorteo.id_sorteo}`,
              tieneBoletosPendientes: totalBoletos > 0
            });
          }
        }
        
        // 10. Si el vendedor no tiene actividad en ningún sorteo, agregar solo info básica
        if (sorteosVendedor.length === 0) {
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