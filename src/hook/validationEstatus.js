// validationEstatus.js - VERSIÓN FINAL
import Swal from 'sweetalert2';

const VailidationEstatus = async () => {
    console.log('🔍 Validando estatus del vendedor...');
    
    try {
        // Obtener datos del usuario de localStorage
        const userDataStr = localStorage.getItem("userData");
        
        if (!userDataStr) {
            console.warn('⚠️ No hay datos de usuario');
            return true; // Permitir continuar
        }
        
        const userData = JSON.parse(userDataStr);
        
        // Buscar id_vendedor en diferentes formatos
        const idVendedor = userData.Idvendedor || userData.idVendedor || userData.id_vendedor || userData.id;
        
        if (!idVendedor) {
            console.warn('⚠️ No se pudo obtener id_vendedor. Campos disponibles:', Object.keys(userData));
            return true; // Permitir continuar
        }
        
        console.log('👤 Validando vendedor ID:', idVendedor);
        
        // Llamar a la nueva API
        const response = await fetch(`/api/vendedores/${idVendedor}`);
        
        if (!response.ok) {
            console.warn('⚠️ No se pudo validar vendedor (HTTP ' + response.status + ')');
            return true; // No bloquear por error de conexión
        }
        
        const data = await response.json();
        console.log('📥 Respuesta de validación:', data);
        
        if (data.success && data.vendedor) {
            const vendedor = data.vendedor;
            
            // Verificar estatus
            if (vendedor.estatus === 'inactivo' || vendedor.estatus === 'bloqueado') {
                Swal.fire({
                    icon: 'error',
                    title: 'Vendedor inactivo',
                    text: 'Tu cuenta está inactiva. Contacta al administrador.',
                    confirmButtonText: 'Entendido'
                }).then(() => {
                    localStorage.clear();
                    window.location.href = '/';
                });
                return false;
            }
            
            console.log('✅ Vendedor validado correctamente');
            return true;
        } else {
            console.warn('⚠️ No se pudo obtener datos del vendedor');
            return true; // Permitir continuar
        }
        
    } catch (error) {
        console.error('❌ Error en validación:', error);
        return true; // NO BLOQUEAR en caso de error
    }
};

export default VailidationEstatus;