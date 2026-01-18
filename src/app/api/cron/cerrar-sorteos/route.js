import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const [result] = await pool.query(`
            UPDATE sorteo
            SET estatus = 'cerrado'
            WHERE fecha <= NOW()
            AND estatus = 'activo'
        `);

        return NextResponse.json({
            ok: true,
            sorteosCerrados: result.affectedRows
        });
    } catch (error) {
        console.error("Error cron sorteos:", error);
        return NextResponse.json(
            { error: "Error cerrando sorteos" },
            { status: 500 }
        );
    }
}
