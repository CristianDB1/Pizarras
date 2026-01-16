// src/components/custom/dashboard/VendedoresManager.js
'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import Swal from 'sweetalert2'

export default function VendedoresManager({ colegioId }) {
    const [vendedores, setVendedores] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [passwordVisible, setPasswordVisible] = useState({})
    const [credenciales, setCredenciales] = useState({})


    const togglePassword = async (idVendedor) => {
        // Si aún no tengo credenciales, las pido
        if (!credenciales[idVendedor]) {
            const data = await obtenerCredenciales(idVendedor)
            if (!data) return
        }

        setPasswordVisible(prev => ({
            ...prev,
            [idVendedor]: !prev[idVendedor]
        }))
    }


    const obtenerCredenciales = async (idVendedor) => {
        try {
            const res = await fetch(
                `/api/vendedores/${idVendedor}/credenciales?colegioId=${colegioId}`
            )

            if (!res.ok) {
                throw new Error('No se pudieron obtener las credenciales')
            }

            const data = await res.json()

            setCredenciales(prev => ({
                ...prev,
                [idVendedor]: data
            }))

            return data
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron cargar las credenciales',
                icon: 'error'
            })
            return null
        }
    }
    
    const { 
        register, 
        handleSubmit, 
        reset, 
        formState: { errors },
        getValues
    } = useForm({
        defaultValues: {
            nombre: '',
            usuario: '',
            contrasena: '',
            confirm_contrasena: '',
            domicilio: '',
            telefono: '',
            comision: 0,
            estatus: 'activo',
            rol: 'vendedor'
        }
    })

    // Cargar vendedores
    useEffect(() => {
        if (colegioId) {
            cargarVendedores()
        }
    }, [colegioId])

    const cargarVendedores = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/vendedores/colegio/${colegioId}`)
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log('API de vendedores no encontrada, usando datos vacíos')
                    setVendedores([])
                    return
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`)
            }
            
            const data = await response.json()
            setVendedores(data || [])
            
        } catch (error) {
            console.error('Error cargando vendedores:', error)
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron cargar los vendedores',
                icon: 'error',
                confirmButtonText: 'OK'
            })
            setVendedores([])
        } finally {
            setLoading(false)
        }
    }

    // Crear nuevo vendedor
    const onSubmit = async (data) => {
        // Validar contraseñas
        if (data.contrasena !== data.confirm_contrasena) {
            Swal.fire({
                title: 'Error',
                text: 'Las contraseñas no coinciden',
                icon: 'error',
                confirmButtonText: 'OK'
            })
            return
        }

        const validarVendedor = (data, esEdicion = false) => {
            const errores = [];
            
            if (!data.nombre?.trim()) {
                errores.push('El nombre es requerido');
            }
            
            if (!data.usuario?.trim()) {
                errores.push('El usuario es requerido');
            } else if (data.usuario.length < 3) {
                errores.push('El usuario debe tener al menos 3 caracteres');
            }
            
            // Validación especial para contraseñas
            const tieneContrasena = data.contrasena?.trim();
            const tieneConfirmacion = data.confirm_contrasena?.trim();
            
            if (!esEdicion && !tieneContrasena) {
                errores.push('La contraseña es requerida para nuevos vendedores');
            }
            
            if (tieneContrasena && tieneContrasena.length < 6) {
                errores.push('La contraseña debe tener al menos 6 caracteres');
            }
            
            if ((tieneContrasena && !tieneConfirmacion) || (!tieneContrasena && tieneConfirmacion)) {
                errores.push('Ambos campos de contraseña deben estar llenos o ambos vacíos');
            }
            
            if (tieneContrasena && tieneConfirmacion && tieneContrasena !== tieneConfirmacion) {
                errores.push('Las contraseñas no coinciden');
            }
            
            if (data.comision < 0 || data.comision > 100) {
                errores.push('La comisión debe estar entre 0 y 100%');
            }
            
            return errores;
        };

        try {
            const vendedorData = {
                nombre: data.nombre,
                usuario: data.usuario,
                contrasena: data.contrasena,
                domicilio: data.domicilio,
                telefono: data.telefono,
                comision: parseFloat(data.comision),
                estatus: data.estatus,
                rol: data.rol,
                colegio_id: colegioId
            }

            const url = editingId 
                ? `/api/vendedores/${editingId}`
                : '/api/vendedores/crear'
            
            const method = editingId ? 'PUT' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(vendedorData)
            })

            const result = await response.json()

            if (response.ok) {
            Swal.fire({
                title: '¡Éxito!',
                text: editingId 
                    ? 'Vendedor actualizado correctamente' 
                    : 'Vendedor creado correctamente',
                icon: 'success',
                timer: 2000
            })
            
            setShowForm(false)
            setEditingId(null)
            reset({
                nombre: '',
                usuario: '',
                contrasena: '',
                confirm_contrasena: '',
                domicilio: '',
                telefono: '',
                comision: 0,
                estatus: 'activo',
                rol: 'vendedor'
            })
            cargarVendedores()
        } else {
                throw new Error(result.error || 'Error al guardar vendedor')
            }
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: error.message,
                icon: 'error',
                confirmButtonText: 'OK'
            })
        }
    }

    // Editar vendedor
    const handleEditar = (vendedor) => {
        setEditingId(vendedor.id_vendedor)
        setShowForm(true)
        reset({
            nombre: vendedor.nombre,
            usuario: vendedor.usuario,
            contrasena: '',
            confirm_contrasena: '',
            domicilio: vendedor.domicilio || '',
            telefono: vendedor.telefono || '',
            comision: vendedor.comision || 0,
            estatus: vendedor.estatus || 'activo',
            rol: vendedor.rol || 'vendedor'
        })
    }

    // Eliminar vendedor
    const handleEliminar = (id, nombre) => {
        Swal.fire({
            title: '¿Eliminar vendedor?',
            html: `¿Estás seguro de eliminar a <strong>${nombre}</strong>?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/api/vendedores/${id}`, {
                        method: 'DELETE'
                    })

                    if (response.ok) {
                        Swal.fire({
                            title: '¡Eliminado!',
                            text: 'Vendedor eliminado correctamente',
                            icon: 'success',
                            timer: 1500
                        })
                        cargarVendedores()
                    }
                } catch (error) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Error al eliminar vendedor',
                        icon: 'error'
                    })
                }
            }
        })
    }

    const handleCancelar = () => {
        setShowForm(false)
        setEditingId(null)
        reset({
            nombre: '',
            usuario: '',
            contrasena: '',
            confirm_contrasena: '',
            domicilio: '',
            telefono: '',
            comision: 0,
            estatus: 'activo',
            rol: 'vendedor'
        })
    }

    // Filtrar vendedores
    const filteredVendedores = vendedores.filter(vendedor =>
        vendedor.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendedor.usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendedor.telefono?.includes(searchTerm)
    )

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Cargando vendedores...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Vendedores</h1>
                    <p className="text-gray-600">Administra los vendedores del colegio</p>
                </div>
                <button
                    onClick={() => {
                        if (showForm) {
                            handleCancelar()
                        } else {
                            setShowForm(true)
                            setEditingId(null)
                            reset({
                                nombre: '',
                                usuario: '',
                                contrasena: '',
                                confirm_contrasena: '',
                                domicilio: '',
                                telefono: '',
                                comision: 0,
                                estatus: 'activo',
                                rol: 'vendedor'
                            })
                        }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <span>{showForm ? 'Cancelar' : '+ Nuevo Vendedor'}</span>
                </button>
            </div>

            {/* Formulario de creación/edición */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        {editingId ? 'Editar Vendedor' : 'Nuevo Vendedor'}
                    </h2>
                    
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre completo *
                                </label>
                                <input
                                    {...register('nombre', { required: 'El nombre es requerido' })}
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej: Juan Pérez"
                                />
                                {errors.nombre && (
                                    <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                                )}
                            </div>

                            {/* Usuario */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Usuario *
                                </label>
                                <input
                                    {...register('usuario', { 
                                        required: 'El usuario es requerido',
                                        minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                                    })}
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej: juan.perez"
                                />
                                {errors.usuario && (
                                    <p className="mt-1 text-sm text-red-600">{errors.usuario.message}</p>
                                )}
                            </div>

                            {/* Contraseña */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contraseña {!editingId && '*'}
                                </label>
                                <input
                                    {...register('contrasena', { 
                                        required: !editingId,
                                        minLength: { value: 6, message: 'Mínimo 6 caracteres' }
                                    })}
                                    type="password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder={editingId ? 'Dejar vacío para no cambiar' : '••••••'}
                                />
                                {errors.contrasena && (
                                    <p className="mt-1 text-sm text-red-600">{errors.contrasena.message}</p>
                                )}
                            </div>

                            {/* Confirmar contraseña */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirmar contraseña {!editingId && '*'}
                                </label>
                                <input
                                    {...register('confirm_contrasena', { 
                                        // Solo requerido si estamos creando
                                        required: !editingId ? 'Confirma la contraseña' : false,
                                        validate: {
                                            matchesPassword: (value) => {
                                                const password = getValues('contrasena');
                                                // Si estamos editando y ambos están vacíos, OK
                                                if (editingId && !password && !value) return true;
                                                // Si ambos tienen valor, deben coincidir
                                                if (password && value) return password === value || 'No coinciden';
                                                // Si uno tiene valor y el otro no
                                                if ((password && !value) || (!password && value)) {
                                                    return 'Llena ambos campos o déjalos vacíos';
                                                }
                                                return true;
                                            }
                                        }
                                    })}
                                    type="password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder={editingId ? 'Dejar vacío para no cambiar' : '••••••'}
                                />
                                {errors.confirm_contrasena && (
                                    <p className="mt-1 text-sm text-red-600">{errors.confirm_contrasena.message}</p>
                                )}
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Teléfono
                                </label>
                                <input
                                    {...register('telefono')}
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej: 555-123-4567"
                                />
                            </div>

                            {/* Domicilio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Domicilio
                                </label>
                                <input
                                    {...register('domicilio')}
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Ej: Calle Principal #123"
                                />
                            </div>

                            {/* Comisión */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Comisión (%)
                                </label>
                                <input
                                    {...register('comision', { 
                                        min: 0,
                                        max: 100,
                                        valueAsNumber: true
                                    })}
                                    type="number"
                                    step="0.1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0"
                                />
                            </div>

                            {/* Rol */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rol
                                </label>
                                <select
                                    {...register('rol')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="vendedor">Vendedor</option>
                                    <option value="staff">Staff</option>
                                </select>
                            </div>

                            {/* Estatus */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estatus
                                </label>
                                <select
                                    {...register('estatus')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={handleCancelar}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                {editingId ? 'Actualizar' : 'Crear Vendedor'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Buscador */}
            <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium text-gray-900">Lista de Vendedores</h3>
                        <p className="text-sm text-gray-600">{vendedores.length} vendedores registrados</p>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar vendedor..."
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabla de vendedores */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {filteredVendedores.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">👥</div>
                        <p className="text-gray-500">No hay vendedores registrados</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                            Crear primer vendedor
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contraseña</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisión</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredVendedores.map((vendedor) => (
                                    <tr key={vendedor.id_vendedor} className="hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                    {vendedor.nombre?.charAt(0) || 'V'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{vendedor.nombre}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Desde: {new Date(vendedor.fecha_ingreso || vendedor.created_at).toLocaleDateString('es-ES')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">{vendedor.usuario}</code>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type={passwordVisible[vendedor.id_vendedor] ? 'text' : 'password'}
                                                    value={credenciales[vendedor.id_vendedor]?.contrasena || ''}
                                                    readOnly
                                                    className="px-2 py-1 border border-gray-300 rounded text-sm w-32 bg-gray-50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => togglePassword(vendedor.id_vendedor)}
                                                    className="text-gray-600 hover:text-blue-600 transition-colors"
                                                    title={passwordVisible[vendedor.id_vendedor] ? 'Ocultar' : 'Ver'}
                                                >
                                                    {passwordVisible[vendedor.id_vendedor] ? <FiEyeOff /> : <FiEye />}
                                                </button>
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <div className="text-sm">{vendedor.telefono || 'No especificado'}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-xs">{vendedor.domicilio || 'Sin domicilio'}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                                                {vendedor.comision || 0}%
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                vendedor.rol === 'staff' 
                                                    ? 'bg-purple-100 text-purple-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {vendedor.rol === 'staff' ? 'Staff' : 'Vendedor'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                vendedor.estatus === 'activo'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {vendedor.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleEditar(vendedor)}
                                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(vendedor.id_vendedor, vendedor.nombre)}
                                                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}