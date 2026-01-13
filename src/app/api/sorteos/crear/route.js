import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(request) {
    let connection;
    try {
        const data = await request.json();
        
        const { 
            colegio_id,
            nombre,
            fecha,
            precio_boleto = 100,
            comision_vendedor = 10,
            digitos_boleto = 5,
            numero_sorteo
        } = data;
        
        console.log('🎟️ Creando nuevo sorteo:', data);
        
        // Validaciones
        if (!colegio_id || !nombre || !fecha) {
            throw new Error('Faltan datos requeridos: colegio_id, nombre, fecha');
        }
        
        // Validar que el número de sorteo sea requerido
        if (!numero_sorteo) {
            throw new Error('El número de sorteo es requerido');
        }
        
        // Validar formato del número de sorteo
        const numeroSorteoRegex = /^[A-Za-z0-9-]+$/;
        if (!numeroSorteoRegex.test(numero_sorteo)) {
            throw new Error('El número de sorteo solo puede contener letras, números y guiones');
        }
        
        // Validar que el número de sorteo sea único
        const [sorteoExistente] = await pool.query(
            `SELECT id_sorteo FROM sorteo WHERE numero_sorteo = ?`,
            [numero_sorteo]
        );
        
        if (sorteoExistente.length > 0) {
            throw new Error('El número de sorteo ya está en uso');
        }
        
        // Validar que el colegio existe
        const [colegioExiste] = await pool.query(
            `SELECT id_colegio, nombre FROM colegios WHERE id_colegio = ? AND estatus = 'activo'`,
            [colegio_id]
        );
        
        if (colegioExiste.length === 0) {
            throw new Error('Colegio no encontrado o inactivo');
        }
        
        // Normalizar fecha
        let fechaNormalizada = fecha;

        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            fechaNormalizada = `${fecha}T12:00:00`;
        }

        // Validar fecha futura
        const fechaSorteo = new Date(fechaNormalizada);
        const hoy = new Date();

        if (fechaSorteo <= hoy) {
            throw new Error('La fecha del sorteo debe ser futura');
        }

        // Validar dígitos
        if (digitos_boleto < 1 || digitos_boleto > 10) {
            throw new Error('Los dígitos del boleto deben estar entre 1 y 10');
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Crear el nuevo sorteo CON el número manual
        const [sorteoResult] = await connection.query(
            `INSERT INTO sorteo (
                colegio_id,
                nombre,
                fecha,
                primer_premio,
                segundo_premio,
                estatus,
                numero_sorteo,
                precio_boleto,
                comision_vendedor,
                digitos_boleto
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                colegio_id,
                nombre,
                fechaNormalizada,
                '', 
                '', 
                'activo',
                numero_sorteo,
                precio_boleto,
                comision_vendedor,
                digitos_boleto
            ]
        );
        
        const sorteoId = sorteoResult.insertId;
        
        // Obtener sorteo creado
        const [sorteoCreado] = await connection.query(
            `SELECT * FROM sorteo WHERE id_sorteo = ?`,
            [sorteoId]
        );
        
        await connection.commit();
        
        console.log('✅ Sorteo creado:', numero_sorteo);
        
        return NextResponse.json({
            success: true,
            message: 'Sorteo creado exitosamente',
            sorteo: sorteoCreado[0],
            numero_sorteo: numero_sorteo
        });
        
    } catch (error) {
        console.error('❌ Error creando sorteo:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al crear el sorteo',
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