import { NextResponse } from 'next/server'
import pool from '@/db/MysqlConection'

export async function GET(request, { params }) {
    try {
        const { colegioId } = params

        if (!colegioId) {
            return NextResponse.json(
                { error: 'colegioId requerido' },
                { status: 400 }
            )
        }

        const [rows] = await pool.query(`
            SELECT 
                COALESCE(SUM(precio), 0) AS total_liquidado
            FROM boletos
            WHERE estado_pago = 'pagado'
            AND colegio_id = ?
        `, [colegioId])

        return NextResponse.json({
            total_liquidado: rows[0].total_liquidado
        })

    } catch (error) {
        console.error('❌ Error total liquidado:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
