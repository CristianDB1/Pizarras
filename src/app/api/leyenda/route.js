import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(req, res) {
    // 1. DURANTE EL BUILD, DEVUELVE UN VALOR POR DEFECTO
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json({ leyenda1: "" });
    }
    
    let sql = `SELECT leyenda1 FROM configuracion`;
    try {
        let result = await pool.query(sql);
        
        // 2. Asegúrate de que el resultado sea válido
        if (result && result[0] && result[0][0]) {
            return NextResponse.json(result[0][0]);
        } else {
            // Si no hay datos, devuelve un objeto por defecto
            return NextResponse.json({ leyenda1: "" });
        }
        
    } catch (error) {
        //console.log("Error en API /leyenda:", error);
        
        // 3. ¡IMPORTANTE! Siempre devuelve una respuesta en el catch
        return NextResponse.json(
            { leyenda1: "", error: "Error en servidor" },
            { status: 500 }
        );
    }
}