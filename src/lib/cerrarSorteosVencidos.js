import pool from "@/db/MysqlConection";

export async function cerrarSorteosVencidos() {
    await pool.query(`
        UPDATE sorteo
        SET estatus = 'cerrado'
        WHERE fecha <= NOW()
        AND estatus = 'activo'
    `);
}
