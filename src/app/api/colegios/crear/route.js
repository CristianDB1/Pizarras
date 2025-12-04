import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(req) {
    try {
        const data = await req.json();
        const { 
            nombre, 
            logo_url, 
            configuracion, 
            admin_data 
        } = data;

        console.log('📥 Datos recibidos para crear colegio:', { nombre, admin_data: { ...admin_data, password: '***' } });

        // 1. Crear el colegio
        const [colegioResult] = await pool.query(
            `INSERT INTO colegios (nombre, logo_url, configuracion, create_by, estatus) 
             VALUES (?, ?, ?, NULL, 'activo')`,
            [nombre, logo_url || null, configuracion]
        );

        const colegioId = colegioResult.insertId;
        console.log('✅ Colegio creado con ID:', colegioId);

        // 2. Crear el administrador del colegio
        const [adminResult] = await pool.query(
            `INSERT INTO usuarios (nombre, usuario, contra, estatus, colegio_id, rol) 
             VALUES (?, ?, ?, 'activo', ?, 'admin_colegio')`,
            [admin_data.nombre, admin_data.email, admin_data.password, colegioId]
        );

        console.log('✅ Administrador creado con ID:', adminResult.insertId);

        // 3. Crear un sorteo inicial para el colegio
        const config = JSON.parse(configuracion);
        const nombreSorteo = `Sorteo Inicial ${new Date().getFullYear()}`;
        
        const [sorteoResult] = await pool.query(
            `INSERT INTO sorteo (colegio_id, nombre, fecha, primer_premio, segundo_premio, 
             estatus, numero_sorteo, precio_boleto, comision_vendedor, digitos_boleto) 
             VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), 'Premio Principal', 'Premio Secundario', 
             'activo', 'SI-001', ?, ?, ?)`,
            [colegioId, nombreSorteo, config.precio_boleto, config.comision_vendedor, config.cifras_sorteo]
        );

        console.log('✅ Sorteo inicial creado con ID:', sorteoResult.insertId);

        return NextResponse.json({
            success: true,
            colegio_id: colegioId,
            admin_id: adminResult.insertId,
            sorteo_id: sorteoResult.insertId,
            message: 'Colegio creado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error creando colegio:', error);
        
        // Si hay error, revertir transacción (opcional, depende de tu motor de BD)
        return NextResponse.json(
            { 
                error: 'Error al crear el colegio',
                details: error.message 
            },
            { status: 500 }
        );
    }
}