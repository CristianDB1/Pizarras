import pool from "@/db/MysqlConection";

function ultimosDigitos(numero, digitos) {
  if (!numero && numero !== 0) return null;
  const numeroStr = String(numero);
  return numeroStr.slice(-digitos).padStart(digitos, "0");
}

export async function procesarResultadoLN(idResultadoLN) {
  console.log(`[PROCESAR-LN] Iniciando para ID: ${idResultadoLN}`);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Obtener resultado LN publicado
    const [resultadosLN] = await connection.query(
      `SELECT * 
       FROM resultados_loteria_nacional 
       WHERE id_resultado = ? 
       AND estado = 'publicado'`,
      [idResultadoLN]
    );

    if (resultadosLN.length === 0) {
      console.log(`[PROCESAR-LN] Resultado no encontrado o no publicado`);
      await connection.rollback();
      return { 
        success: false, 
        message: 'Resultado no encontrado o no está en estado publicado' 
      };
    }

    const resultadoLN = resultadosLN[0];
    console.log(`[PROCESAR-LN] Resultado encontrado:`, {
      id: resultadoLN.id_resultado,
      numeroSorteo: resultadoLN.numero_sorteo_ln,
      primerPremio: resultadoLN.primer_premio_ln,
      segundoPremio: resultadoLN.segundo_premio_ln,
      estado: resultadoLN.estado
    });

    // 2. Buscar sorteos cerrados
    const [sorteos] = await connection.query(
      `SELECT * 
       FROM sorteo 
       WHERE (numero_sorteo = ? OR CAST(numero_sorteo AS CHAR) = ?)
       AND estatus = 'cerrado'`,
      [resultadoLN.numero_sorteo_ln, resultadoLN.numero_sorteo_ln.toString()]
    );

    console.log(`[PROCESAR-LN] Sorteos cerrados encontrados: ${sorteos.length}`);

    if (sorteos.length === 0) {
      console.log(`[PROCESAR-LN] No hay sorteos cerrados para procesar.`);
      await connection.commit();
      return { 
        success: true, 
        message: 'No hay sorteos cerrados para procesar' 
      };
    }

    let totalGanadores = 0;

    for (const sorteo of sorteos) {
      console.log(`\n[PROCESAR-LN] Procesando sorteo ID: ${sorteo.id_sorteo}, Nombre: "${sorteo.nombre_sorteo || 'Sin nombre'}"`);
      console.log(`[PROCESAR-LN] Premios disponibles: Primer: "${sorteo.primer_premio}", Segundo: "${sorteo.segundo_premio}"`);
      console.log(`[PROCESAR-LN] Precio boleto: ${sorteo.precio_boleto}, Colegio: ${sorteo.colegio_id}`);
      
      const digitos = sorteo.digitos_boleto;
      const ganadorPrimer = ultimosDigitos(resultadoLN.primer_premio_ln, digitos);
      const ganadorSegundo = ultimosDigitos(resultadoLN.segundo_premio_ln, digitos);

      console.log(`[PROCESAR-LN] Buscando ganadores (${digitos} dígitos):`);
      console.log(`  - Primer premio: número ${ganadorPrimer} gana: ${sorteo.primer_premio}`);
      console.log(`  - Segundo premio: número ${ganadorSegundo} gana: ${sorteo.segundo_premio}`);

      // Obtener boletos del sorteo CON el vendedor
      const [boletos] = await connection.query(
        `SELECT 
           b.id_boleto, 
           b.boleto, 
           b.comprador,
           b.id_vendedor,
           b.precio,
           u.nombre as nombre_vendedor
         FROM boletos b
         LEFT JOIN usuarios u ON b.id_vendedor = u.id_usuario
         WHERE b.id_sorteo = ?`,
        [sorteo.id_sorteo]
      );

      console.log(`[PROCESAR-LN] ${boletos.length} boletos en este sorteo`);

      // Mostrar primeros 3 boletos para depuración
      if (boletos.length > 0) {
        console.log(`[PROCESAR-LN] Muestra de boletos (primeros 3):`);
        boletos.slice(0, 3).forEach((b, i) => {
          const boletoFormateado = String(b.boleto).padStart(digitos, "0");
          console.log(`  ${i+1}. Boleto: ${b.boleto} -> ${boletoFormateado}, Comprador: ${b.comprador}, Vendedor: ${b.nombre_vendedor || 'N/A'}`);
        });
      }

      for (const boleto of boletos) {
        const numeroBoleto = String(boleto.boleto).padStart(digitos, "0");
        let premio = null;
        let tipoPremio = '';

        // Comparación exacta
        if (numeroBoleto === ganadorPrimer) {
          premio = sorteo.primer_premio;
          tipoPremio = 'Primer Premio';
          console.log(`\n[PROCESAR-LN] ¡¡¡COINCIDENCIA PRIMER PREMIO!!!`);
          console.log(`  Boleto: ${boleto.boleto} -> ${numeroBoleto}`);
          console.log(`  Buscado: ${ganadorPrimer}`);
          console.log(`  Premio: ${premio}`);
          console.log(`  Comprador: ${boleto.comprador}`);
          console.log(`  Vendedor: ${boleto.nombre_vendedor || 'N/A'}`);
        } else if (numeroBoleto === ganadorSegundo) {
          premio = sorteo.segundo_premio;
          tipoPremio = 'Segundo Premio';
          console.log(`\n[PROCESAR-LN] ¡¡¡COINCIDENCIA SEGUNDO PREMIO!!!`);
          console.log(`  Boleto: ${boleto.boleto} -> ${numeroBoleto}`);
          console.log(`  Buscado: ${ganadorSegundo}`);
          console.log(`  Premio: ${premio}`);
          console.log(`  Comprador: ${boleto.comprador}`);
          console.log(`  Vendedor: ${boleto.nombre_vendedor || 'N/A'}`);
        }

        if (!premio) continue;

        // Generar folio único
        const folio = `N${boleto.id_boleto}`;

        // Verificar si ya existe (por folio o por boleto en el mismo sorteo)
        const [existentes] = await connection.query(
          `SELECT id_ganador FROM ganadores WHERE folio = ? OR (boleto = ? AND fecha_sorteo = ?)`,
          [folio, numeroBoleto, sorteo.fecha]
        );

        if (existentes.length > 0) {
          console.log(`[PROCESAR-LN] Ganador ya registrado: ${folio}`);
          continue;
        }

        // Usar el precio del boleto individual o el precio general del sorteo
        const precioBoleto = boleto.precio || sorteo.precio_boleto;
        
        // Insertar ganador con la estructura CORRECTA de la tabla ganadores
        await connection.query(
          `INSERT INTO ganadores (
             folio, 
             boleto, 
             costo, 
             cliente, 
             premio,
             fecha_sorteo, 
             vendedor,
             estatus, 
             liquidado, 
             colegio_id,
             created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', 'no', ?, NOW())`,
          [
            folio,
            numeroBoleto,
            precioBoleto,
            boleto.comprador,
            premio,
            sorteo.fecha,
            boleto.nombre_vendedor || null,  // Usar nombre_vendedor para la columna 'vendedor'
            sorteo.colegio_id
          ]
        );

        totalGanadores++;
        console.log(`[PROCESAR-LN] ✓ REGISTRADO: ${tipoPremio} - ${folio} (${premio})`);
      }
    }

    await connection.commit();
    console.log(`\n[PROCESAR-LN] ✅ Procesamiento completado. Total ganadores registrados: ${totalGanadores}`);

    return {
      success: true,
      message: `Procesamiento completado. Se encontraron ${totalGanadores} ganadores.`
    };

  } catch (error) {
    console.error('[PROCESAR-LN] ❌ Error:', error);
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}