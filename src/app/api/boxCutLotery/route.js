import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

// POST: Recibe { Idvendedor, colegio_id, fechaInicio, fechaFin, modo }
// modo: 'dia' o 'semana'
// NOTA: Cambiamos 'sucursal' por 'colegio_id'
export async function POST(req) {
  try {
    const data = await req.json();
    const { Idvendedor, colegio_id, fechaInicio, fechaFin, modo } = data;
    
    // Validar que el vendedor pertenezca al colegio
    const [vendedorValido] = await pool.query(
      `SELECT id_vendedor FROM vendedores 
       WHERE id_vendedor = ? AND colegio_id = ?`,
      [Idvendedor, colegio_id]
    );
    
    if (vendedorValido.length === 0) {
      return NextResponse.json(
        { error: 'El vendedor no pertenece a este colegio' },
        { status: 400 }
      );
    }
    
    // 1. Consulta UNIFICADA para todos los boletos
    let sqlBoletos = `
      SELECT 
        b.id_boleto,
        b.boleto AS numero_boleto,
        b.fecha_venta, 
        b.precio AS costo_boleto, 
        s.fecha AS fecha_sorteo, 
        s.comision_vendedor AS porcentaje_comision, 
        v.nombre AS nombre_vendedor, 
        v.colegio_id, 
        c.nombre AS nombre_colegio
      FROM boletos b
      JOIN sorteo s ON b.id_sorteo = s.id_sorteo 
      JOIN vendedores v ON b.id_vendedor = v.id_vendedor 
      JOIN colegios c ON v.colegio_id = c.id_colegio
      WHERE b.id_vendedor = ? 
        AND v.colegio_id = ?
        AND DATE(b.fecha_venta) BETWEEN ? AND ?
    `;

    let [boletos] = await pool.query(sqlBoletos, [Idvendedor, colegio_id, fechaInicio, fechaFin]);

    // 2. Agrupación por día corregida
    let diasMap = {};
    boletos.forEach((b) => {
      // Ajuste de fecha para agrupación
      let dia = b.fecha_venta;
      if (dia instanceof Date) {
        dia = dia.toISOString().split("T")[0];
      } else if (typeof dia === "string") {
        dia = dia.substring(0, 10);
      }

      if (!diasMap[dia]) {
        diasMap[dia] = {
          dia,
          boletosvendidos: 0,
          venta: 0,
          comision: 0,
          totalcaja: 0,
          nombreColegio: b.nombre_colegio || ''
        };
      }

      const costo = Number(b.costo_boleto) || 0;
      const comisionPct = Number(b.porcentaje_comision) || 0;
      const montoComision = (costo * comisionPct) / 100;

      diasMap[dia].boletosvendidos += 1;
      diasMap[dia].venta += costo;
      diasMap[dia].comision += montoComision;
      diasMap[dia].totalcaja += (costo - montoComision);
    });

    // Convertir a array y ordenar por día ascendente
    let dias = Object.values(diasMap).sort((a, b) => a.dia.localeCompare(b.dia));

    // Si es modo semana, sumar todo para el resumen semanal
    let resumen = null;
    if (modo === 'semana') {
      resumen = dias.reduce((acc, row) => {
        acc.boletosvendidos += Number(row.boletosvendidos);
        acc.venta += Number(row.venta);
        acc.comision += Number(row.comision);
        acc.totalcaja += Number(row.totalcaja);
        return acc;
      }, {
        boletosvendidos: 0, venta: 0, comision: 0, totalcaja: 0
      });
    }

    // 3. Consultar cancelados - ACTUALIZADA
    const boletosNumeros = boletos.map(b => b.numero_boleto);

    // 4. Consultar cancelados 
    let sqlCancelados = `
      SELECT c.*
      FROM Cancelados c
      JOIN vendedores v ON c.Idvendedor = v.id_vendedor
      WHERE c.Idvendedor = ?
        AND v.colegio_id = ?
        AND DATE(c.Hora_cancelacion) BETWEEN ? AND ?
    `;
    let [cancelados] = await pool.query(sqlCancelados, [Idvendedor, colegio_id, fechaInicio, fechaFin]);

    const totalCancelados = cancelados.reduce((acc, c) => acc + (Number(c.costo) || 0), 0);

    if (modo === 'semana' && resumen) {
      resumen.canceladosTotal = totalCancelados;
      resumen.canceladosCount = cancelados.length;
    }

    // Agrupar cancelados por día para reportes diarios
    let canceladosPorDia = {};
    cancelados.forEach(c => {
      let dia = c.Fecha_cancelacion;
      if (dia instanceof Date) {
        dia = dia.toISOString().split("T")[0];
      } else if (typeof dia === "string" && dia.includes("T")) {
        dia = dia.split("T")[0];
      } else if (typeof dia === "string" && dia.length > 10) {
        dia = dia.substring(0, 10);
      }

      if (!canceladosPorDia[dia]) {
        canceladosPorDia[dia] = {
          dia,
          cantidad: 0,
          monto: 0
        };
      }

      canceladosPorDia[dia].cantidad++;
      canceladosPorDia[dia].monto += Number(c.Costo) || 0;
    });

    // Convertir a array para facilitar el acceso en el frontend
    const canceladosDias = Object.values(canceladosPorDia);

    // 5. Consultar ganadores - AJUSTADO A id_vendedor
    let ganadores = [];
    let totalPremios = 0;
    try {
        let sqlGanadores = `
          SELECT g.*, 
            CONVERT_TZ(g.fecha_pago, '+00:00', '-06:00') AS fecha_pago
          FROM ganadores g
          WHERE DATE(CONVERT_TZ(g.fecha_pago, '+00:00', '-06:00')) BETWEEN ? AND ?
            AND g.vendedor = (SELECT nombre FROM vendedores WHERE id_vendedor = ? AND colegio_id = ?)
        `;
        [ganadores] = await pool.query(sqlGanadores, [fechaInicio, fechaFin, Idvendedor, colegio_id]);
        totalPremios = ganadores.reduce((acc, g) => acc + (Number(g.premio) || 0), 0);
        
        if (modo === 'semana' && resumen) {
          resumen.ganadoresTotal = totalPremios;
          resumen.ganadoresCount = ganadores.length;
        }
    } catch (e) {
        console.log("Tabla ganadores no encontrada o vacía, saltando...");
    }

    if (modo === 'semana' && resumen) {
      resumen.ganadoresTotal = totalPremios;
      resumen.ganadoresCount = ganadores.length;
    }

    // Agrupar ganadores por día para reportes diarios
    let ganadoresPorDia = {};
    ganadores.forEach(g => {
      let dia = g.Fecha_pago_mx || g.Fecha_pago;
      if (dia instanceof Date) {
        dia = dia.toISOString().split("T")[0];
      } else if (typeof dia === "string" && dia.includes("T")) {
        dia = dia.split("T")[0];
      } else if (typeof dia === "string" && dia.length > 10) {
        dia = dia.substring(0, 10);
      }

      if (!ganadoresPorDia[dia]) {
        ganadoresPorDia[dia] = {
          dia,
          cantidad: 0,
          monto: 0
        };
      }

      ganadoresPorDia[dia].cantidad++;
      ganadoresPorDia[dia].monto += Number(g.Premio) || 0;
    });

    // Convertir a array para facilitar el acceso en el frontend
    const ganadoresDias = Object.values(ganadoresPorDia);

    // 6. Bancos
    let [bancos] = await pool.query(`SELECT id_banco, banco, cuenta FROM bancos`);

    return NextResponse.json({
      dias,
      resumen,
      cancelados: [],       
      canceladosTotal: 0,  
      ganadores,
      ganadoresTotal: totalPremios,
      bancos,
      nombreColegio: boletos[0]?.nombre_colegio || ''
    });
  } catch (error) {
    console.error("[boxCutLotery] ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}