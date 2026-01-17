import { NextResponse } from 'next/server'
import pool from '@/db/MysqlConection'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const colegioId = searchParams.get('colegioId')

    if (!id || !colegioId) {
      return NextResponse.json(
        { message: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const [rows] = await pool.query(
      `SELECT 
          id_vendedor,
          usuario,
          contrasena,
          rol,
          estatus
       FROM vendedores
       WHERE id_vendedor = ?
         AND colegio_id = ?
       LIMIT 1`,
      [id, colegioId]
    )

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(rows[0])

  } catch (error) {
    console.error('Error obteniendo credenciales del vendedor:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
