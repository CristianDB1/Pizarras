import pool from "@/db/MysqlConection";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        // Obtener parámetros de la URL si los hay
        const { searchParams } = new URL(request.url);
        const colegioId = searchParams.get('colegio_id');
        
        let sql;
        let params = [];
        
        if (colegioId) {
            // Si se especifica colegio_id, buscar mensaje para ese colegio
            sql = `SELECT 
                id_mensaje,
                mensaje,
                fecha_inicio,
                fecha_fin,
                colegio_id,
                created_at
            FROM mensajes 
            WHERE colegio_id = ? 
              AND fecha_inicio <= NOW() 
              AND (fecha_fin IS NULL OR fecha_fin >= NOW())
            ORDER BY created_at DESC 
            LIMIT 1`;
            params = [colegioId];
        } else {
            // Si no se especifica colegio_id, buscar mensaje general (sin colegio_id)
            sql = `SELECT 
                id_mensaje,
                mensaje,
                fecha_inicio,
                fecha_fin,
                colegio_id,
                created_at
            FROM mensajes 
            WHERE colegio_id IS NULL 
              AND fecha_inicio <= NOW() 
              AND (fecha_fin IS NULL OR fecha_fin >= NOW())
            ORDER BY created_at DESC 
            LIMIT 1`;
        }
        
        console.log('📝 Buscando mensaje para colegio_id:', colegioId || 'general');
        
        const [rows] = await pool.query(sql, params);
        
        if (rows.length === 0) {
            // Si no hay mensajes, devolver mensaje por defecto
            return NextResponse.json({
                id_mensaje: 0,
                mensaje: 'Bienvenido al sistema',
                fecha_inicio: null,
                fecha_fin: null,
                colegio_id: null,
                created_at: new Date().toISOString(),
                mensaje_default: true
            });
        }
        
        const mensaje = rows[0];
        console.log('✅ Mensaje encontrado:', {
            id: mensaje.id_mensaje,
            colegio: mensaje.colegio_id,
            mensaje: mensaje.mensaje.substring(0, 50) + '...'
        });
        
        return NextResponse.json(mensaje);
        
    } catch (error) {
        console.error('❌ Error en /api/message:', error);
        
        return NextResponse.json(
            { 
                error: 'Error interno del servidor',
                details: error.message 
            },
            { status: 500 }
        );
    }
}

// Si necesitas crear/actualizar mensajes
export async function POST(request) {
    try {
        const data = await request.json();
        const { 
            mensaje, 
            colegio_id = null, 
            fecha_inicio = null, 
            fecha_fin = null 
        } = data;
        
        if (!mensaje) {
            return NextResponse.json(
                { error: 'El mensaje es requerido' },
                { status: 400 }
            );
        }
        
        // Si hay un mensaje existente para este colegio, actualizarlo
        // Si no, crear uno nuevo
        let sql;
        let params;
        
        if (colegio_id) {
            // Verificar si ya existe mensaje para este colegio
            const [existing] = await pool.query(
                'SELECT id_mensaje FROM mensajes WHERE colegio_id = ?',
                [colegio_id]
            );
            
            if (existing.length > 0) {
                // Actualizar mensaje existente
                sql = `UPDATE mensajes 
                      SET mensaje = ?, 
                          fecha_inicio = COALESCE(?, fecha_inicio),
                          fecha_fin = ?,
                          updated_at = NOW()
                      WHERE colegio_id = ?`;
                params = [mensaje, fecha_inicio, fecha_fin, colegio_id];
            } else {
                // Crear nuevo mensaje
                sql = `INSERT INTO mensajes 
                      (mensaje, colegio_id, fecha_inicio, fecha_fin, created_at) 
                      VALUES (?, ?, ?, ?, NOW())`;
                params = [mensaje, colegio_id, fecha_inicio, fecha_fin];
            }
        } else {
            // Mensaje general (sin colegio_id)
            const [existing] = await pool.query(
                'SELECT id_mensaje FROM mensajes WHERE colegio_id IS NULL'
            );
            
            if (existing.length > 0) {
                // Actualizar mensaje general existente
                sql = `UPDATE mensajes 
                      SET mensaje = ?, 
                          fecha_inicio = COALESCE(?, fecha_inicio),
                          fecha_fin = ?,
                          updated_at = NOW()
                      WHERE colegio_id IS NULL`;
                params = [mensaje, fecha_inicio, fecha_fin];
            } else {
                // Crear nuevo mensaje general
                sql = `INSERT INTO mensajes 
                      (mensaje, colegio_id, fecha_inicio, fecha_fin, created_at) 
                      VALUES (?, NULL, ?, ?, NOW())`;
                params = [mensaje, fecha_inicio, fecha_fin];
            }
        }
        
        const [result] = await pool.query(sql, params);
        
        return NextResponse.json({
            success: true,
            message: colegio_id ? 'Mensaje guardado para el colegio' : 'Mensaje general guardado',
            id: result.insertId || existing?.[0]?.id_mensaje,
            affectedRows: result.affectedRows
        });
        
    } catch (error) {
        console.error('❌ Error en POST /api/message:', error);
        return NextResponse.json(
            { error: 'Error al guardar el mensaje', details: error.message },
            { status: 500 }
        );
    }
}