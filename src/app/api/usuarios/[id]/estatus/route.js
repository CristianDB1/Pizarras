import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function PUT(request, { params }) {
    let connection;
    try {
        const { id } = params;
        const { estatus } = await request.json();
        
        if (!estatus || !['activo', 'inactivo'].includes(estatus)) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Estatus no válido. Use: activo o inactivo' 
                },
                { status: 400 }
            );
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar que el usuario existe y es admin_colegio
        const [usuarioExiste] = await connection.query(
            `SELECT id_usuario, nombre, rol FROM usuarios WHERE id_usuario = ?`,
            [id]
        );
        
        if (usuarioExiste.length === 0) {
            throw new Error('Usuario no encontrado');
        }
        
        if (usuarioExiste[0].rol !== 'admin_colegio') {
            throw new Error('Solo se puede cambiar estatus de administradores de colegio');
        }
        
        // Actualizar estatus
        const [result] = await connection.query(
            `UPDATE usuarios SET estatus = ? WHERE id_usuario = ?`,
            [estatus, id]
        );
        
        await connection.commit();
        
        return NextResponse.json({
            success: true,
            message: `Administrador ${estatus === 'activo' ? 'activado' : 'desactivado'} exitosamente`,
            cambios: result.affectedRows,
            usuario: {
                id: usuarioExiste[0].id_usuario,
                nombre: usuarioExiste[0].nombre,
                estatus: estatus
            }
        });
        
    } catch (error) {
        console.error('❌ Error cambiando estatus:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
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