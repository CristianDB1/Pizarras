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
            digitos_boleto
        } = data;
        
        //console.log('✏️ Editando sorteo ID:', id, 'Datos:', data);
        
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
        // Para sorteos creados inicialmente (verificar si es el primero del colegio)
        const [primerSorteo] = await connection.query(
            `SELECT MIN(id_sorteo) as primer_id FROM sorteo WHERE colegio_id = ?`,
            [sorteoActual.colegio_id]
        );
        
        const esSorteoInicial = primerSorteo[0].primer_id === sorteoActual.id_sorteo;
        
        // Si es sorteo inicial, algunos campos no se pueden modificar
        if (esSorteoInicial) {
            console.log('⚠️ Editando sorteo inicial - restricciones aplicadas');
            // Aquí puedes agregar restricciones si lo necesitas
        }
        
        // Validar fecha si se está cambiando
        if (fecha) {
            const fechaSorteo = new Date(fecha);
            const hoy = new Date();
            if (fechaSorteo <= hoy) {
                throw new Error('La fecha del sorteo debe ser futura');
            }
        }
        
        // Validar estatus permitido
        if (estatus && !['activo', 'cerrado'].includes(estatus)) {
            throw new Error('Estatus no válido. Use: activo o cerrado');
        }
        
        // Actualizar sorteo
        const [result] = await connection.query(
            `UPDATE sorteo 
            SET nombre = COALESCE(?, nombre),
                fecha = COALESCE(?, fecha),
                primer_premio = COALESCE(?, primer_premio),
                segundo_premio = COALESCE(?, segundo_premio),
                estatus = COALESCE(?, estatus),
                precio_boleto = COALESCE(?, precio_boleto),
                comision_vendedor = COALESCE(?, comision_vendedor),
                digitos_boleto = COALESCE(?, digitos_boleto)
            WHERE id_sorteo = ?`,
            [
                nombre,
                fecha,
                primer_premio,
                segundo_premio,
                estatus,
                precio_boleto,
                comision_vendedor,
                digitos_boleto,
                id
            ]
        );
        
        // Obtener sorteo actualizado
        const [sorteoActualizado] = await connection.query(
            `SELECT * FROM sorteo WHERE id_sorteo = ?`,
            [id]
        );
        
        await connection.commit();
        
        //console.log('✅ Sorteo actualizado correctamente');
        
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