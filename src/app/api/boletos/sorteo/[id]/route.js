import { NextResponse } from "next/server";
import pool from "@/db/MysqlConection";
import { cerrarSorteosVencidos } from "@/lib/cerrarSorteosVencidos";

export async function GET(request, { params }) {
    await cerrarSorteosVencidos();
    try {
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const colegioId = searchParams.get('colegio_id');
        
        //console.log('📡 Obteniendo boletos del sorteo:', id, 'colegio:', colegioId);
        
        // Validar que el sorteo pertenezca al colegio (si se proporciona colegioId)
        if (colegioId) {
            const [verificacion] = await pool.query(
                `SELECT id_sorteo FROM sorteo WHERE id_sorteo = ? AND colegio_id = ?`,
                [id, colegioId]
            );
            
            if (verificacion.length === 0) {
                return NextResponse.json(
                    { error: 'Sorteo no pertenece a este colegio' },
                    { status: 403 }
                );
            }
        }
        
        // Obtener boletos vendidos de ESTE sorteo
        const [boletos] = await pool.query(
            `SELECT 
                id_boleto,
                boleto as numero_boleto,
                comprador,
                id_vendedor,
                fecha_venta,
                estado_pago,
                precio
            FROM boletos 
            WHERE id_sorteo = ? 
            ORDER BY boleto ASC`,
            [id]
        );
        
        console.log(`✅ ${boletos.length} boletos encontrados para sorteo ${id}`);
        
        return NextResponse.json({
            success: true,
            sorteo_id: id,
            total_boletos: boletos.length,
            boletos_vendidos: boletos.map(b => b.numero_boleto),
            datos: boletos
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo boletos:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Error interno del servidor'
            },
            { status: 500 }
        );
    }
}