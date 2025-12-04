import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(req) {
    let connection;
    try {
        const data = await req.json();
        const { 
            nombre, 
            logo_url, 
            configuracion, 
            admin_data 
        } = data;

        console.log('📥 Datos recibidos para crear colegio:', { 
            nombre, 
            admin_data: { 
                nombre: admin_data.nombre,
                usuario: admin_data.usuario,
                password: '***' 
            } 
        });

        // Obtener conexión para transacción
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Crear el colegio
        const [colegioResult] = await connection.query(
            `INSERT INTO colegios (nombre, logo_url, configuracion, create_by, estatus) 
             VALUES (?, ?, ?, NULL, 'activo')`,
            [nombre, logo_url || null, configuracion]
        );

        const colegioId = colegioResult.insertId;
        console.log('✅ Colegio creado con ID:', colegioId);

        // 2. Verificar si el usuario ya existe
        const [existingUser] = await connection.query(
            `SELECT id_usuario FROM usuarios WHERE usuario = ?`,
            [admin_data.usuario]
        );

        if (existingUser.length > 0) {
            throw new Error('El usuario ya existe en el sistema');
        }

        // 3. Crear el administrador del colegio
        const [adminResult] = await connection.query(
            `INSERT INTO usuarios (nombre, usuario, contra, estatus, colegio_id, rol) 
             VALUES (?, ?, ?, 'activo', ?, 'admin_colegio')`,
            [admin_data.nombre, admin_data.usuario, admin_data.password, colegioId]
        );

        console.log('✅ Administrador creado con ID:', adminResult.insertId);

        // 4. Actualizar el colegio con el ID del creador
        await connection.query(
            `UPDATE colegios SET create_by = ? WHERE id_colegio = ?`,
            [adminResult.insertId, colegioId]
        );

        // 5. Crear un sorteo inicial para el colegio
        const config = JSON.parse(configuracion);
        const nombreSorteo = `Sorteo Inicial ${new Date().getFullYear()}`;
        
        const [sorteoResult] = await connection.query(
            `INSERT INTO sorteo (colegio_id, nombre, fecha, primer_premio, segundo_premio, 
             estatus, numero_sorteo, precio_boleto, comision_vendedor, digitos_boleto) 
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), 'Premio Principal', 'Premio Secundario', 
             'activo', 'SI-001', ?, ?, ?)`,
            [colegioId, nombreSorteo, config.precio_boleto, config.comision_vendedor, config.cifras_sorteo]
        );

        console.log('✅ Sorteo inicial creado con ID:', sorteoResult.insertId);

        // Confirmar transacción
        await connection.commit();

        return NextResponse.json({
            success: true,
            colegio_id: colegioId,
            admin_id: adminResult.insertId,
            sorteo_id: sorteoResult.insertId,
            credenciales: {
                usuario: admin_data.usuario,
                password: admin_data.password
            },
            message: 'Colegio creado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error creando colegio:', error);
        
        // Revertir transacción si hay conexión
        if (connection) {
            await connection.rollback();
        }
        
        return NextResponse.json(
            { 
                error: 'Error al crear el colegio',
                details: error.message 
            },
            { status: 500 }
        );
    } finally {
        // Liberar conexión
        if (connection) {
            connection.release();
        }
    }
}