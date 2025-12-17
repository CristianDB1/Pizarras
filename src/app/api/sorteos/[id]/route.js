import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";

export async function GET(request, { params }) {
    try {
        const { id } = params;
        
        //console.log('🎯 Obteniendo sorteo para venta, ID:', id);
        
        const [rows] = await pool.query(
            `SELECT 
                id_sorteo,
                colegio_id,
                nombre,
                fecha,
                primer_premio,
                segundo_premio,
                estatus,
                numero_sorteo,
                leyenda2,
                precio_boleto,
                comision_vendedor,
                digitos_boleto,
                created_at
            FROM sorteo 
            WHERE id_sorteo = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            //console.log('❌ Sorteo no encontrado:', id);
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Sorteo no encontrado' 
                },
                { status: 404 }
            );
        }
        
        const sorteo = rows[0];
        
        // Verificar que el sorteo esté activo
        if (sorteo.estatus !== 'activo') {
            return NextResponse.json(
                { 
                    success: false,
                    error: 'Este sorteo no está disponible para venta',
                    estatus: sorteo.estatus
                },
                { status: 400 }
            );
        }
        
        //console.log('✅ Sorteo listo para venta:', sorteo.nombre);
        
        return NextResponse.json({
            success: true,
            sorteo: sorteo
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo sorteo:', error);
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