// src/components/custom/dashboard/SuperAdminColegioDetalle.js
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import useSession from '@/hook/useSession'
import Swal from 'sweetalert2'
import Link from 'next/link'
import Image from 'next/image';

export default function SuperAdminColegioDetalle({ colegioId, onBack }) {
    const router = useRouter()
    const session = useSession()
    
    // Estados principales
    const [colegio, setColegio] = useState(null)
    const [admin, setAdmin] = useState(null)
    const [sorteos, setSorteos] = useState([])
    const [estadisticas, setEstadisticas] = useState({
        total_sorteos: 0,
        sorteos_activos: 0,
        sorteos_cerrados: 0
    })
    const [loading, setLoading] = useState(true)
    
    // Estados para modales y edición
    const [editandoColegio, setEditandoColegio] = useState(false)
    const [editandoSorteoId, setEditandoSorteoId] = useState(null)
    const [mostrarNuevoSorteo, setMostrarNuevoSorteo] = useState(false)
    const [cargando, setCargando] = useState(false)
    
    // Formularios
    const { 
        register: registerColegio, 
        handleSubmit: handleSubmitColegio, 
        reset: resetColegio,
        formState: { errors: errorsColegio }
    } = useForm()
    
    const { 
        register: registerNuevoSorteo, 
        handleSubmit: handleSubmitNuevoSorteo, 
        reset: resetNuevoSorteo,
        formState: { errors: errorsNuevoSorteo }
    } = useForm({
        defaultValues: {
            nombre: '',
            fecha: '',
            precio_boleto: 100,
            comision_vendedor: 10,
            digitos_boleto: 5
        }
    })
    
    const { 
        register: registerEditarSorteo, 
        handleSubmit: handleSubmitEditarSorteo, 
        reset: resetEditarSorteo,
        formState: { errors: errorsEditarSorteo }
    } = useForm()

    // Función para cambiar solo el estatus
const cambiarEstatusColegio = async (nuevoEstatus) => {
    setCargando(true);
    try {
        const response = await fetch(`/api/colegios/${colegioId}/estatus`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                estatus: nuevoEstatus
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            Swal.fire({
                title: '¡Éxito!',
                text: result.message,
                icon: 'success',
                timer: 2000
            });
            
            // Actualizar estado local
            setColegio(prev => ({
                ...prev,
                estatus: nuevoEstatus
            }));
            
            // Recargar datos
            cargarDatosCompletos();
        } else {
            throw new Error(result.details || result.error);
        }
    } catch (error) {
        console.error('Error cambiando estatus:', error);
        Swal.fire({
            title: 'Error',
            text: error.message || 'Error al cambiar el estatus',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    } finally {
        setCargando(false);
    }
};

    const cargarDatosCompletos = useCallback(async () => {
        if (!colegioId) return;
        
        try {
            setLoading(true)
            
            // 1. Cargar colegio
            const colegioRes = await fetch(`/api/colegios/${colegioId}`)
            if (!colegioRes.ok) {
                throw new Error('Error cargando colegio')
            }
            const colegioData = await colegioRes.json()
            setColegio(colegioData)
            
            resetColegio({
                nombre: colegioData.nombre || '',
                logo_url: colegioData.logo_url || '',
                estatus: colegioData.estatus || 'activo',
                configuracion: colegioData.configuracion || '{}'
            })
            
            // 2. Cargar admin del colegio (OPCIONAL)
            try {
                const adminRes = await fetch(`/api/usuarios/colegio/${colegioId}/admin`)
                if (adminRes.ok) {
                    const adminData = await adminRes.json()
                    setAdmin(adminData.admin || adminData)
                }
            } catch (adminError) {
                console.warn('No se pudo cargar admin:', adminError)
                setAdmin(null)
            }
            
            // 3. Cargar sorteos del colegio
            const sorteosRes = await fetch(`/api/sorteos/colegio/${colegioId}`)
            if (sorteosRes.ok) {
                const sorteosData = await sorteosRes.json()
                setSorteos(sorteosData.sorteos || [])
                setEstadisticas(sorteosData.estadisticas || {
                    total_sorteos: 0,
                    sorteos_activos: 0,
                    sorteos_cerrados: 0
                })
            }
            
        } catch (error) {
            console.error('Error cargando datos:', error)
            // MOVER Swal.fire a un setTimeout para evitar problemas de render
            setTimeout(() => {
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudieron cargar los datos del colegio',
                    icon: 'error',
                    confirmButtonText: 'Volver'
                }).then(() => {
                    if (onBack) onBack()
                    else router.push('/superadmin/dashboard')
                })
            }, 0)
        } finally {
            setLoading(false)
        }
    }, [colegioId, onBack, router, resetColegio])

    useEffect(() => {
        if (colegioId) {
            cargarDatosCompletos()
        }
    }, [colegioId, cargarDatosCompletos])

    // Función para editar colegio
    const onSubmitEditarColegio = async (data) => {
        setCargando(true)
        try {
            const response = await fetch(`/api/colegios/${colegioId}/editar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: data.nombre,
                    logo_url: data.logo_url || null,
                    configuracion: data.configuracion,
                    estatus: data.estatus
                })
            })
            
            const result = await response.json()
            
            if (response.ok) {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Colegio actualizado correctamente',
                    icon: 'success',
                    timer: 2000
                })
                setColegio(result.colegio)
                setEditandoColegio(false)
                cargarDatosCompletos()
            } else {
                throw new Error(result.details || result.error)
            }
        } catch (error) {
            console.error('Error editando colegio:', error)
            Swal.fire({
                title: 'Error',
                text: error.message || 'Error al actualizar el colegio',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        } finally {
            setCargando(false)
        }
    }

    // Función para crear nuevo sorteo
    const onSubmitNuevoSorteo = async (data) => {
        setCargando(true)
        try {
            const response = await fetch('/api/sorteos/crear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    colegio_id: colegioId,
                    nombre: data.nombre,
                    fecha: data.fecha,
                    numero_sorteo: data.numero_sorteo.trim(),
                    precio_boleto: parseFloat(data.precio_boleto),
                    comision_vendedor: parseFloat(data.comision_vendedor),
                    digitos_boleto: parseInt(data.digitos_boleto)
                })
            })
            
            const result = await response.json()
            
            if (response.ok) {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Sorteo creado correctamente',
                    icon: 'success',
                    timer: 2000
                })
                setMostrarNuevoSorteo(false)
                resetNuevoSorteo()
                cargarDatosCompletos()
            } else {
                throw new Error(result.details || result.error)
            }
        } catch (error) {
            console.error('Error creando sorteo:', error)
            Swal.fire({
                title: 'Error',
                text: error.message || 'Error al crear el sorteo',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        } finally {
            setCargando(false)
        }
    }

     // Función para editar sorteo
    const onSubmitEditarSorteo = async (data) => {
        if (!editandoSorteoId) return
        
        setCargando(true)
        try {
            const response = await fetch(`/api/sorteos/${editandoSorteoId}/editar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: data.nombre,
                    fecha: data.fecha,
                    primer_premio: data.primer_premio,
                    segundo_premio: data.segundo_premio,
                    estatus: data.estatus,
                    precio_boleto: parseFloat(data.precio_boleto),
                    comision_vendedor: parseFloat(data.comision_vendedor),
                    digitos_boleto: parseInt(data.digitos_boleto),
                    numero_sorteo: data.numero_sorteo.trim()
                })
            })
            
            const result = await response.json()
            
            if (response.ok) {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Sorteo actualizado correctamente',
                    icon: 'success',
                    timer: 2000
                })
                setEditandoSorteoId(null)
                resetEditarSorteo()
                cargarDatosCompletos()
            } else {
                throw new Error(result.details || result.error)
            }
        } catch (error) {
            console.error('Error editando sorteo:', error)
            Swal.fire({
                title: 'Error',
                text: error.message || 'Error al actualizar el sorteo',
                icon: 'error',
                confirmButtonText: 'OK'
            })
        } finally {
            setCargando(false)
        }
    }

     // Preparar edición de sorteo
    const prepararEdicionSorteo = (sorteo) => {
        setEditandoSorteoId(sorteo.id_sorteo)
        resetEditarSorteo({
            nombre: sorteo.nombre,
            fecha: sorteo.fecha ? sorteo.fecha.split('T')[0] : '',
            primer_premio: sorteo.primer_premio || '',
            segundo_premio: sorteo.segundo_premio || '',
            estatus: sorteo.estatus || 'activo',
            precio_boleto: sorteo.precio_boleto || 100,
            comision_vendedor: sorteo.comision_vendedor || 10,
            digitos_boleto: sorteo.digitos_boleto || 5,
            numero_sorteo: sorteo.numero_sorteo || ''
        })
    }

    // Formatear fecha
    const formatearFecha = (fechaString) => {
        if (!fechaString) return 'No definida'
        try {
            const fecha = new Date(fechaString)
            return fecha.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return 'Fecha inválida'
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute top-0 left-0 animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500"></div>
                    </div>
                    <div className="mt-4 text-lg font-semibold text-gray-700">Cargando datos...</div>
                </div>
            </div>
        )
    }

    if (!colegio) {
        return (
            <div className="text-center py-12">
                <div className="text-2xl font-bold text-gray-700 mb-4">Colegio no encontrado</div>
                <button
                    onClick={() => onBack ? onBack() : router.push('/superadmin/dashboard')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Volver
                </button>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="bg-white shadow-md rounded-lg mb-6">
                <div className="p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <button
                                onClick={() => onBack ? onBack() : router.push('/superadmin/dashboard')}
                                className="flex items-center text-blue-600 hover:text-blue-800 mb-2 text-sm"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Volver
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {colegio.nombre}
                            </h1>
                            <div className="flex items-center gap-4 mt-1">
                                <p className="text-gray-600 text-sm">ID: {colegio.id_colegio}</p>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    colegio.estatus === 'activo'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {colegio.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                                </span>
                                {/*Enlace al módulo online */}
                                <a
                                    href={`/online?colegio=${colegio.id_colegio}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium hover:bg-purple-200 transition-colors flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Sorteo en linea
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {colegio.logo_url && (
                                <Image 
                                    src={colegio.logo_url} 
                                    alt={colegio.nombre}
                                    width={120}
                                    height={120}
                                    className="w-12 h-12 rounded-full border"
                                    onError={(e) => {
                                        e.target.style.display = 'none'
                                        e.target.nextElementSibling.style.display = 'flex'
                                    }}
                                />
                            )}
                            <div className={`w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold ${colegio.logo_url ? 'hidden' : 'flex'}`}>
                                {colegio.nombre?.charAt(0) || 'C'}
                            </div>
                            <button
                                onClick={() => setEditandoColegio(!editandoColegio)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                {editandoColegio ? 'Cancelar' : 'Editar Colegio'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna izquierda: Información del colegio */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Sección: Información del colegio */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            Información del Colegio
                        </h2>
                        
                        {editandoColegio ? (
                            <form onSubmit={handleSubmitColegio(onSubmitEditarColegio)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre del Colegio *
                                    </label>
                                    <input
                                        {...registerColegio('nombre', { 
                                            required: 'El nombre es requerido'
                                        })}
                                        type="text"
                                        className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errorsColegio.nombre ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        URL del Logo (opcional)
                                    </label>
                                    <input
                                        {...registerColegio('logo_url')}
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                {/* En la sección de información del colegio */}
                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        onClick={() => cambiarEstatusColegio(
                                            colegio.estatus === 'activo' ? 'inactivo' : 'activo'
                                        )}
                                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                            colegio.estatus === 'activo'
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                        }`}
                                        disabled={cargando}
                                    >
                                        {cargando ? 'Cambiando...' : 
                                            colegio.estatus === 'activo' 
                                                ? 'Desactivar Colegio' 
                                                : 'Activar Colegio'
                                        }
                                    </button>
                                    
                                    <span className="text-sm text-gray-500">
                                        {colegio.estatus === 'activo' 
                                            ? 'El colegio está activo y visible'
                                            : 'El colegio está inactivo y oculto'
                                        }
                                    </span>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Configuración (JSON)
                                    </label>
                                    <textarea
                                        {...registerColegio('configuracion')}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                                    />
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditandoColegio(false)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                                        disabled={cargando}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={cargando}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {cargando ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Nombre</p>
                                        <p className="font-medium truncate">{colegio.nombre}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Registro</p>
                                        <p className="font-medium text-sm">
                                            {new Date(colegio.created_at).toLocaleDateString('es-ES')}
                                        </p>
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-sm text-gray-500">Logo URL</p>
                                    <p className="font-medium text-sm truncate">{colegio.logo_url || 'No definido'}</p>
                                </div>
                                
                                {colegio.configuracion && colegio.configuracion !== '{}' && (
                                    <div className="mt-3">
                                        <p className="text-sm text-gray-500 mb-1">Configuración</p>
                                        <div className="bg-gray-50 p-3 rounded border overflow-x-auto">
                                            <pre className="text-xs font-mono">
                                                {(function() {
                                                    try {
                                                        const config = colegio.configuracion;
                                                        if (!config || config === '{}') return '{}';
                                                        if (typeof config === 'object') return JSON.stringify(config, null, 2);
                                                        return JSON.stringify(JSON.parse(config), null, 2);
                                                    } catch {
                                                        return colegio.configuracion || '{}';
                                                    }
                                                })()}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sección: Sorteos del colegio */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">
                                    Sorteos del Colegio
                                </h2>
                                <p className="text-gray-600 text-xs mt-1">
                                    {estadisticas.total_sorteos} total • 
                                    <span className="text-green-600 ml-1">{estadisticas.sorteos_activos} activos</span> • 
                                    <span className="text-red-600 ml-1">{estadisticas.sorteos_cerrados} cerrados</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setMostrarNuevoSorteo(true)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Nuevo Sorteo
                            </button>
                        </div>
                        
                        {sorteos.length === 0 ? (
                            <div className="text-center py-6 border border-dashed border-gray-300 rounded">
                                <div className="text-gray-400 text-3xl mb-2">🎟️</div>
                                <p className="text-gray-500 text-sm">No hay sorteos registrados</p>
                                <button
                                    onClick={() => setMostrarNuevoSorteo(true)}
                                    className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                                >
                                    Crear primer sorteo
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sorteos.map((sorteo) => (
                                    <div key={sorteo.id_sorteo} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        sorteo.estatus === 'activo' 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {sorteo.estatus}
                                                    </span>
                                                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                        {sorteo.numero_sorteo}
                                                    </span>
                                                </div>
                                                <h3 className="font-semibold text-gray-900 text-sm">{sorteo.nombre}</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 mt-2 text-xs">
                                                    <div>
                                                        <p className="text-gray-500">Fecha</p>
                                                        <p className="font-medium">{formatearFecha(sorteo.fecha)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Precio</p>
                                                        <p className="font-medium">${sorteo.precio_boleto}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Comisión</p>
                                                        <p className="font-medium">{sorteo.comision_vendedor}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-500">Dígitos</p>
                                                        <p className="font-medium">{sorteo.digitos_boleto}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => prepararEdicionSorteo(sorteo)}
                                                className="ml-3 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Columna derecha: Sidebar */}
                <div className="space-y-6">
                    {/* Estadísticas */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            📊 Estadísticas
                        </h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                                <div>
                                    <p className="text-xs text-gray-600">Sorteos Totales</p>
                                    <p className="text-xl font-bold text-blue-700">{estadisticas.total_sorteos}</p>
                                </div>
                                <div className="text-xl">🎯</div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                                <div>
                                    <p className="text-xs text-gray-600">Sorteos Activos</p>
                                    <p className="text-xl font-bold text-green-700">{estadisticas.sorteos_activos}</p>
                                </div>
                                <div className="text-xl">✅</div>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                                <div>
                                    <p className="text-xs text-gray-600">Sorteos Cerrados</p>
                                    <p className="text-xl font-bold text-red-700">{estadisticas.sorteos_cerrados}</p>
                                </div>
                                <div className="text-xl">⏹️</div>
                            </div>
                        </div>
                    </div>

                    {/* Administrador */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            👨‍💼 Administrador
                        </h2>
                        {admin ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                        {admin.nombre?.charAt(0) || 'A'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{admin.nombre}</p>
                                        <p className="text-xs text-gray-600">{admin.usuario}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-xs">Estatus:</span>
                                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                            admin.estatus === 'activo' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {admin.estatus || 'activo'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 text-xs">Rol:</span>
                                        <span className="font-medium text-xs">Admin Colegio</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-3">
                                <p className="text-gray-500 text-sm">Admin no encontrado</p>
                            </div>
                        )}
                    </div>

                    {/* Acciones rápidas */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            ⚡ Acciones
                        </h2>
                        <div className="space-y-2">
                            <button
                                onClick={() => setMostrarNuevoSorteo(true)}
                                className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex items-center justify-between text-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-base">🎟️</span>
                                    Crear sorteo
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(colegioId)
                                    Swal.fire({
                                        title: '¡Copiado!',
                                        text: 'ID del colegio copiado',
                                        icon: 'success',
                                        timer: 1500
                                    })
                                }}
                                className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors flex items-center justify-between text-sm"
                            >
                                <span className="flex items-center gap-2">
                                    <span className="text-base">📋</span>
                                    Copiar ID
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Nuevo Sorteo */}
            {mostrarNuevoSorteo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Nuevo Sorteo</h2>
                                <button
                                    onClick={() => {
                                        setMostrarNuevoSorteo(false)
                                        resetNuevoSorteo()
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmitNuevoSorteo(onSubmitNuevoSorteo)} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre *
                                    </label>
                                    <input
                                        {...registerNuevoSorteo('nombre', { required: true })}
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha *
                                    </label>
                                    <input
                                        {...registerNuevoSorteo('fecha', { required: true })}
                                        type="date"
                                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Número de Sorteo (Lotería) *
                                    </label>
                                    <input
                                        {...registerNuevoSorteo('numero_sorteo', {
                                            required: 'El número de sorteo es obligatorio',
                                            pattern: {
                                                value: /^[A-Za-z0-9-]+$/,
                                                message: 'Solo letras, números y guiones'
                                            }
                                        })}
                                        type="text"
                                        placeholder="Ej: LOT-2026-01"
                                        className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errorsNuevoSorteo.numero_sorteo ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errorsNuevoSorteo.numero_sorteo && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errorsNuevoSorteo.numero_sorteo.message}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Precio $
                                        </label>
                                        <input
                                            {...registerNuevoSorteo('precio_boleto')}
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Comisión %
                                        </label>
                                        <input
                                            {...registerNuevoSorteo('comision_vendedor')}
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Dígitos
                                        </label>
                                        <input
                                            {...registerNuevoSorteo('digitos_boleto')}
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMostrarNuevoSorteo(false)
                                            resetNuevoSorteo()
                                        }}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                                        disabled={cargando}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={cargando}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {cargando ? 'Creando...' : 'Crear'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Editar Sorteo */}
            {editandoSorteoId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Editar Sorteo</h2>
                                <button
                                    onClick={() => {
                                        setEditandoSorteoId(null)
                                        resetEditarSorteo()
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <form onSubmit={handleSubmitEditarSorteo(onSubmitEditarSorteo)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre *
                                        </label>
                                        <input
                                            {...registerEditarSorteo('nombre', { required: true })}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Estatus *
                                        </label>
                                        <select
                                            {...registerEditarSorteo('estatus', { required: true })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="activo">Activo</option>
                                            <option value="cerrado">Cerrado</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha *
                                    </label>
                                    <input
                                        {...registerEditarSorteo('fecha', { required: true })}
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Número de Sorteo (Lotería) *
                                    </label>
                                    <input
                                        {...registerEditarSorteo('numero_sorteo', { required: true })}
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ej: 1234"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Primer Premio
                                        </label>
                                        <input
                                            {...registerEditarSorteo('primer_premio')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Segundo Premio
                                        </label>
                                        <input
                                            {...registerEditarSorteo('segundo_premio')}
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Precio $
                                        </label>
                                        <input
                                            {...registerEditarSorteo('precio_boleto')}
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Comisión %
                                        </label>
                                        <input
                                            {...registerEditarSorteo('comision_vendedor')}
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Dígitos
                                        </label>
                                        <input
                                            {...registerEditarSorteo('digitos_boleto')}
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditandoSorteoId(null)
                                            resetEditarSorteo()
                                        }}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                                        disabled={cargando}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={cargando}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {cargando ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}