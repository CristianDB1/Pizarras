import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(request) {
    let connection;
    
    try {
        // 1. Obtener datos de la solicitud
        const { user, pass } = await request.json();
        
        console.log('🔐 Intento de login:', { 
            usuario: user, 
            hora: new Date().toISOString() 
        });
        
        // 2. Validaciones básicas
        if (!user || !pass) {
            return NextResponse.json(
                { error: 'Usuario y contraseña son requeridos' },
                { status: 400 }
            );
        }
        
        // 3. Obtener conexión
        connection = await pool.getConnection();
        
        // 4. CONSULTA SEGURA con parámetros preparados
        const [rows] = await connection.query(
            `SELECT 
                id_vendedor,
                nombre,
                usuario,
                contrasena,
                rol,
                comision,
                estatus,
                colegio_id,
                fecha_ingreso,
                domicilio,
                telefono,
                created_at
            FROM vendedores 
            WHERE (usuario = ? OR id_vendedor = ?) AND contrasena = ?`,
            [user, user, pass]
        );
        
        // 5. Verificar si existe el usuario
        if (rows.length === 0) {
            //console.log('❌ Credenciales incorrectas para:', user);
            return NextResponse.json([], { status: 200 });
        }
        
        const vendedor = rows[0];
        
        // 6. Obtener hora actual
        const [currentTimeResult] = await connection.query('SELECT NOW() as currentTime');
        const currentTime = currentTimeResult[0].currentTime;
        
        // 7. Obtener mensaje activo - CON CAMPOS CORRECTOS
        // Buscar mensaje para el colegio del vendedor o mensaje general
        let mensaje = 'Bienvenido al sistema'; // Mensaje por defecto
        
        try {
            const [mensajeResult] = await connection.query(
                `SELECT mensaje 
                 FROM mensajes 
                 WHERE colegio_id = ? 
                   AND fecha_inicio <= NOW() 
                   AND (fecha_fin IS NULL OR fecha_fin >= NOW())
                 ORDER BY created_at DESC 
                 LIMIT 1`,
                [vendedor.colegio_id]
            );
            
            if (mensajeResult.length > 0) {
                mensaje = mensajeResult[0].mensaje;
            } else {
                // Si no hay mensaje específico para el colegio, buscar mensaje general (sin colegio_id)
                const [mensajeGeneralResult] = await connection.query(
                    `SELECT mensaje 
                     FROM mensajes 
                     WHERE colegio_id IS NULL 
                       AND fecha_inicio <= NOW() 
                       AND (fecha_fin IS NULL OR fecha_fin >= NOW())
                     ORDER BY created_at DESC 
                     LIMIT 1`
                );
                
                if (mensajeGeneralResult.length > 0) {
                    mensaje = mensajeGeneralResult[0].mensaje;
                }
            }
            
            //console.log('📝 Mensaje encontrado:', mensaje.substring(0, 50) + '...');
            
        } catch (mensajeError) {
            console.warn('⚠️ No se pudo obtener mensaje, usando mensaje por defecto:', mensajeError.message);
            // Continuar con mensaje por defecto
        }
        
        // 8. Actualizar última fecha de ingreso
        await connection.query(
            'UPDATE vendedores SET fecha_ingreso = ? WHERE id_vendedor = ?',
            [currentTime, vendedor.id_vendedor]
        );
        
        // 9. Verificar estatus del usuario
        if (vendedor.estatus !== 'activo') {
            //console.log('⚠️ Usuario no activo:', vendedor.nombre, 'Estatus:', vendedor.estatus);
            
            return NextResponse.json([{
                // Campos nuevos
                id_vendedor: vendedor.id_vendedor,
                nombre: vendedor.nombre,
                usuario: vendedor.usuario,
                rol: vendedor.rol,
                comision: vendedor.comision,
                estatus: vendedor.estatus,
                colegio_id: vendedor.colegio_id,
                
                // Campos para compatibilidad con sistema antiguo
                Idvendedor: vendedor.id_vendedor,
                Nombre: vendedor.nombre,
                Estatus: vendedor.estatus,
                sucursal: vendedor.rol === 'staff' ? 'Loteria' : 'Normal',
                Puntos: 0,
                Fechaingreso: currentTime,
                Domicilio: vendedor.domicilio,
                Telefono: vendedor.telefono,
                Comision: vendedor.comision,
                Aguinaldo: 0,
                mensaje: vendedor.estatus === 'suspendido' ? 'Cuenta suspendida' : mensaje,
                requestTime: currentTime
            }], { status: 200 });
        }
        
        // 10. LOGIN EXITOSO - Preparar respuesta
        /*console.log('Login exitoso:', {
            id: vendedor.id_vendedor,
            nombre: vendedor.nombre,
            rol: vendedor.rol,
            colegio: vendedor.colegio_id,
            mensaje: mensaje.substring(0, 30) + '...'
        });*/
        
        const responseData = [{
            // ✅ CAMPOS NUEVOS (para el sistema actualizado)
            id_vendedor: vendedor.id_vendedor,
            nombre: vendedor.nombre,
            usuario: vendedor.usuario,
            rol: vendedor.rol,
            comision: vendedor.comision,
            estatus: vendedor.estatus,
            colegio_id: vendedor.colegio_id,
            fecha_ingreso: vendedor.fecha_ingreso,
            domicilio: vendedor.domicilio,
            telefono: vendedor.telefono,
            created_at: vendedor.created_at,
            
            // ✅ CAMPOS PARA COMPATIBILIDAD (sistema antiguo)
            Idvendedor: vendedor.id_vendedor,
            Nombre: vendedor.nombre,
            Estatus: vendedor.estatus,
            sucursal: vendedor.rol === 'staff' ? 'Loteria' : 'Normal',
            Puntos: 0,
            Fechaingreso: currentTime,
            Domicilio: vendedor.domicilio,
            Telefono: vendedor.telefono,
            Comision: vendedor.comision,
            Aguinaldo: 0,
            mensaje: mensaje,
            requestTime: currentTime
        }];
        
        return NextResponse.json(responseData, { status: 200 });
        
    } catch (error) {
        console.error('❌ Error en API login:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error interno del servidor',
                details: error.message 
            },
            { status: 500 }
        );
        
    } finally {
        // 11. Liberar conexión
        if (connection) {
            connection.release();
        }
    }
}