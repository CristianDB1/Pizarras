import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { id } = params;
        
        //console.log('👤 Obteniendo vendedor ID:', id);
        
        // 1. Obtener datos del vendedor
        const [vendedor] = await pool.query(
            `SELECT 
                id_vendedor,
                nombre,
                usuario,
                domicilio,
                telefono,
                comision,
                estatus,
                rol,
                colegio_id,
                created_at
            FROM vendedores 
            WHERE id_vendedor = ?`,
            [id]
        );
        
        if (vendedor.length === 0) {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Vendedor no encontrado' 
                },
                { status: 404 }
            );
        }
        
        const vendedorData = vendedor[0];
        
        // 2. Obtener deuda pendiente del vendedor
        let deudaTotal = 0;
        try {
            const [deudas] = await pool.query(
                `SELECT SUM(cantidad) as total_deuda 
                 FROM deuda 
                 WHERE id_vendedor = ? AND estatus = 'pendiente'`,
                [id]
            );
            
            if (deudas[0] && deudas[0].total_deuda) {
                deudaTotal = parseFloat(deudas[0].total_deuda);
            }
        } catch (error) {
            //console.log('ℹ️ No se pudo obtener deuda:', error.message);
        }
        
        // 3. Obtener nombre del colegio
        let nombreColegio = null;
        try {
            const [colegio] = await pool.query(
                `SELECT nombre FROM colegios WHERE id_colegio = ?`,
                [vendedorData.colegio_id]
            );
            
            if (colegio.length > 0) {
                nombreColegio = colegio[0].nombre;
            }
        } catch (error) {
            //console.log('ℹ️ No se pudo obtener colegio:', error.message);
        }
        
        //console.log('✅ Vendedor encontrado:', vendedorData.nombre, 'Deuda:', deudaTotal);
        
        // 4. Preparar respuesta
        const normalizedVendedor = {
            // IDs en diferentes formatos para compatibilidad
            Idvendedor: vendedorData.id_vendedor,
            id_vendedor: vendedorData.id_vendedor,
            idVendedor: vendedorData.id_vendedor,
            
            // Información personal
            Nombre: vendedorData.nombre,
            nombre: vendedorData.nombre,
            usuario: vendedorData.usuario,
            domicilio: vendedorData.domicilio,
            telefono: vendedorData.telefono,
            
            // Datos de trabajo
            Comision: vendedorData.comision,
            comision: vendedorData.comision,
            estatus: vendedorData.estatus,
            rol: vendedorData.rol,
            colegio_id: vendedorData.colegio_id,
            
            // Datos adicionales
            deuda: deudaTotal,
            nombre_colegio: nombreColegio,
            created_at: vendedorData.created_at
        };
        
        return NextResponse.json({
            success: true,
            vendedor: normalizedVendedor
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo vendedor:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Error interno del servidor',
                details: error.message 
            },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    let connection;
    try {
        const { id } = params;
        const data = await request.json();
        
        const { 
            nombre,
            usuario,
            contrasena,
            domicilio,
            telefono,
            comision,
            estatus,
            rol
        } = data;
        
        //console.log('✏️ Actualizando vendedor ID:', id, 'Datos:', data);
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Verificar que el vendedor existe
        const [vendedorExiste] = await connection.query(
            `SELECT * FROM vendedores WHERE id_vendedor = ?`,
            [id]
        );
        
        if (vendedorExiste.length === 0) {
            throw new Error('Vendedor no encontrado');
        }
        
        // Si se cambia el usuario, verificar que no exista en el mismo colegio
        if (usuario && usuario !== vendedorExiste[0].usuario) {
            const [usuarioExiste] = await connection.query(
                `SELECT id_vendedor FROM vendedores 
                 WHERE usuario = ? AND colegio_id = ? AND id_vendedor != ?`,
                [usuario, vendedorExiste[0].colegio_id, id]
            );
            
            if (usuarioExiste.length > 0) {
                throw new Error('El usuario ya existe en este colegio');
            }
        }
        
        // Actualizar vendedor
        const updateFields = [];
        const updateValues = [];
        
        if (nombre) { updateFields.push('nombre = ?'); updateValues.push(nombre); }
        if (usuario) { updateFields.push('usuario = ?'); updateValues.push(usuario); }
        if (contrasena && contrasena.trim() !== '') { 
            updateFields.push('contrasena = ?'); 
            updateValues.push(contrasena); // En producción: encriptar
        }
        if (domicilio !== undefined) { updateFields.push('domicilio = ?'); updateValues.push(domicilio || null); }
        if (telefono !== undefined) { updateFields.push('telefono = ?'); updateValues.push(telefono || null); }
        if (comision !== undefined) { updateFields.push('comision = ?'); updateValues.push(comision); }
        if (estatus) { updateFields.push('estatus = ?'); updateValues.push(estatus); }
        if (rol) { updateFields.push('rol = ?'); updateValues.push(rol); }
        
        if (updateFields.length === 0) {
            throw new Error('No hay campos para actualizar');
        }
        
        updateValues.push(id);
        
        const query = `UPDATE vendedores SET ${updateFields.join(', ')} WHERE id_vendedor = ?`;
        
        const [result] = await connection.query(query, updateValues);
        
        // Obtener vendedor actualizado
        const [vendedorActualizado] = await connection.query(
            `SELECT * FROM vendedores WHERE id_vendedor = ?`,
            [id]
        );
        
        await connection.commit();
        
        //console.log('✅ Vendedor actualizado:', id);
        
        return NextResponse.json({
            success: true,
            message: 'Vendedor actualizado exitosamente',
            vendedor: vendedorActualizado[0],
            cambios: result.affectedRows
        });
        
    } catch (error) {
        console.error('❌ Error actualizando vendedor:', error);
        
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al actualizar el vendedor',
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

// También para DELETE
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        
        //console.log('🗑️ Eliminando vendedor ID:', id);
        
        // Verificar que el vendedor existe
        const [vendedorExiste] = await pool.query(
            `SELECT id_vendedor FROM vendedores WHERE id_vendedor = ?`,
            [id]
        );
        
        if (vendedorExiste.length === 0) {
            throw new Error('Vendedor no encontrado');
        }
        
        // Eliminar vendedor
        const [result] = await pool.query(
            `DELETE FROM vendedores WHERE id_vendedor = ?`,
            [id]
        );
        
        //console.log('✅ Vendedor eliminado:', id);
        
        return NextResponse.json({
            success: true,
            message: 'Vendedor eliminado exitosamente',
            eliminados: result.affectedRows
        });
        
    } catch (error) {
        console.error('❌ Error eliminando vendedor:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Error al eliminar el vendedor',
                details: error.message 
            },
            { status: 500 }
        );
    }
}