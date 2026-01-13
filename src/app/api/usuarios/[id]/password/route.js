// app/api/usuarios/[id]/password/route.js
import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { id } = params;
        
        //console.log('🔐 Solicitando contraseña para usuario ID:', id);
        
        // Verificar que el usuario existe
        const [usuario] = await pool.query(
            `SELECT id_usuario, nombre, usuario, contra as password 
             FROM usuarios 
             WHERE id_usuario = ?`,
            [id]
        );
        
        //console.log('🔍 Resultado de la consulta:', usuario);
        
        if (usuario.length === 0) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Usuario no encontrado'
                },
                { status: 404 }
            );
        }
        
        // Devolver la contraseña directamente
        return NextResponse.json({
            success: true,
            password: usuario[0].password || '',
            usuario: {
                id: usuario[0].id_usuario,
                nombre: usuario[0].nombre,
                usuario: usuario[0].usuario
            }
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo contraseña:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Error obteniendo contraseña',
                details: error.message
            },
            { status: 500 }
        );
    }
}