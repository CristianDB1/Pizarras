// app/api/usuarios/[id]/editar/route.js
import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function PUT(request, { params }) {
    let connection;
    try {
        const { id } = params;
        const data = await request.json();
        
        const { 
            nombre,
            usuario,
            estatus
        } = data;
        
        //console.log('✏️ Editando usuario ID:', id, 'Datos:', data);
        
        if (!nombre || !usuario) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Nombre y usuario son requeridos' 
                },
                { status: 400 }
            );
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar que el usuario existe y es admin_colegio
        const [usuarioExiste] = await connection.query(
            `SELECT id_usuario, rol, usuario as usuario_actual FROM usuarios WHERE id_usuario = ?`,
            [id]
        );
        
        if (usuarioExiste.length === 0) {
            throw new Error('Usuario no encontrado');
        }
        
        if (usuarioExiste[0].rol !== 'admin_colegio') {
            throw new Error('Solo se pueden editar administradores de colegio');
        }
        
        // Verificar si el nuevo usuario ya existe (si se está cambiando)
        if (usuario !== usuarioExiste[0].usuario_actual) {
            const [usuarioDuplicado] = await connection.query(
                `SELECT id_usuario FROM usuarios WHERE usuario = ? AND id_usuario != ?`,
                [usuario, id]
            );
            
            if (usuarioDuplicado.length > 0) {
                throw new Error(`El usuario "${usuario}" ya existe en el sistema`);
            }
        }
        
        // Validar estatus
        if (estatus && !['activo', 'inactivo'].includes(estatus)) {
            throw new Error('Estatus no válido. Use: activo o inactivo');
        }
        
        // Actualizar usuario
        const [result] = await connection.query(
            `UPDATE usuarios 
            SET nombre = ?,
                usuario = ?,
                estatus = COALESCE(?, estatus)
            WHERE id_usuario = ?`,
            [
                nombre,
                usuario,
                estatus || null,
                id
            ]
        );
        
        await connection.commit();
        
        // Obtener usuario actualizado
        const [usuarioActualizado] = await connection.query(
            `SELECT 
                u.id_usuario, 
                u.nombre, 
                u.usuario, 
                u.estatus, 
                u.rol,
                u.colegio_id,
                u.created_at,
                c.nombre as colegio_nombre
            FROM usuarios u
            LEFT JOIN colegios c ON u.colegio_id = c.id_colegio
            WHERE u.id_usuario = ?`,
            [id]
        );
        
        return NextResponse.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            usuario: usuarioActualizado[0]
        });
        
    } catch (error) {
        console.error('❌ Error actualizando usuario:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al actualizar el usuario',
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