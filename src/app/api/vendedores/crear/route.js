import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(request) {
    let connection;
    try {
        const data = await request.json();
        
        const { 
            nombre,
            usuario,
            contrasena,
            domicilio,
            telefono,
            comision,
            estatus,
            rol,
            colegio_id
        } = data;
        
        //console.log('👥 Creando nuevo vendedor:', { nombre, usuario, colegio_id });
        
        // Validaciones
        if (!nombre || !usuario || !colegio_id) {
            throw new Error('Faltan datos requeridos: nombre, usuario, colegio_id');
        }
        
        // Verificar que el colegio existe
        const [colegioExiste] = await pool.query(
            `SELECT id_colegio FROM colegios WHERE id_colegio = ? AND estatus = 'activo'`,
            [colegio_id]
        );
        
        if (colegioExiste.length === 0) {
            throw new Error('Colegio no encontrado o inactivo');
        }
        
        // Verificar si el usuario ya existe en este colegio
        const [usuarioExiste] = await pool.query(
            `SELECT id_vendedor FROM vendedores WHERE usuario = ? AND colegio_id = ?`,
            [usuario, colegio_id]
        );
        
        if (usuarioExiste.length > 0) {
            throw new Error('El usuario ya existe en este colegio');
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Crear vendedor
        const [result] = await connection.query(
            `INSERT INTO vendedores (
                nombre,
                usuario,
                contrasena,
                domicilio,
                telefono,
                comision,
                estatus,
                rol,
                colegio_id,
                fecha_ingreso
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                nombre,
                usuario,
                contrasena || '', // En producción deberías encriptar la contraseña
                domicilio || null,
                telefono || null,
                comision || 10,
                estatus || 'activo',
                rol || 'vendedor',
                colegio_id
            ]
        );
        
        const vendedorId = result.insertId;
        
        // Obtener vendedor creado
        const [vendedorCreado] = await connection.query(
            `SELECT * FROM vendedores WHERE id_vendedor = ?`,
            [vendedorId]
        );
        
        await connection.commit();
        
        //console.log('✅ Vendedor creado:', vendedorId);
        
        return NextResponse.json({
            success: true,
            message: 'Vendedor creado exitosamente',
            vendedor: vendedorCreado[0]
        });
        
    } catch (error) {
        console.error('❌ Error creando vendedor:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al crear el vendedor',
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