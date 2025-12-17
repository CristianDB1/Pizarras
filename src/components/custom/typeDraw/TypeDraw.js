'use client'
import { useRouter } from "next/navigation";
import { FaHome } from "react-icons/fa";
import { useState, useEffect, useCallback, useRef } from "react";
import updateInfo from "../validation/updateInfo";
import useSession from "@/hook/useSession";

const TypeDraw = () => {
    const { getUserData } = useSession();
    const router = useRouter();
    const [sorteosActivos, setSorteosActivos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const userData = getUserData();
    const hasFetched = useRef(false); // Para evitar múltiples llamadas

    const cargarSorteosActivos = useCallback(async () => {
        // Evitar múltiples llamadas simultáneas
        if (hasFetched.current || !userData?.colegio_id) return;
        
        try {
            hasFetched.current = true;
            setLoading(true);
            setError(null);
            
            //console.log('Cargando sorteos para colegio:', userData.colegio_id);
            const response = await fetch(`/api/sorteos/colegio/${userData.colegio_id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Filtrar solo sorteos ACTIVOS
                const activos = data.sorteos.filter(s => s.estatus === 'activo');
                console.log(`Encontrados ${activos.length} sorteos activos`);
                setSorteosActivos(activos);
            } else {
                setError(data.error || 'Error al cargar sorteos');
            }
        } catch (error) {
            console.error('Error cargando sorteos:', error);
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    }, [userData?.colegio_id]);

    useEffect(() => {
        // Solo cargar si tenemos colegio_id y no hemos cargado antes
        if (userData?.colegio_id && !hasFetched.current) {
            cargarSorteosActivos();
        }
        
        // Cleanup function
        return () => {
            // Opcional: resetear el ref si el componente se desmonta
        };
    }, [userData?.colegio_id, cargarSorteosActivos]);

    const goToMenu = () => {
        updateInfo(userData?.Idvendedor).then(() => {
            router.push('/menu')
        });  
    }

    // NUEVA FUNCIÓN: Ir a vender boleto de un sorteo específico
    const venderBoleto = (sorteo) => {
        // Preparar datos en el formato que espera TickectBuyEspecial
        const sorteoData = {
            Idsorteo: sorteo.id_sorteo,
            nombre: sorteo.nombre,
            Fecha: sorteo.fecha,
            Primerpremio: sorteo.primer_premio,
            Segundopremio: sorteo.segundo_premio,
            Tipo_sorteo: 'especial',
            precio_boleto: sorteo.precio_boleto,
            digitos_boleto: sorteo.digitos_boleto,
            comision_vendedor: sorteo.comision_vendedor,
            numero_sorteo: sorteo.numero_sorteo,
            leyenda2: sorteo.leyenda2,
            estatus: sorteo.estatus,
            colegio_id: sorteo.colegio_id
        };
        
        //console.log('Guardando sorteo en localStorage:', sorteoData);
        
        // Guardar en localStorage
        localStorage.setItem('TickectEspecial', JSON.stringify(sorteoData));
        
        // Navegar a la página de venta
        router.push('/ticketBuyEspecial');
    }

    // NUEVA FUNCIÓN: Ver detalles del sorteo
    const verDetallesSorteo = (sorteoId) => {
        router.push(`/sorteo/${sorteoId}`);
    }
    
    // Función para recargar
    const handleRetry = () => {
        hasFetched.current = false;
        cargarSorteosActivos();
    }

    return (
        <div className="relative flex flex-col w-full max-w-4xl mx-auto p-4">
            <div className="text-white text-3xl text-center mb-6">
                🎟️ Sorteos Disponibles
            </div>
            
            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
                    <p className="text-red-300">{error}</p>
                    <button
                        onClick={handleRetry}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Reintentar
                    </button>
                </div>
            )}
            
            {loading ? (
                <div className="text-white text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                    <p className="mt-2">Cargando sorteos...</p>
                </div>
            ) : sorteosActivos.length === 0 ? (
                <div className="text-center text-white py-8">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="text-xl">No hay sorteos activos</p>
                    <p className="text-gray-300 mt-2">Contacta al administrador del colegio</p>
                    <button
                        onClick={handleRetry}
                        className="mt-4 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                    >
                        Actualizar
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sorteosActivos.map((sorteo) => (
                        <div 
                            key={sorteo.id_sorteo} 
                            className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-red-500 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-white font-bold text-lg">{sorteo.nombre}</h3>
                                    <p className="text-gray-400 text-sm">#{sorteo.numero_sorteo}</p>
                                </div>
                                <span className="px-3 py-1 bg-green-900 text-green-300 text-xs rounded-full">
                                    ACTIVO
                                </span>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Fecha:</span>
                                    <span className="text-white">{new Date(sorteo.fecha).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Precio:</span>
                                    <span className="text-white font-bold">${sorteo.precio_boleto}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Dígitos:</span>
                                    <span className="text-white">{sorteo.digitos_boleto}</span>
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => venderBoleto(sorteo)} // ← Pasar el objeto completo
                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Vender Boleto
                                </button>
                                <button
                                    onClick={() => verDetallesSorteo(sorteo.id_sorteo)}
                                    className="px-3 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
                                    title="Ver detalles"
                                >
                                    👁️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <button
                onClick={goToMenu}
                className="fixed bottom-4 right-4 bg-red-700 text-white flex justify-center items-center rounded-full w-[70px] h-[70px] text-3xl hover:bg-red-800 transition-colors"
            >
                <FaHome />
            </button>
        </div>
    );
}

export default TypeDraw;