// src/components/custom/dashboard/SuperAdminAdminsManager.js
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSession from '@/hook/useSession'
import Swal from 'sweetalert2'

export default function SuperAdminAdminsManager() {
    const session = useSession()
    const router = useRouter()
    const [admins, setAdmins] = useState([])
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        activos: 0,
        inactivos: 0
    })
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('')
    const [colegioFiltro, setColegioFiltro] = useState('')
    const [colegios, setColegios] = useState([])
    const [passwords, setPasswords] = useState({});
    
    // Estado para modal de edición
    const [editandoAdmin, setEditandoAdmin] = useState(null)
    const [formEdit, setFormEdit] = useState({
        nombre: '',
        usuario: '',
        estatus: 'activo'
    })
    const [guardando, setGuardando] = useState(false)
    
    // Estado para mostrar contraseña
    const [mostrandoPassword, setMostrandoPassword] = useState(null)
    const [passwordVisible, setPasswordVisible] = useState({})
    const [cargandoPassword, setCargandoPassword] = useState({})
    
    // Usar useRef para controlar las cargas
    const hasLoadedAdmins = useRef(false)
    const hasLoadedColegios = useRef(false)
    const authChecked = useRef(false)

    // Verificar autenticación
    useEffect(() => {
        if (!session.isLoggedIn() || !session.isSuperAdmin()) {
            router.push('/loginAdmin')
            return
        }
        authChecked.current = true
    }, [session, router])

    // Cargar datos iniciales una sola vez
    useEffect(() => {
        if (authChecked.current && !hasLoadedAdmins.current) {
            cargarAdmins()
            hasLoadedAdmins.current = true
        }
        
        if (authChecked.current && !hasLoadedColegios.current) {
            cargarColegios()
            hasLoadedColegios.current = true
        }
    }, [authChecked.current])

    // Cargar administradores cuando cambia el filtro de colegio
    useEffect(() => {
        if (authChecked.current) {
            cargarAdmins()
        }
    }, [colegioFiltro])

    const cargarAdmins = async () => {
        try {
            setLoading(true)
            const url = colegioFiltro 
                ? `/api/usuarios/admins?colegio_id=${colegioFiltro}`
                : '/api/usuarios/admins'
            
            const response = await fetch(url)
            if (response.ok) {
                const data = await response.json()
                setAdmins(data.admins || [])
                setEstadisticas(data.estadisticas || { total: 0, activos: 0, inactivos: 0 })
                
                // Resetear estados de contraseña
                setMostrandoPassword(null)
                setPasswordVisible({})
                setCargandoPassword({})
                setPasswords({}) // Limpiar contraseñas almacenadas
            }
        } catch (error) {
            console.error('Error cargando administradores:', error)
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron cargar los administradores',
                icon: 'error'
            })
        } finally {
            setLoading(false)
        }
    }

    const cargarColegios = async () => {
        try {
            const response = await fetch('/api/colegios')
            if (response.ok) {
                const data = await response.json()
                // Asegurarse de que sea un array
                if (Array.isArray(data)) {
                    setColegios(data)
                } else if (data && Array.isArray(data.data)) {
                    // Si la respuesta tiene formato { data: [...] }
                    setColegios(data.data)
                } else if (data && data.colegios) {
                    // Si la respuesta tiene formato { colegios: [...] }
                    setColegios(data.colegios)
                } else if (data && Array.isArray(data.colegiosList)) {
                    // Si la respuesta tiene formato { colegiosList: [...] }
                    setColegios(data.colegiosList)
                } else {
                    console.error('Formato de respuesta inesperado de /api/colegios:', data)
                    setColegios([])
                }
            } else {
                console.error('Error en la respuesta de /api/colegios:', response.status)
                setColegios([])
            }
        } catch (error) {
            console.error('Error cargando colegios:', error)
            setColegios([])
        }
    }

    // Función para mostrar/ocultar contraseña
    const toggleMostrarPassword = async (adminId) => {
        try {
            // Si ya está visible, ocultarla
            if (passwordVisible[adminId]) {
                setPasswordVisible(prev => ({...prev, [adminId]: false}));
                setMostrandoPassword(null);
                return;
            }
            
            // Si ya tenemos la contraseña guardada, solo mostrarla
            if (passwords[adminId]) {
                setPasswordVisible(prev => ({...prev, [adminId]: true}));
                setMostrandoPassword(adminId);
                
                // Establecer temporizador para ocultar automáticamente (30 segundos)
                setTimeout(() => {
                    setPasswordVisible(prev => ({...prev, [adminId]: false}));
                    setMostrandoPassword(null);
                }, 30000);
                return;
            }
            
            // Mostrar indicador de carga
            setCargandoPassword(prev => ({...prev, [adminId]: true}));
            
            console.log('🔍 Solicitando contraseña para admin:', adminId);
            
            // Obtener contraseña
            const response = await fetch(`/api/usuarios/${adminId}/password`);
            const data = await response.json();
            
            console.log('📥 Respuesta del endpoint:', data);
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error obteniendo contraseña');
            }
            
            if (!data.password) {
                throw new Error('No se encontró contraseña');
            }
            
            // Guardar la contraseña en el estado passwords
            setPasswords(prev => ({...prev, [adminId]: data.password}));
            
            // Mostrar la contraseña
            setPasswordVisible(prev => ({...prev, [adminId]: true}));
            setMostrandoPassword(adminId);
            
            // Establecer temporizador para ocultar automáticamente (30 segundos)
            setTimeout(() => {
                setPasswordVisible(prev => ({...prev, [adminId]: false}));
                setMostrandoPassword(null);
            }, 30000);
            
        } catch (error) {
            console.error('❌ Error al obtener contraseña:', error);
            Swal.fire({
                title: 'Error',
                text: error.message || 'No se pudo obtener la contraseña',
                icon: 'error',
                timer: 3000
            });
        } finally {
            setCargandoPassword(prev => ({...prev, [adminId]: false}));
        }
    };

    // Función para abrir modal de edición
    const abrirEdicionAdmin = (admin) => {
        setEditandoAdmin(admin)
        setFormEdit({
            nombre: admin.nombre || '',
            usuario: admin.usuario || '',
            estatus: admin.estatus || 'activo'
        })
    }

    // Función para cerrar modal de edición
    const cerrarEdicionAdmin = () => {
        setEditandoAdmin(null)
        setFormEdit({
            nombre: '',
            usuario: '',
            estatus: 'activo'
        })
        setGuardando(false)
    }

    // Función para guardar cambios
    const guardarEdicionAdmin = async () => {
        if (!editandoAdmin) return
        
        // Validaciones
        if (!formEdit.nombre.trim()) {
            Swal.fire({
                title: 'Error',
                text: 'El nombre es requerido',
                icon: 'error'
            })
            return
        }
        
        if (!formEdit.usuario.trim()) {
            Swal.fire({
                title: 'Error',
                text: 'El usuario es requerido',
                icon: 'error'
            })
            return
        }
        
        setGuardando(true)
        
        try {
            const response = await fetch(`/api/usuarios/${editandoAdmin.id_usuario}/editar`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formEdit)
            })
            
            const result = await response.json()
            
            if (response.ok) {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Administrador actualizado correctamente',
                    icon: 'success',
                    timer: 2000
                })
                
                // Actualizar lista
                cargarAdmins()
                cerrarEdicionAdmin()
            } else {
                throw new Error(result.error || result.details)
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: error.message || 'No se pudo actualizar el administrador',
                icon: 'error'
            })
        } finally {
            setGuardando(false)
        }
    }

    const handleResetPassword = async (adminId, adminNombre) => {
        const { value: newPassword } = await Swal.fire({
            title: `Restablecer contraseña para ${adminNombre}`,
            input: 'text',
            inputLabel: 'Nueva contraseña',
            inputPlaceholder: 'Ingresa la nueva contraseña',
            showCancelButton: true,
            confirmButtonText: 'Restablecer',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || value.length < 6) {
                    return 'La contraseña debe tener al menos 6 caracteres'
                }
            }
        })

        if (newPassword) {
            try {
                const response = await fetch(`/api/usuarios/${adminId}/reset-password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ password: newPassword })
                })

                const result = await response.json()
                
                if (response.ok) {
                    Swal.fire({
                        title: '¡Éxito!',
                        text: 'Contraseña restablecida correctamente',
                        icon: 'success',
                        timer: 2000
                    })
                    
                    // Resetear la contraseña visible si estaba mostrándose
                    setPasswordVisible(prev => ({...prev, [adminId]: false}))
                    setMostrandoPassword(null)
                    // Eliminar la contraseña almacenada
                    setPasswords(prev => {
                        const newPasswords = {...prev}
                        delete newPasswords[adminId]
                        return newPasswords
                    })
                } else {
                    throw new Error(result.error || result.details)
                }
            } catch (error) {
                Swal.fire({
                    title: 'Error',
                    text: error.message || 'No se pudo restablecer la contraseña',
                    icon: 'error'
                })
            }
        }
    }

    const handleToggleEstatus = async (admin) => {
        const nuevoEstatus = admin.estatus === 'activo' ? 'inactivo' : 'activo'
        const accion = nuevoEstatus === 'activo' ? 'activar' : 'desactivar'
        
        Swal.fire({
            title: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} administrador?`,
            text: `Estás a punto de ${accion} a ${admin.nombre}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, ${accion}`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: nuevoEstatus === 'activo' ? '#10B981' : '#EF4444'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/api/usuarios/${admin.id_usuario}/estatus`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ estatus: nuevoEstatus })
                    })

                    const resultData = await response.json()
                    
                    if (response.ok) {
                        Swal.fire({
                            title: '¡Éxito!',
                            text: `Administrador ${accion}do correctamente`,
                            icon: 'success',
                            timer: 2000
                        })
                        // Recargar administradores
                        cargarAdmins()
                    } else {
                        throw new Error(resultData.error || resultData.details)
                    }
                } catch (error) {
                    Swal.fire({
                        title: 'Error',
                        text: error.message || 'No se pudo cambiar el estatus',
                        icon: 'error'
                    })
                }
            }
        })
    }

    // Filtrar administradores localmente (para búsqueda en tiempo real)
    const adminsFiltrados = admins.filter(admin => {
        if (!filtro) return true
        
        const buscaTexto = filtro.toLowerCase()
        const coincideNombre = admin.nombre?.toLowerCase().includes(buscaTexto)
        const coincideUsuario = admin.usuario?.toLowerCase().includes(buscaTexto)
        const coincideColegio = admin.colegio_nombre?.toLowerCase().includes(buscaTexto)
        
        return coincideNombre || coincideUsuario || coincideColegio
    })

    if (loading && admins.length === 0) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header con botón de volver */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <button
                            onClick={() => router.push('/superadmin/dashboard')}
                            className="flex items-center text-blue-600 hover:text-blue-800 mb-4 text-sm"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Volver al Dashboard
                        </button>
                        
                        <h1 className="text-2xl font-bold text-gray-900">👨‍💼 Administradores de Colegios</h1>
                        <p className="text-gray-600">Gestiona los administradores de todos los colegios</p>
                    </div>
                    <div className="text-sm text-gray-500">
                        Mostrando {adminsFiltrados.length} de {admins.length} administradores
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Buscar administrador
                        </label>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, usuario o colegio..."
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por colegio
                        </label>
                        <select
                            value={colegioFiltro}
                            onChange={(e) => setColegioFiltro(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos los colegios</option>
                            {Array.isArray(colegios) && colegios.length > 0 ? (
                                colegios.map(colegio => (
                                    <option key={colegio.id_colegio} value={colegio.id_colegio}>
                                        {colegio.nombre}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>
                                    {colegios.length === 0 ? 'Cargando colegios...' : 'No hay colegios disponibles'}
                                </option>
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-600">Total Administradores</p>
                            <p className="text-2xl font-bold text-gray-900">{estadisticas.total}</p>
                        </div>
                        <div className="text-2xl">👥</div>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-600">Activos</p>
                            <p className="text-2xl font-bold text-green-700">{estadisticas.activos}</p>
                        </div>
                        <div className="text-2xl">✅</div>
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-600">Inactivos</p>
                            <p className="text-2xl font-bold text-red-700">{estadisticas.inactivos}</p>
                        </div>
                        <div className="text-2xl">⏸️</div>
                    </div>
                </div>
            </div>

            {/* Lista de administradores */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Administrador
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Credenciales
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Colegio
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estatus
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Registro
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {adminsFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center">
                                        <div className="text-gray-500">
                                            {loading ? (
                                                <div className="flex justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                                                </div>
                                            ) : filtro || colegioFiltro ? (
                                                <div>
                                                    <div className="text-lg mb-2">🔍</div>
                                                    <p>No se encontraron administradores con los filtros aplicados</p>
                                                    <button
                                                        onClick={() => {
                                                            setFiltro('')
                                                            setColegioFiltro('')
                                                        }}
                                                        className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                                    >
                                                        Limpiar filtros
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="text-lg mb-2">👨‍💼</div>
                                                    <p>No hay administradores registrados</p>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                adminsFiltrados.map((admin) => (
                                    <tr key={admin.id_usuario} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-800 text-sm font-bold">
                                                        {admin.nombre?.charAt(0) || 'A'}
                                                    </div>
                                                    {admin.nombre}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="text-xs text-gray-500">Usuario</div>
                                                    <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                                        {admin.usuario}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500">Contraseña</div>
                                                    <div className="flex items-center gap-1">
                                                        {passwordVisible[admin.id_usuario] ? (
                                                            <div className="flex items-center gap-1 w-full">
                                                                <div className="font-mono text-sm bg-yellow-50 px-2 py-1 rounded border border-yellow-200 flex-1 break-all min-h-[2rem] flex items-center">
                                                                    {passwords[admin.id_usuario] || "Cargando..."}
                                                                </div>
                                                                <button
                                                                    onClick={() => toggleMostrarPassword(admin.id_usuario)}
                                                                    className="p-1 text-yellow-600 hover:text-yellow-800 flex-shrink-0"
                                                                    title="Ocultar contraseña"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 w-full">
                                                                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded flex-1 min-h-[2rem] flex items-center">
                                                                    ••••••••
                                                                </div>
                                                                <button
                                                                    onClick={() => toggleMostrarPassword(admin.id_usuario)}
                                                                    className="p-1 text-gray-500 hover:text-gray-700 relative flex-shrink-0"
                                                                    title="Mostrar contraseña"
                                                                    disabled={cargandoPassword[admin.id_usuario]}
                                                                >
                                                                    {cargandoPassword[admin.id_usuario] ? (
                                                                        <div className="w-4 h-4 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                                                                    ) : (
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {passwordVisible[admin.id_usuario] && (
                                                        <div className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                            </svg>
                                                            La contraseña se ocultará automáticamente en 30 segundos
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {admin.colegio_nombre || `ID: ${admin.colegio_id}`}
                                                </div>
                                                {admin.colegio_id && (
                                                    <button
                                                        onClick={() => router.push(`/superadmin/colegios/${admin.colegio_id}`)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
                                                    >
                                                        Ver colegio →
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                admin.estatus === 'activo'
                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                    : 'bg-red-100 text-red-800 border border-red-200'
                                            }`}>
                                                {admin.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {admin.created_at 
                                                    ? new Date(admin.created_at).toLocaleDateString('es-ES')
                                                    : 'N/A'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {admin.created_at 
                                                    ? new Date(admin.created_at).toLocaleTimeString('es-ES', { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit' 
                                                    })
                                                    : ''}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => abrirEdicionAdmin(admin)}
                                                    className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded text-sm hover:bg-yellow-100 transition-colors flex items-center gap-1"
                                                    title="Editar administrador"
                                                >
                                                    <span>✏️</span>
                                                    <span className="hidden sm:inline">Editar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleResetPassword(admin.id_usuario, admin.nombre)}
                                                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100 transition-colors flex items-center gap-1"
                                                    title="Restablecer contraseña"
                                                >
                                                    <span>🔑</span>
                                                    <span className="hidden sm:inline">Cambiar</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleEstatus(admin)}
                                                    className={`px-3 py-1 rounded text-sm transition-colors flex items-center gap-1 ${
                                                        admin.estatus === 'activo'
                                                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                                            : 'bg-green-50 text-green-700 hover:bg-green-100'
                                                    }`}
                                                    title={admin.estatus === 'activo' ? 'Desactivar' : 'Activar'}
                                                >
                                                    <span>{admin.estatus === 'activo' ? '⏸️' : '▶️'}</span>
                                                    <span className="hidden sm:inline">
                                                        {admin.estatus === 'activo' ? 'Desactivar' : 'Activar'}
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Botón adicional para volver al inicio */}
            <div className="flex justify-center">
                <button
                    onClick={() => router.push('/superadmin/dashboard')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver al Dashboard Principal
                </button>
            </div>

            {/* Modal de edición de administrador */}
            {editandoAdmin && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    ✏️ Editar Administrador
                                </h2>
                                <button
                                    onClick={cerrarEdicionAdmin}
                                    className="text-gray-400 hover:text-gray-600"
                                    disabled={guardando}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo *
                                    </label>
                                    <input
                                        type="text"
                                        value={formEdit.nombre}
                                        onChange={(e) => setFormEdit({...formEdit, nombre: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ej: Juan Pérez"
                                        disabled={guardando}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre de usuario *
                                    </label>
                                    <input
                                        type="text"
                                        value={formEdit.usuario}
                                        onChange={(e) => setFormEdit({...formEdit, usuario: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Ej: admin_cole"
                                        disabled={guardando}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Solo letras, números y guiones bajos
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Estatus
                                    </label>
                                    <select
                                        value={formEdit.estatus}
                                        onChange={(e) => setFormEdit({...formEdit, estatus: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        disabled={guardando}
                                    >
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div>
                                
                                <div className="bg-gray-50 p-3 rounded text-sm">
                                    <p className="font-medium text-gray-700">Información adicional:</p>
                                    <div className="mt-1 text-gray-600">
                                        <p><strong>Colegio:</strong> {editandoAdmin.colegio_nombre || `ID: ${editandoAdmin.colegio_id}`}</p>
                                        <p><strong>Rol:</strong> {editandoAdmin.rol || 'admin_colegio'}</p>
                                        <p><strong>Registrado:</strong> {editandoAdmin.created_at 
                                            ? new Date(editandoAdmin.created_at).toLocaleDateString('es-ES')
                                            : 'N/A'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button
                                        onClick={cerrarEdicionAdmin}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-sm"
                                        disabled={guardando}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={guardarEdicionAdmin}
                                        disabled={guardando}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {guardando ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                                Guardando...
                                            </>
                                        ) : 'Guardar cambios'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}