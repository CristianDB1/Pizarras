import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function POST(req) {
    try {
        const datos = await req.json();
        const { user, pass } = datos;

        // 1. Buscar en tabla USUARIOS (no vendedores)
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

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Credenciales incorrectas' },
                { status: 401 }
            );
        }

        const usuario = rows[0];

        // 2. Si es admin_colegio, obtener datos de su colegio
        let colegio = null;
        let sorteos = [];
        
        if (usuario.rol === 'admin_colegio' && usuario.colegio_id) {
            const [colegioData] = await pool.query(
                `SELECT * FROM colegios WHERE id_colegio = ?`,
                [usuario.colegio_id]
            );
            colegio = colegioData[0] || null;

            // Obtener sorteos activos del colegio
            const [sorteosData] = await pool.query(
                `SELECT * FROM sorteo 
                 WHERE colegio_id = ? AND estatus = 'activo' 
                 ORDER BY fecha DESC`,
                [usuario.colegio_id]
            );
            sorteos = sorteosData;
        }

        // 3. Si es superadmin, obtener lista de todos los colegios
        let todosColegios = [];
        if (usuario.rol === 'superadmin') {
            const [colegiosData] = await pool.query(
                `SELECT * FROM colegios WHERE estatus = 'activo' ORDER BY nombre`
            );
            todosColegios = colegiosData;
        }

        // 4. Obtener hora actual
        const [currentTime] = await pool.query('SELECT NOW() as currentTime');
        
        // 5. Preparar respuesta
        const responseData = {
            ...usuario,
            requestTime: currentTime[0].currentTime,
            colegio: colegio,
            sorteos_activos: sorteos,
            todos_colegios: todosColegios
        };

        return NextResponse.json([{
            id_usuario: user[0].id_usuario,
            nombre: user[0].nombre,
            usuario: user[0].usuario,
            rol: user[0].rol,
            colegio_id: user[0].colegio_id,
            estatus: user[0].estatus,
            requestTime: currentTime[0].currentTime,
            colegio: colegio,
            sorteos_activos: sorteos,
            todos_colegios: todosColegios
        }])

    } catch (error) {
        console.error('Error en login admin:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}