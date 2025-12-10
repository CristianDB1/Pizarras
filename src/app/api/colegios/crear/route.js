import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import fileUpload from "@/lib/fileUpload"; // Importar la utilidad
import path from 'path';

export async function POST(req) {
    let connection;
    try {
        const data = await req.json();
        const { 
            nombre, 
            logo_url, 
            configuracion, 
            admin_data,
            sorteo_data,
            logo_base64,    // Nuevo: logo en Base64
            logo_filename   // Nuevo: nombre del archivo
        } = data;

        console.log('📥 Datos recibidos para crear colegio:', { 
            nombre, 
            sorteo_data,
            admin_data: { 
                nombre: admin_data?.nombre,
                usuario: admin_data?.usuario,
                password: '***' 
            },
            tiene_logo_base64: !!logo_base64
        });

        // Validar datos requeridos
        if (!nombre || !admin_data?.nombre || !admin_data?.usuario || !admin_data?.password) {
            throw new Error('Faltan datos requeridos');
        }

        // Validar datos del sorteo
        if (!sorteo_data?.fecha || !sorteo_data?.cifras_sorteo) {
            throw new Error('Faltan datos requeridos para el sorteo inicial (fecha y cifras_sorteo)');
        }

        // Inicializar fileUpload
        await fileUpload.init();

        // Variable para guardar la URL del logo
        let finalLogoUrl = logo_url;

        // Procesar logo si viene en Base64
        if (logo_base64) {
            console.log('🖼️ Procesando logo en Base64...');
            const uploadResult = await fileUpload.saveBase64Image(
                logo_base64, 
                logo_filename || `${nombre.toLowerCase().replace(/\s+/g, '-')}-logo`
            );

            if (uploadResult.success) {
                finalLogoUrl = uploadResult.publicUrl;
                console.log('✅ Logo guardado en:', finalLogoUrl);
            } else {
                console.warn('⚠️ No se pudo guardar el logo:', uploadResult.error);
                // Continuar sin logo, usar el URL si existe
            }
        }

        // Obtener conexión para transacción
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Crear el colegio CON LOGO
        const [colegioResult] = await connection.query(
            `INSERT INTO colegios (nombre, logo_url, configuracion, create_by, estatus) 
             VALUES (?, ?, ?, NULL, 'activo')`,
            [nombre, finalLogoUrl || null, configuracion || '{}']
        );

        const colegioId = colegioResult.insertId;
        console.log('✅ Colegio creado con ID:', colegioId, 'Logo:', finalLogoUrl);

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

        const adminId = adminResult.insertId;
        console.log('✅ Administrador creado con ID:', adminId);

        // 4. Actualizar el colegio con el ID del creador
        await connection.query(
            `UPDATE colegios SET create_by = ? WHERE id_colegio = ?`,
            [adminId, colegioId]
        );

        // 5. Crear un sorteo inicial para el colegio
        let sorteoId = null;
        try {
            const config = configuracion ? JSON.parse(configuracion) : {};
            
            // Validar fecha
            const fechaSorteo = new Date(sorteo_data.fecha);
            const hoy = new Date();
            if (fechaSorteo <= hoy) {
                throw new Error('La fecha del sorteo debe ser futura');
            }

            // OBTENER EL ÚLTIMO ID DE SORTEO PARA NÚMERO GLOBAL
            const [ultimoSorteo] = await connection.query(
                `SELECT id_sorteo FROM sorteo ORDER BY id_sorteo DESC LIMIT 1`
            );

            // Generar número de sorteo GLOBAL
            let numeroSorteoGlobal;
            if (ultimoSorteo.length > 0) {
                // Siguiente número global basado en el último ID
                const siguienteNumeroGlobal = ultimoSorteo[0].id_sorteo + 1;
                numeroSorteoGlobal = `SORTEO-${siguienteNumeroGlobal}`;
            } else {
                // Primer sorteo del sistema
                numeroSorteoGlobal = 'SORTEO-1';
            }

            console.log(`🎟️ Creando sorteo con número global: ${numeroSorteoGlobal}`);

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
                    colegioId, 
                    sorteo_data.nombre || `Sorteo Inicial - ${nombre}`, 
                    sorteo_data.fecha,
                    '', // Vacío para admin
                    '', // Vacío para admin
                    'activo',
                    numeroSorteoGlobal, // ← Número global único
                    sorteo_data.precio_boleto || config.precio_boleto || 100,
                    sorteo_data.comision_vendedor || config.comision_vendedor || 10,
                    sorteo_data.cifras_sorteo || config.cifras_sorteo || 5
                ]
            );

            sorteoId = sorteoResult.insertId;
            
            // Obtener el número real que quedó (por si hay auto-increment gaps)
            const [sorteoCreado] = await connection.query(
                `SELECT numero_sorteo, id_sorteo FROM sorteo WHERE id_sorteo = ?`,
                [sorteoId]
            );
            
            const numeroFinal = sorteoCreado[0]?.numero_sorteo || numeroSorteoGlobal;
            const idSorteoCreado = sorteoCreado[0]?.id_sorteo;
            
            console.log('✅ Sorteo creado:');
            console.log('   ID:', sorteoId);
            console.log('   Número global:', numeroFinal);
            console.log('   ID en BD:', idSorteoCreado);

        } catch (configError) {
            console.error('❌ Error creando sorteo inicial:', configError);
            throw new Error(`Error al crear sorteo inicial: ${configError.message}`);
        }

        // Confirmar transacción
        await connection.commit();

        return NextResponse.json({
            success: true,
            colegio_id: colegioId,
            admin_id: adminId,
            sorteo_id: sorteoId,
            logo_url: finalLogoUrl,
            credenciales: {
                usuario: admin_data.usuario,
                password: admin_data.password
            },
            sorteo_info: {
                fecha_limite: sorteo_data.fecha,
                cifras_sorteo: sorteo_data.cifras_sorteo,
                numero_sorteo: `SI-001`
            },
            message: 'Colegio, administrador y sorteo inicial creados exitosamente'
        });

    } catch (error) {
        console.error('❌ Error creando colegio:', error);
        
        // Revertir transacción si hay conexión
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('❌ Error en rollback:', rollbackError);
            }
        }
        
        return NextResponse.json(
            { 
                success: false,
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