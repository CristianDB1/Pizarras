import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function PUT(request, { params }) {
    let connection;
    try {
        const { id } = params;
        const data = await request.json();
        
        const { 
            nombre, 
            logo_url, 
            configuracion, 
            estatus 
        } = data;
        
        console.log('✏️ Editando colegio ID:', id, 'Datos:', data);
        
        // Validar datos
        if (!nombre || !estatus) {
            throw new Error('Nombre y estatus son requeridos');
        }
        
        // Validar estatus permitido
        const estatusPermitidos = ['activo', 'inactivo'];
        if (!estatusPermitidos.includes(estatus)) {
            throw new Error('Estatus no válido. Use: activo o inactivo');
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar que el colegio existe
        const [colegioExiste] = await connection.query(
            `SELECT id_colegio FROM colegios WHERE id_colegio = ?`,
            [id]
        );
        
        if (colegioExiste.length === 0) {
            throw new Error('Colegio no encontrado');
        }
        
        // Actualizar colegio
        const [result] = await connection.query(
            `UPDATE colegios 
             SET nombre = ?, 
                 logo_url = ?, 
                 configuracion = ?, 
                 estatus = ?,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id_colegio = ?`,
            [
                nombre,
                logo_url || null,
                configuracion || '{}',
                estatus,
                id
            ]
        );
        
        // Obtener colegio actualizado
        const [colegioActualizado] = await connection.query(
            `SELECT * FROM colegios WHERE id_colegio = ?`,
            [id]
        );
        
        await connection.commit();
        
        console.log('✅ Colegio actualizado correctamente');
        
        return NextResponse.json({
            success: true,
            message: 'Colegio actualizado exitosamente',
            colegio: colegioActualizado[0],
            cambios: result.affectedRows
        });
        
    } catch (error) {
        console.error('❌ Error actualizando colegio:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al actualizar el colegio',
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