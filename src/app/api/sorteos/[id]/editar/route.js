import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function PUT(request, { params }) {
    let connection;
    try {
        const { id } = params;
        const data = await request.json();
        
        const { 
            nombre,
            fecha,
            primer_premio,
            segundo_premio,
            estatus,
            precio_boleto,
            comision_vendedor,
            digitos_boleto,
            numero_sorteo
        } = data;
        
        console.log('✏️ Editando sorteo ID:', id, 'Datos:', data);
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar que el sorteo existe
        const [sorteoExiste] = await connection.query(
            `SELECT * FROM sorteo WHERE id_sorteo = ?`,
            [id]
        );
        
        if (sorteoExiste.length === 0) {
            throw new Error('Sorteo no encontrado');
        }
        
        const sorteoActual = sorteoExiste[0];
        
        // Validaciones específicas
        const [primerSorteo] = await connection.query(
            `SELECT MIN(id_sorteo) as primer_id FROM sorteo WHERE colegio_id = ?`,
            [sorteoActual.colegio_id]
        );
        
        const esSorteoInicial = primerSorteo[0].primer_id === sorteoActual.id_sorteo;
        
        // Si es sorteo inicial, algunos campos no se pueden modificar
        if (esSorteoInicial) {
            console.log('⚠️ Editando sorteo inicial - restricciones aplicadas');
            // No aplicar restricciones para número_sorteo si quieres permitir cambios
        }
        
        // Validar fecha si se está cambiando
        let fechaNormalizada = fecha;

        if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            fechaNormalizada = `${fecha}T12:00:00`;
        }

        if (fechaNormalizada) {
            const fechaSorteo = new Date(fechaNormalizada);
            const hoy = new Date();

            if (fechaSorteo <= hoy) {
                throw new Error('La fecha del sorteo debe ser futura');
            }
        }
        
        // Validar estatus permitido
        if (estatus && !['activo', 'cerrado'].includes(estatus)) {
            throw new Error('Estatus no válido. Use: activo o cerrado');
        }
        
        // Validar número de sorteo si se envía
        if (numero_sorteo !== undefined && numero_sorteo !== null) {
            if (numero_sorteo.trim() === '') {
                throw new Error('El número de sorteo no puede estar vacío');
            }
        }
        
        // CORRECIÓN: Usar IFNULL en lugar de COALESCE para manejar 0 correctamente
        const [result] = await connection.query(
            `UPDATE sorteo 
            SET 
                nombre = IFNULL(?, nombre),
                fecha = IFNULL(?, fecha),
                primer_premio = IFNULL(?, primer_premio),
                segundo_premio = IFNULL(?, segundo_premio),
                estatus = IFNULL(?, estatus),
                precio_boleto = IF(? IS NOT NULL, ?, precio_boleto),
                comision_vendedor = IF(? IS NOT NULL, ?, comision_vendedor),
                digitos_boleto = IF(? IS NOT NULL, ?, digitos_boleto),
                numero_sorteo = IF(? IS NOT NULL, ?, numero_sorteo)
            WHERE id_sorteo = ?`,
            [
                // Nombre
                nombre || null,
                // Fecha
                fechaNormalizada || null,
                // Primer premio
                primer_premio || null,
                // Segundo premio
                segundo_premio || null,
                // Estatus
                estatus || null,
                // Precio boleto - manejo especial para 0
                precio_boleto, precio_boleto,
                // Comisión vendedor - manejo especial para 0
                comision_vendedor, comision_vendedor,
                // Dígitos boleto - manejo especial para 0
                digitos_boleto, digitos_boleto,
                // Número de sorteo - manejo especial
                numero_sorteo, numero_sorteo?.trim(),
                // ID
                id
            ]
        );
        
        // Obtener sorteo actualizado
        const [sorteoActualizado] = await connection.query(
            `SELECT * FROM sorteo WHERE id_sorteo = ?`,
            [id]
        );
        
        await connection.commit();
        
        console.log('✅ Sorteo actualizado correctamente:', {
            id,
            numero_sorteo: sorteoActualizado[0]?.numero_sorteo,
            comision_vendedor: sorteoActualizado[0]?.comision_vendedor,
            precio_boleto: sorteoActualizado[0]?.precio_boleto
        });
        
        return NextResponse.json({
            success: true,
            message: 'Sorteo actualizado exitosamente',
            sorteo: sorteoActualizado[0],
            es_sorteo_inicial: esSorteoInicial,
            cambios: result.affectedRows
        });
        
    } catch (error) {
        console.error('❌ Error actualizando sorteo:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al actualizar el sorteo',
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