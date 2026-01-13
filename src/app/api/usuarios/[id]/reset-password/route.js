import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function PUT(request, { params }) {
    let connection;
    try {
        const { id } = params;
        const { password } = await request.json();
        
        if (!password || password.length < 6) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'La contraseña debe tener al menos 6 caracteres' 
                },
                { status: 400 }
            );
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar que el usuario existe y es admin_colegio
        const [usuarioExiste] = await connection.query(
            `SELECT id_usuario, rol FROM usuarios WHERE id_usuario = ?`,
            [id]
        );
        
        if (usuarioExiste.length === 0) {
            throw new Error('Usuario no encontrado');
        }
        
        if (usuarioExiste[0].rol !== 'admin_colegio') {
            throw new Error('Solo se pueden restablecer contraseñas de administradores de colegio');
        }
        
        // Actualizar contraseña
        const [result] = await connection.query(
            `UPDATE usuarios SET contra = ? WHERE id_usuario = ?`,
            [password, id]
        );
        
        await connection.commit();
        
        // Obtener datos actualizados del usuario
        const [usuarioActualizado] = await connection.query(
            `SELECT id_usuario, nombre, usuario, estatus, colegio_id FROM usuarios WHERE id_usuario = ?`,
            [id]
        );
        
        return NextResponse.json({
            success: true,
            message: 'Contraseña restablecida exitosamente',
            usuario: usuarioActualizado[0]
        });
        
    } catch (error) {
        console.error('❌ Error restableciendo contraseña:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al restablecer la contraseña',
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