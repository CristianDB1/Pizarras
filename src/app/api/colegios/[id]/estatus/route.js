import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function PATCH(request, { params }) {
    let connection;
    try {
        const { id } = params;
        const { estatus } = await request.json();
        
        // Validar estatus
        if (!estatus) {
            throw new Error('Estatus es requerido');
        }
        
        const estatusPermitidos = ['activo', 'inactivo'];
        if (!estatusPermitidos.includes(estatus)) {
            throw new Error('Estatus no válido. Use: activo o inactivo');
        }
        
        connection = await pool.getConnection();
        
        // Actualizar solo el estatus
        const [result] = await connection.query(
            `UPDATE colegios 
             SET estatus = ?
             WHERE id_colegio = ?`,
            [estatus, id]
        );
        
        if (result.affectedRows === 0) {
            throw new Error('Colegio no encontrado');
        }
        
        return NextResponse.json({
            success: true,
            message: `Colegio ${estatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`
        });
        
    } catch (error) {
        console.error('❌ Error cambiando estatus:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al cambiar el estatus',
                details: error.message 
            },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}