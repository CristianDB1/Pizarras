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
            digitos_boleto = 5
        } = data;
        
        console.log('🎟️ Creando nuevo sorteo:', data);
        
        // Validaciones
        if (!colegio_id || !nombre || !fecha) {
            throw new Error('Faltan datos requeridos: colegio_id, nombre, fecha');
        }
        
        // Validar que el colegio existe
        const [colegioExiste] = await pool.query(
            `SELECT id_colegio, nombre FROM colegios WHERE id_colegio = ? AND estatus = 'activo'`,
            [colegio_id]
        );
        
        if (colegioExiste.length === 0) {
            throw new Error('Colegio no encontrado o inactivo');
        }
        
        // Validar fecha futura
        const fechaSorteo = new Date(fecha);
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
        
        // Obtener el último número de sorteo (global)
        const [ultimoSorteo] = await connection.query(
            `SELECT id_sorteo FROM sorteo ORDER BY id_sorteo DESC LIMIT 1`
        );
        
        // Generar número de sorteo global único
        let numeroSorteoGlobal;
        if (ultimoSorteo.length > 0) {
            const siguienteNumeroGlobal = ultimoSorteo[0].id_sorteo + 1;
            numeroSorteoGlobal = `SORTEO-${siguienteNumeroGlobal}`;
        } else {
            numeroSorteoGlobal = 'SORTEO-1';
        }
        
        // Crear el nuevo sorteo
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
                fecha,
                '', // primer_premio vacío
                '', // segundo_premio vacío
                'activo',
                numeroSorteoGlobal,
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
        
        console.log('✅ Sorteo creado:', numeroSorteoGlobal);
        
        return NextResponse.json({
            success: true,
            message: 'Sorteo creado exitosamente',
            sorteo: sorteoCreado[0],
            numero_sorteo: numeroSorteoGlobal
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