'use client'
import { useState, useEffect } from 'react'
import { 
    Pencil, 
    Save, 
    X, 
    Trophy, 
    Tag, 
    Percent, 
    Calendar,
    Award,
    DollarSign,
    Hash,
    Lock
} from 'lucide-react'

export default function SorteosManager({ colegioId }) {
    const [sorteos, setSorteos] = useState([])
    const [estadisticas, setEstadisticas] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [editandoId, setEditandoId] = useState(null)
    const [formData, setFormData] = useState({})
    const [mensaje, setMensaje] = useState('')

    // Cargar sorteos del colegio
    const cargarSorteos = async () => {
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
    }

    useEffect(() => {
        if (colegioId) {
            cargarSorteos()
        }
    }, [colegioId])

    // Iniciar edición
    const iniciarEdicion = (sorteo) => {
        setEditandoId(sorteo.id_sorteo)
        setFormData({
            nombre: sorteo.nombre || '',
            precio_boleto: sorteo.precio_boleto || 0,
            comision_vendedor: sorteo.comision_vendedor || 0,
            primer_premio: sorteo.primer_premio || '',
            segundo_premio: sorteo.segundo_premio || '',
            // NO incluimos digitos_boleto - solo superadmin puede editarlo
        })
    }

    // Cancelar edición
    const cancelarEdicion = () => {
        setEditandoId(null)
        setFormData({})
        setMensaje('')
    }

    // Guardar cambios
    const guardarCambios = async (sorteoId) => {
        try {
            setMensaje('Guardando cambios...')
            
            // Validar datos
            if (!formData.nombre || formData.nombre.trim() === '') {
                throw new Error('El nombre del sorteo es requerido')
            }
            
            if (formData.precio_boleto <= 0) {
                throw new Error('El precio del boleto debe ser mayor a 0')
            }
            
            if (formData.comision_vendedor < 0 || formData.comision_vendedor > 100) {
                throw new Error('La comisión debe estar entre 0% y 100%')
            }
            
            // PREPARAR DATOS PARA ENVIAR (solo los campos editables)
            const datosEnviar = {
                nombre: formData.nombre.trim(),
                precio_boleto: parseFloat(formData.precio_boleto) || 0,
                comision_vendedor: parseFloat(formData.comision_vendedor) || 0,
                primer_premio: formData.primer_premio?.trim() || '',
                segundo_premio: formData.segundo_premio?.trim() || '',
                // NO enviamos digitos_boleto - no editable desde aquí
            }
            
            console.log('Enviando datos para editar:', datosEnviar)
            
            const response = await fetch(`/api/sorteos/${sorteoId}/editar`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosEnviar)
            })
            
            const responseData = await response.json()
            
            if (!response.ok) {
                throw new Error(responseData.details || responseData.error || `Error ${response.status}`)
            }
            
            if (!responseData.success) {
                throw new Error(responseData.error || 'Error al guardar')
            }
            
            // Obtener el sorteo actualizado para mantener todos los campos
            setSorteos(prev => prev.map(s => {
                if (s.id_sorteo === sorteoId) {
                    return { 
                        ...s, 
                        ...datosEnviar,
                        // Mantener el campo digitos_boleto original
                        digitos_boleto: s.digitos_boleto,
                        id_sorteo: sorteoId
                    }
                }
                return s
            }))
            
            setEditandoId(null)
            setFormData({})
            setMensaje('✅ Cambios guardados correctamente')
            
            setTimeout(() => setMensaje(''), 3000)
            
        } catch (err) {
            console.error('Error guardando cambios:', err)
            setMensaje(`❌ ${err.message}`)
        }
    }

    // Manejar cambio en inputs
    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }))
    }

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

    // Verificar si se puede editar
    const puedeEditar = (sorteo) => {
        return sorteo.estatus === 'activo';
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">🎟️ Gestión de Sorteos</h1>
                            <p className="text-gray-600">Cargando sorteos del colegio...</p>
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
                            Gestión de Sorteos
                        </h1>
                        <p className="text-gray-600">Administra los sorteos del colegio</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={cargarSorteos}
                            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                        >
                            Actualizar Lista
                        </button>
                    </div>
                </div>
                
                {/* Estadísticas */}
                {estadisticas && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

            {/* Lista de Sorteos */}
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
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Precio
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
                            {sorteos.map((sorteo) => (
                                <tr key={sorteo.id_sorteo} className="hover:bg-gray-50">
                                    {/* Nombre del Sorteo */}
                                    <td className="px-6 py-4">
                                        {editandoId === sorteo.id_sorteo ? (
                                            <div>
                                                <input
                                                    type="text"
                                                    value={formData.nombre || ''}
                                                    onChange={(e) => handleChange('nombre', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    placeholder="Nombre del sorteo"
                                                    required
                                                />
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {sorteo.numero_sorteo}
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Tag className="w-4 h-4 text-gray-400" />
                                                    <div className="font-medium text-gray-900">{sorteo.nombre}</div>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {sorteo.numero_sorteo}
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Premios */}
                                    <td className="px-6 py-4">
                                        {editandoId === sorteo.id_sorteo ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Award className="w-4 h-4 text-yellow-500" />
                                                    <input
                                                        type="text"
                                                        value={formData.primer_premio || ''}
                                                        onChange={(e) => handleChange('primer_premio', e.target.value)}
                                                        className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                                                        placeholder="1er premio"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Award className="w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={formData.segundo_premio || ''}
                                                        onChange={(e) => handleChange('segundo_premio', e.target.value)}
                                                        className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                                                        placeholder="2do premio"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
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
                                        )}
                                    </td>

                                    {/* Fecha del Sorteo */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span className="text-gray-700 text-sm">{formatFecha(sorteo.fecha)}</span>
                                        </div>
                                    </td>

                                    {/* Precio Boleto */}
                                    <td className="px-6 py-4">
                                        {editandoId === sorteo.id_sorteo ? (
                                            <div className="flex items-center">
                                                <DollarSign className="w-4 h-4 text-gray-500 mr-1" />
                                                <input
                                                    type="number"
                                                    step="50"
                                                    min="0"
                                                    value={formData.precio_boleto || ''}
                                                    onChange={(e) => handleChange('precio_boleto', e.target.value)}
                                                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    required
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-green-500" />
                                                <span className="font-medium text-gray-900">
                                                    {formatPrecio(sorteo.precio_boleto)}
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Comisión Vendedor */}
                                    <td className="px-6 py-4">
                                        {editandoId === sorteo.id_sorteo ? (
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    max="100"
                                                    value={formData.comision_vendedor || ''}
                                                    onChange={(e) => handleChange('comision_vendedor', e.target.value)}
                                                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                                <span className="ml-1 text-gray-500">%</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Percent className="w-4 h-4 text-blue-500" />
                                                <span className={`font-medium ${
                                                    sorteo.comision_vendedor > 0 ? 'text-blue-700' : 'text-gray-500'
                                                }`}>
                                                    {sorteo.comision_vendedor}%
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Dígitos Boleto - SOLO LECTURA */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 group relative">
                                            <Hash className="w-4 h-4 text-purple-500" />
                                            <span className="font-mono font-medium text-gray-900">
                                                {sorteo.digitos_boleto} dígitos
                                            </span>
                                            <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Lock className="w-3 h-3" />
                                                    Solo superadmin puede editar
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            sorteo.estatus === 'activo' 
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {sorteo.estatus === 'activo' ? 'Activo' : 'Cerrado'}
                                        </span>
                                    </td>

                                    {/* Acciones */}
                                    <td className="px-6 py-4">
                                        {editandoId === sorteo.id_sorteo ? (
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => guardarCambios(sorteo.id_sorteo)}
                                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    Guardar
                                                </button>
                                                <button
                                                    onClick={cancelarEdicion}
                                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => iniciarEdicion(sorteo)}
                                                className={`flex items-center gap-1 px-3 py-2 rounded-md transition-colors text-sm ${
                                                    puedeEditar(sorteo)
                                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                }`}
                                                disabled={!puedeEditar(sorteo)}
                                                title={puedeEditar(sorteo) ? 'Editar sorteo' : 'Sorteo no editable'}
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Editar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
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

            {/* Nota sobre campos editables */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Permisos de edición
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• ✅ <strong>Campos editables:</strong> Nombre, Precio, Comisión, Premios</li>
                    <li>• 🔒 <strong>No editable desde aquí:</strong> Dígitos del boleto (solo superadmin)</li>
                    <li>• ⚠️ Solo puedes editar sorteos con estado "Activo"</li>
                    <li>• 📅 La fecha del sorteo no es editable</li>
                </ul>
            </div>
        </div>
    )
}