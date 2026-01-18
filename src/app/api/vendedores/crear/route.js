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

        // Validaciones básicas
        if (!nombre?.trim() || !usuario?.trim() || !colegio_id) {
            return NextResponse.json(
                { success: false, error: 'Nombre, usuario y colegio son obligatorios' },
                { status: 400 }
            );
        }

        // Verificar colegio
        const [colegioExiste] = await pool.query(
            `SELECT id_colegio 
             FROM colegios 
             WHERE id_colegio = ? AND estatus = 'activo'`,
            [colegio_id]
        );

        if (colegioExiste.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Colegio no encontrado o inactivo' },
                { status: 404 }
            );
        }

        // 🔒 Verificar usuario duplicado
        const [usuarioExiste] = await pool.query(
            `SELECT id_vendedor 
            FROM vendedores 
            WHERE usuario = ?`,
            [usuario.trim()]
        );

        if (usuarioExiste.length > 0) {
            return NextResponse.json(
                { success: false, error: 'El nombre de usuario ya está en uso' },
                { status: 409 }
            );
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
                nombre.trim(),
                usuario.trim(),
                contrasena || '',
                domicilio || null,
                telefono || null,
                comision ?? 10,
                estatus || 'activo',
                rol || 'vendedor',
                colegio_id
            ]
        );

        const [vendedorCreado] = await connection.query(
            `SELECT * FROM vendedores WHERE id_vendedor = ?`,
            [result.insertId]
        );

        await connection.commit();

        return NextResponse.json({
            success: true,
            message: 'Vendedor creado exitosamente',
            vendedor: vendedorCreado[0]
        });

    } catch (error) {
        console.error('❌ Error creando vendedor:', error);

        if (connection) {
            await connection.rollback();
        }

        return NextResponse.json(
            { success: false, error: 'Error interno al crear el vendedor' },
            { status: 500 }
        );
    } finally {
        if (connection) {
            connection.release();
        }
    }
}
