export default async function updateInfo(idVendedor) {
    console.log('🔄 Actualizando información del vendedor:', idVendedor);
    
    if (!idVendedor) {
        console.warn('⚠️ No hay idVendedor para updateInfo');
        return;
    }
    
    try {
        const response = await fetch(`/api/vendedores/${idVendedor}`);
        
        if (!response.ok) {
            console.warn('⚠️ No se pudo actualizar información (HTTP ' + response.status + ')');
            return;
        }
        
        const data = await response.json();
        console.log('📥 Datos recibidos para update:', data);
        
        if (data.success && data.vendedor) {
            const vendedor = data.vendedor;
            
            // Combinar con datos existentes
            const currentData = JSON.parse(localStorage.getItem("userData") || "{}");
            const updatedData = {
                ...currentData,
                ...vendedor,
                // Asegurar campos importantes
                Idvendedor: vendedor.Idvendedor || vendedor.id_vendedor,
                id_vendedor: vendedor.id_vendedor || vendedor.Idvendedor,
                colegio_id: vendedor.colegio_id || currentData.colegio_id
            };
            
            localStorage.setItem("userData", JSON.stringify(updatedData));
            console.log('✅ Información actualizada en localStorage');
        }
        
    } catch (error) {
        console.error('❌ Error en updateInfo:', error);
        // No lanzar error
    }
}