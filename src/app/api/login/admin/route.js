import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(req) {
    try {
        const datos = await req.json();
        const { user, pass } = datos;

        console.log('🔐 Intentando login con:', { user });

        // 1. Buscar en tabla USUARIOS
        const sql = `
            SELECT 
                id_usuario, 
                nombre, 
                usuario, 
                estatus, 
                colegio_id, 
                rol,
                created_at
            FROM usuarios 
            WHERE usuario = ? AND contra = ? AND estatus = 'activo'
        `;

        const [rows] = await pool.query(sql, [user, pass]);

        console.log('📊 Resultado de la consulta:', rows);

        if (rows.length === 0) {
            console.log('❌ Usuario no encontrado o credenciales incorrectas');
            return NextResponse.json(
                { error: 'Credenciales incorrectas' },
                { status: 401 }
            );
        }

        const usuario = rows[0];
        console.log('✅ Usuario encontrado:', usuario);

        // 2. Si es admin_colegio, obtener datos de su colegio
        let colegio = null;
        let sorteos = [];
        
        if (usuario.rol === 'admin_colegio' && usuario.colegio_id) {
            console.log('🏫 Buscando colegio para admin_colegio:', usuario.colegio_id);
            const [colegioData] = await pool.query(
                `SELECT id_colegio, nombre, logo_url, configuracion, estatus 
                 FROM colegios WHERE id_colegio = ?`,
                [usuario.colegio_id]
            );
            colegio = colegioData[0] || null;
            console.log('📁 Colegio encontrado:', colegio);

            // Obtener sorteos activos del colegio
            const [sorteosData] = await pool.query(
                `SELECT id_sorteo, nombre, fecha, estatus, numero_sorteo 
                 FROM sorteo 
                 WHERE colegio_id = ? AND estatus = 'activo' 
                 ORDER BY fecha DESC`,
                [usuario.colegio_id]
            );
            sorteos = sorteosData;
        }

        // 3. Si es superadmin, obtener lista de todos los colegios
        let todosColegios = [];
        if (usuario.rol === 'superadmin') {
            console.log('👑 Es superadmin, obteniendo todos los colegios');
            const [colegiosData] = await pool.query(
                `SELECT id_colegio, nombre, logo_url, estatus 
                 FROM colegios WHERE estatus = 'activo' ORDER BY nombre`
            );
            todosColegios = colegiosData;
        }

        // 4. Obtener hora actual
        const [currentTime] = await pool.query('SELECT NOW() as currentTime');
        
        // 5. Preparar respuesta CON TODOS LOS CAMPOS NECESARIOS
        const responseData = {
            // Campos principales del usuario
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            usuario: usuario.usuario,
            estatus: usuario.estatus,
            colegio_id: usuario.colegio_id,
            rol: usuario.rol,
            created_at: usuario.created_at,
            
            // Campos adicionales
            requestTime: currentTime[0].currentTime,
            colegio: colegio,
            sorteos_activos: sorteos,
            todos_colegios: todosColegios
        };

        console.log('📤 Enviando respuesta:', responseData);

        return NextResponse.json([responseData]);

    } catch (error) {
        console.error('❌ Error en login admin:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        );
    }
}