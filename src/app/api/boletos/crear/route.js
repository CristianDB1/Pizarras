import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import QRCode from "qrcode";

export async function POST(request) {
    let connection;
    
    try {
        const data = await request.json();
        const {
            id_sorteo,
            id_vendedor,
            numero_boleto,
            comprador = '',
            colegio_id
        } = data;
        
        console.log('🔄 Creando boleto:', { id_sorteo, numero_boleto, colegio_id });
        
        // Validaciones básicas
        if (!id_sorteo || !id_vendedor || !numero_boleto || !colegio_id) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos' },
                { status: 400 }
            );
        }
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // 1. Verificar que el sorteo existe y está activo
        const [sorteo] = await connection.query(
            `SELECT * FROM sorteo 
             WHERE id_sorteo = ? AND colegio_id = ? AND estatus = 'activo'`,
            [id_sorteo, colegio_id]
        );
        
        if (sorteo.length === 0) {
            await connection.rollback();
            connection.release();
            return NextResponse.json(
                { error: 'Sorteo no disponible o no pertenece al colegio' },
                { status: 400 }
            );
        }
        
        const sorteoData = sorteo[0];
        
        // 2. Verificar que el boleto no esté vendido para ESTE sorteo
        const [boletoExistente] = await connection.query(
            `SELECT id_boleto FROM boletos 
             WHERE id_sorteo = ? AND boleto = ?`,
            [id_sorteo, numero_boleto]
        );
        
        if (boletoExistente.length > 0) {
            await connection.rollback();
            connection.release();
            return NextResponse.json(
                { error: `El boleto ${numero_boleto} ya está vendido para este sorteo` },
                { status: 400 }
            );
        }
        
        // 3. Verificar formato del número (debe tener los dígitos correctos)
        const digitosEsperados = sorteoData.digitos_boleto;
        if (numero_boleto.toString().length !== digitosEsperados) {
            await connection.rollback();
            connection.release();
            return NextResponse.json(
                { error: `El boleto debe tener ${digitosEsperados} dígitos` },
                { status: 400 }
            );
        }
        
        // 4. Insertar el boleto
        const [result] = await connection.query(
            `INSERT INTO boletos 
             (id_sorteo, boleto, comprador, id_vendedor, colegio_id, precio, estado_pago, fecha_venta) 
             VALUES (?, ?, ?, ?, ?, ?, 'pendiente', NOW())`,
            [
                id_sorteo,
                numero_boleto,
                comprador,
                id_vendedor,
                colegio_id,
                sorteoData.precio_boleto
            ]
        );
        
        const idBoleto = result.insertId;
        
        // 5. Generar QR
        const qrData = `BOLETO-${idBoleto}-${colegio_id}-${id_sorteo}`;
        const qrCodeBase64 = await QRCode.toDataURL(qrData);
        
        // 6. Actualizar con QR
        await connection.query(
            `UPDATE boletos SET qr_code = ? WHERE id_boleto = ?`,
            [qrCodeBase64, idBoleto]
        );
        
        // 7. Obtener boleto completo para respuesta
        const [boletoCreado] = await connection.query(
            `SELECT * FROM boletos WHERE id_boleto = ?`,
            [idBoleto]
        );
        
        await connection.commit();
        connection.release();
        
        console.log('✅ Boleto creado exitosamente:', idBoleto);
        
        return NextResponse.json({
            success: true,
            message: 'Boleto vendido exitosamente',
            boleto: boletoCreado[0],
            sorteo: {
                nombre: sorteoData.nombre,
                precio: sorteoData.precio_boleto,
                comision: sorteoData.comision_vendedor
            },
            comision_vendedor: (sorteoData.precio_boleto * sorteoData.comision_vendedor) / 100
        });
        
    } catch (error) {
        console.error('❌ Error creando boleto:', error);
        
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (e) {
                console.error('Error en rollback:', e);
            }
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al crear el boleto',
                details: error.message 
            },
            { status: 500 }
        );
    }
}