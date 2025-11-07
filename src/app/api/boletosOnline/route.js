import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const data = await req.json();
    const { boletos, telefono, metodo_pago } = data;

    //console.log("📦 Datos recibidos:", { boletos, telefono, metodo_pago });

    if (!Array.isArray(boletos) || boletos.length === 0) {
      return NextResponse.json(
        { error: "No se enviaron boletos válidos" },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. INSERTAR en boletos_online
      const sqlInsert = `
        INSERT INTO boletos_online
        (id_sorteo, numero_boleto, costo, comprador, telefono, metodo_pago, tipo_sorteo, fecha_sorteo, estatus, fecha_compra)
        VALUES ?
      `;

      const values = boletos.map((b) => [
        b.idSorteo,                           
        b.ticketNumber,                       
        b.prizebox,                          
        b.name,                             
        telefono || "",                      
        metodo_pago || "",                    
        b.tipoSorteo,                         
        b.fecha.split("T")[0],                
        "pendiente",                          
        new Date().toISOString().slice(0, 19).replace("T", " ")
      ]);

      //console.log("🔍 Valores a insertar:", values);

      const [result] = await connection.query(sqlInsert, [values]);
      //console.log("✅ Boletos insertados, resultado:", result);

      // 2. ACTUALIZAR TOPES con formato correcto
      for (const boleto of boletos) {
        const numeroBoleto = parseInt(boleto.ticketNumber); // Convertir a número (elimina ceros)
        const monto = boleto.prizebox;
        const fechaBoleto = boleto.fecha.split("T")[0];
        
        // CONVERTIR a formato correcto: "2025-11-07" → "07/11/2025"
        const [ano, mes, dia] = fechaBoleto.split('-');
        const fechaTope = `${dia}/${mes}/${ano}`;
        
        /*console.log("🔄 Actualizando tope con formato correcto:", { 
          numeroBoleto, 
          monto, 
          fechaTope 
        });*/

        const sqlUpdateTope = `
          UPDATE topes 
          SET Cantidad = Cantidad + ? 
          WHERE Numero = ? AND Fecha_sorteo = ?
        `;
        
        const [updateResult] = await connection.query(sqlUpdateTope, [
          monto,
          numeroBoleto, // Número sin ceros
          fechaTope // Formato DD/MM/YYYY con barras
        ]);

        /*console.log("📊 Resultado actualización tope:", {
          affectedRows: updateResult.affectedRows,
          changedRows: updateResult.changedRows,
          numeroBoleto,
          fechaTope,
          monto
        });*/

        if (updateResult.affectedRows === 0) {
          console.warn("⚠️ No se encontró tope para actualizar:", { 
            numeroBoleto, 
            fechaTope 
          });
        } else {
          console.log("✅ Tope actualizado exitosamente");
        }
      }

      await connection.commit();

      // Recuperar boletos insertados
      const idsInsertados = result.insertId;
      const [boletosGuardados] = await connection.query(
        `SELECT * FROM boletos_online WHERE id_boleto_online >= ? ORDER BY id_boleto_online DESC LIMIT ?`,
        [idsInsertados, boletos.length]
      );

      return NextResponse.json({
        success: true,
        message: "Boletos guardados y topes actualizados",
        boletos: boletosGuardados,
      });

    } catch (error) {
      await connection.rollback();
      console.error("❌ Error en transacción:", error);
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("💥 Error en /api/boletosOnline:", error);
    return NextResponse.json(
      { error: "Error al guardar boletos online", detalle: error.message },
      { status: 500 }
    );
  }
}