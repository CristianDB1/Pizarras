import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import fs from "fs/promises";
import path from "path";

/**
 * Guarda una imagen base64 en /public/uploads/logos/colegios
 * y retorna la URL pública
 */
async function saveBase64Image(base64, filename) {
    const matches = base64.match(/^data:(image\/\w+);base64,(.+)$/);

    if (!matches) {
        throw new Error("Formato Base64 inválido");
    }

    const extension = matches[1].split("/")[1];
    const buffer = Buffer.from(matches[2], "base64");

    const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads",
        "logos",
        "colegios"
    );

    // Crear carpeta si no existe
    await fs.mkdir(uploadDir, { recursive: true });

    const finalName = `${filename}-${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, finalName);

    await fs.writeFile(filePath, buffer);

    // URL pública (MUY IMPORTANTE)
    return `/uploads/logos/colegios/${finalName}`;
}

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
            logo_base64,
            logo_filename
        } = data;

        // Validaciones básicas
        if (!nombre || !admin_data?.nombre || !admin_data?.usuario || !admin_data?.password) {
            throw new Error("Faltan datos obligatorios del colegio o administrador");
        }

        if (!sorteo_data?.fecha || !sorteo_data?.cifras_sorteo) {
            throw new Error("Datos del sorteo incompletos");
        }

        let finalLogoUrl = logo_url || null;

        // Guardar logo si viene en base64
        if (logo_base64) {
            const safeName = (logo_filename || nombre)
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "");

            finalLogoUrl = await saveBase64Image(logo_base64, safeName);
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Crear colegio
        const [colegioResult] = await connection.query(
            `INSERT INTO colegios (nombre, logo_url, configuracion, create_by, estatus)
             VALUES (?, ?, ?, NULL, 'activo')`,
            [nombre, finalLogoUrl, configuracion || '{}']
        );

        const colegioId = colegioResult.insertId;

        // 2. Validar usuario duplicado
        const [existingUser] = await connection.query(
            `SELECT id_usuario FROM usuarios WHERE usuario = ?`,
            [admin_data.usuario]
        );

        if (existingUser.length > 0) {
            throw new Error("El usuario ya existe");
        }

        // 3. Crear admin
        const [adminResult] = await connection.query(
            `INSERT INTO usuarios (nombre, usuario, contra, estatus, colegio_id, rol)
             VALUES (?, ?, ?, 'activo', ?, 'admin_colegio')`,
            [admin_data.nombre, admin_data.usuario, admin_data.password, colegioId]
        );

        const adminId = adminResult.insertId;

        // 4. Actualizar creador
        await connection.query(
            `UPDATE colegios SET create_by = ? WHERE id_colegio = ?`,
            [adminId, colegioId]
        );

        // 5. Crear sorteo inicial
        const [sorteoResult] = await connection.query(
            `INSERT INTO sorteo (
                colegio_id,
                nombre,
                fecha,
                estatus,
                numero_sorteo,
                precio_boleto,
                comision_vendedor,
                digitos_boleto
            ) VALUES (?, ?, ?, 'activo', ?, ?, ?, ?)`,
            [
                colegioId,
                sorteo_data.nombre || `Sorteo Inicial - ${nombre}`,
                sorteo_data.fecha,
                sorteo_data.numero_sorteo,
                sorteo_data.precio_boleto || 100,
                sorteo_data.comision_vendedor || 10,
                sorteo_data.cifras_sorteo
            ]
        );

        await connection.commit();

        return NextResponse.json({
            success: true,
            colegio_id: colegioId,
            admin_id: adminId,
            sorteo_id: sorteoResult.insertId,
            logo_url: finalLogoUrl
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("❌ Error creando colegio:", error);

        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );

    } finally {
        if (connection) connection.release();
    }
}
