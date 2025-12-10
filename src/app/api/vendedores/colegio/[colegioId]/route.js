import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { colegioId } = params;
        
        console.log('👥 Obteniendo vendedores del colegio:', colegioId);
        
        // Validar que el colegio existe
        const [colegioExiste] = await pool.query(
            `SELECT id_colegio FROM colegios WHERE id_colegio = ?`,
            [colegioId]
        );
        
        if (colegioExiste.length === 0) {
            return NextResponse.json(
                { error: 'Colegio no encontrado' },
                { status: 404 }
            );
        }
        
        // Obtener vendedores del colegio
        const [vendedores] = await pool.query(
            `SELECT 
                id_vendedor,
                nombre,
                usuario,
                fecha_ingreso,
                domicilio,
                telefono,
                comision,
                estatus,
                colegio_id,
                rol,
                created_at
             FROM vendedores 
             WHERE colegio_id = ?
             ORDER BY nombre ASC`,
            [colegioId]
        );
        
        return NextResponse.json(vendedores);
        
    } catch (error) {
        console.error('❌ Error obteniendo vendedores:', error);
        return NextResponse.json(
            { 
                error: 'Error interno del servidor',
                details: error.message 
            },
            { status: 500 }
        );
    }
}