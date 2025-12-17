'use client'
import { useState, useEffect, useCallback } from 'react'
import { 
    Trophy, 
    Tag, 
    Percent, 
    Calendar,
    Award,
    DollarSign,
    Hash,
    Lock,
    Eye,
    RefreshCw
} from 'lucide-react'

export default function SorteosManager({ colegioId }) {
    const [sorteos, setSorteos] = useState([])
    const [estadisticas, setEstadisticas] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [mensaje, setMensaje] = useState('')

    // Cargar sorteos del colegio
    const cargarSorteos = useCallback(async () => {
        if (!colegioId) {
            setError('No hay ID de colegio')
            return
        }
        
        try {
            setLoading(true)
            setError(null)
            
            const response = await fetch(`/api/sorteos/colegio/${colegioId}`)
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`)
            }
            
            const data = await response.json()
            
            if (data.success) {
                setSorteos(data.sorteos || [])
                setEstadisticas(data.estadisticas || {})
            } else {
                throw new Error('Error en la respuesta del servidor')
            }
            
        } catch (err) {
            console.error('Error cargando sorteos:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [colegioId])

    useEffect(() => {
        if (colegioId) {
            cargarSorteos();
        }
    }, [colegioId, cargarSorteos]);

    // Formatear precio
    const formatPrecio = (precio) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(precio)
    }

    // Formatear fecha
    const formatFecha = (fechaString) => {
        if (!fechaString) return 'Sin fecha'
        return new Date(fechaString).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Ver estado del sorteo
    const getEstadoBadge = (estatus, fecha) => {
        const now = new Date()
        const fechaSorteo = new Date(fecha)
        
        if (estatus === 'cerrado') {
            return {
                text: 'Cerrado',
                color: 'bg-gray-100 text-gray-800',
                icon: '🔒'
            }
        }
        
        if (fechaSorteo < now) {
            return {
                text: 'Expirado',
                color: 'bg-red-100 text-red-800',
                icon: '⏰'
            }
        }
        
        // Calcular días restantes
        const diffTime = fechaSorteo - now
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays <= 7) {
            return {
                text: `Finaliza en ${diffDays} día${diffDays !== 1 ? 's' : ''}`,
                color: 'bg-yellow-100 text-yellow-800',
                icon: '⚠️'
            }
        }
        
        return {
            text: 'Activo',
            color: 'bg-green-100 text-green-800',
            icon: '✅'
        }
    }

    // Ver detalles del sorteo
    const verDetallesSorteo = (sorteo) => {
        Swal.fire({
            title: `📊 Detalles del Sorteo: ${sorteo.nombre}`,
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">📋 Información General</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <p class="text-sm text-gray-500">Número de sorteo</p>
                                <p class="font-medium">${sorteo.numero_sorteo || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Estado</p>
                                <p><span class="px-2 py-1 text-xs rounded-full ${getEstadoBadge(sorteo.estatus, sorteo.fecha).color}">
                                    ${getEstadoBadge(sorteo.estatus, sorteo.fecha).text}
                                </span></p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">💰 Configuración</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <p class="text-sm text-gray-500">Precio del boleto</p>
                                <p class="font-medium">${formatPrecio(sorteo.precio_boleto)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Comisión vendedor</p>
                                <p class="font-medium">${sorteo.comision_vendedor}%</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">🔢 Detalles Técnicos</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <p class="text-sm text-gray-500">Dígitos del boleto</p>
                                <p class="font-medium">${sorteo.digitos_boleto} dígitos</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-500">Fecha límite</p>
                                <p class="font-medium">${formatFecha(sorteo.fecha)}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${sorteo.descripcion ? `
                    <div class="bg-yellow-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">📝 Descripción</h4>
                        <p class="text-gray-600">${sorteo.descripcion}</p>
                    </div>
                    ` : ''}
                    
                    ${(sorteo.primer_premio || sorteo.segundo_premio) ? `
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-700 mb-2">🏆 Premios</h4>
                        ${sorteo.primer_premio ? `
                        <div class="mb-2">
                            <p class="text-sm text-gray-500">Primer premio</p>
                            <p class="font-medium">${sorteo.primer_premio}</p>
                        </div>
                        ` : ''}
                        ${sorteo.segundo_premio ? `
                        <div>
                            <p class="text-sm text-gray-500">Segundo premio</p>
                            <p class="font-medium">${sorteo.segundo_premio}</p>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                </div>
            `,
            showCloseButton: true,
            showConfirmButton: false,
            width: 600
        })
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">🎟️ Sorteos del Colegio</h1>
                            <p className="text-gray-600">Cargando sorteos...</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-center items-center p-12 bg-white rounded-xl shadow-lg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Cargando información de sorteos</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header con estadísticas */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Trophy className="text-yellow-500" />
                            Sorteos del Colegio
                        </h1>
                        <p className="text-gray-600">Consulta los sorteos activos y sus detalles</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={cargarSorteos}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar
                        </button>
                    </div>
                </div>
                
                {/* Estadísticas */}
                {estadisticas && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-blue-700 font-medium">Total de Sorteos</p>
                                    <p className="text-2xl font-bold text-blue-900">{estadisticas.total_sorteos}</p>
                                </div>
                                <Trophy className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-700 font-medium">Sorteos Activos</p>
                                    <p className="text-2xl font-bold text-green-900">{estadisticas.sorteos_activos}</p>
                                </div>
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-yellow-700 font-medium">Próximos a Finalizar</p>
                                    <p className="text-2xl font-bold text-yellow-900">{estadisticas.proximos_finalizar || 0}</p>
                                </div>
                                <span className="text-2xl">⏰</span>
                            </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-700 font-medium">Sorteos Cerrados</p>
                                    <p className="text-2xl font-bold text-gray-900">{estadisticas.sorteos_cerrados}</p>
                                </div>
                                <Calendar className="w-8 h-8 text-gray-500" />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Mensajes */}
                {mensaje && (
                    <div className={`mt-4 p-3 rounded-lg ${
                        mensaje.includes('✅') 
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {mensaje}
                    </div>
                )}
                
                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <strong>Error:</strong> {error}
                            </div>
                            <button 
                                onClick={cargarSorteos}
                                className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de Sorteos - SOLO LECTURA */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sorteo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Premios
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha Límite
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio Boleto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Comisión
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dígitos
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sorteos.map((sorteo) => {
                                const estado = getEstadoBadge(sorteo.estatus, sorteo.fecha)
                                return (
                                    <tr key={sorteo.id_sorteo} className="hover:bg-gray-50">
                                        {/* Nombre del Sorteo */}
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-4 h-4 text-gray-400" />
                                                    <div className="font-medium text-gray-900">{sorteo.nombre}</div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {sorteo.numero_sorteo}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Premios */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {sorteo.primer_premio && (
                                                    <div className="flex items-center gap-2">
                                                        <Award className="w-4 h-4 text-yellow-500" />
                                                        <span className="text-sm font-medium">1ro: {sorteo.primer_premio}</span>
                                                    </div>
                                                )}
                                                {sorteo.segundo_premio && (
                                                    <div className="flex items-center gap-2">
                                                        <Award className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm">2do: {sorteo.segundo_premio}</span>
                                                    </div>
                                                )}
                                                {!sorteo.primer_premio && !sorteo.segundo_premio && (
                                                    <span className="text-gray-400 text-sm">Sin premios definidos</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Fecha del Sorteo */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <span className="text-gray-700 text-sm block">
                                                        {formatFecha(sorteo.fecha)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {estado.icon} {estado.text}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Precio Boleto */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-green-500" />
                                                <span className="font-medium text-gray-900">
                                                    {formatPrecio(sorteo.precio_boleto)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Comisión Vendedor */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Percent className="w-4 h-4 text-blue-500" />
                                                <span className={`font-medium ${
                                                    sorteo.comision_vendedor > 0 ? 'text-blue-700' : 'text-gray-500'
                                                }`}>
                                                    {sorteo.comision_vendedor}%
                                                </span>
                                            </div>
                                        </td>

                                        {/* Dígitos Boleto */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-4 h-4 text-purple-500" />
                                                <span className="font-mono font-medium text-gray-900">
                                                    {sorteo.digitos_boleto} dígitos
                                                </span>
                                            </div>
                                        </td>

                                        {/* Estado */}
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${estado.color}`}>
                                                {estado.text}
                                            </span>
                                        </td>

                                        {/* Acciones - SOLO VER DETALLES */}
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => verDetallesSorteo(sorteo)}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                                title="Ver detalles completos del sorteo"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mensaje si no hay sorteos */}
                {sorteos.length === 0 && !error && (
                    <div className="text-center py-12">
                        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No hay sorteos registrados</h3>
                        <p className="text-gray-600 mt-1">Este colegio no tiene sorteos creados aún</p>
                        <button
                            onClick={cargarSorteos}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                )}
            </div>

            {/* Nota informativa sobre permisos */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Información de Solo Lectura
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 👁️ <strong>Solo visualización:</strong> Los administradores de colegio pueden ver los datos del sorteo pero no modificarlos</li>
                    <li>• 🔒 <strong>Configuración fija:</strong> La configuración inicial (dígitos, fecha límite) solo puede ser modificada por el superadmin</li>
                    <li>• 📊 <strong>Detalles completos:</strong> Haz clic en "Ver Detalles" para ver toda la información del sorteo</li>
                    <li>• ⚠️ <strong>Estado:</strong> Los sorteos se cierran automáticamente al alcanzar la fecha límite</li>
                </ul>
                <div className="mt-3 p-2 bg-white rounded border border-blue-300">
                    <p className="text-xs text-blue-800">
                        <strong>Nota:</strong> Si necesitas modificar algún dato del sorteo, contacta con el administrador del sistema (superadmin).
                    </p>
                </div>
            </div>
        </div>
    )
}