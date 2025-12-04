'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import useSession from '@/hook/useSession'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'

export default function CrearColegioForm() {
    const session = useSession()
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)
    const [loading, setLoading] = useState(false)
    const [logoPreview, setLogoPreview] = useState(null)
    
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        reset
    } = useForm({
        defaultValues: {
            nombre: '',
            logo_url: '',
            admin_nombre: '',
            admin_email: '',
            admin_password: '',
            confirm_password: '',
            cifras_sorteo: 5,
            precio_boleto: 100,
            comision_vendedor: 10
        }
    })

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Verificar que sea superadmin
    useEffect(() => {
        if (!isClient) return
        
        if (!session.isLoggedIn() || !session.isSuperAdmin()) {
            router.push('/loginAdmin')
        }
    }, [isClient, session, router])

    const handleLogoChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const onSubmit = async (data) => {
        // Validar contraseñas
        if (data.admin_password !== data.confirm_password) {
            Swal.fire({
                title: 'Error',
                text: 'Las contraseñas no coinciden',
                icon: 'error',
                confirmButtonText: 'Entendido'
            })
            return
        }

        setLoading(true)
        
        try {
            const colegioData = {
                nombre: data.nombre,
                logo_url: data.logo_url,
                configuracion: JSON.stringify({
                    cifras_sorteo: parseInt(data.cifras_sorteo),
                    precio_boleto: parseFloat(data.precio_boleto),
                    comision_vendedor: parseFloat(data.comision_vendedor)
                }),
                admin_data: {
                    nombre: data.admin_nombre,
                    email: data.admin_email,
                    password: data.admin_password
                }
            }

            console.log('📤 Enviando datos del colegio:', colegioData)

            const response = await fetch('/api/colegios/crear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(colegioData)
            })

            const result = await response.json()

            if (response.ok) {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'Colegio creado correctamente',
                    icon: 'success',
                    confirmButtonText: 'Continuar'
                }).then(() => {
                    reset()
                    setLogoPreview(null)
                    router.push('/superadmin/dashboard')
                })
            } else {
                throw new Error(result.error || 'Error al crear el colegio')
            }
        } catch (error) {
            console.error('❌ Error:', error)
            Swal.fire({
                title: 'Error',
                text: error.message || 'Error al crear el colegio',
                icon: 'error',
                confirmButtonText: 'Entendido'
            })
        } finally {
            setLoading(false)
        }
    }

    if (!isClient) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/superadmin/dashboard')}
                        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al Dashboard
                    </button>
                    
                    <h1 className="text-3xl font-bold text-gray-900">
                        🏫 Crear Nuevo Colegio
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Completa el formulario para registrar un nuevo colegio en el sistema
                    </p>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Sección del Colegio */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-800 pb-3 border-b">
                                    Información del Colegio
                                </h2>
                                
                                {/* Nombre del Colegio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre del Colegio *
                                    </label>
                                    <input
                                        {...register('nombre', { 
                                            required: 'El nombre del colegio es requerido',
                                            minLength: {
                                                value: 3,
                                                message: 'Mínimo 3 caracteres'
                                            }
                                        })}
                                        type="text"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.nombre ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Ej: Colegio México"
                                    />
                                    {errors.nombre && (
                                        <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                                    )}
                                </div>

                                {/* Logo URL */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        URL del Logo (opcional)
                                    </label>
                                    <input
                                        {...register('logo_url')}
                                        type="text"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="https://ejemplo.com/logo.png"
                                    />
                                </div>

                                {/* Vista previa del logo */}
                                {logoPreview && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Vista previa del logo
                                        </label>
                                        <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                                            <img 
                                                src={logoPreview} 
                                                alt="Preview" 
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Subir logo desde archivo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Subir Logo (opcional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Formatos: JPG, PNG, SVG. Tamaño máximo: 2MB
                                    </p>
                                </div>
                            </div>

                            {/* Sección del Administrador */}
                            <div className="space-y-6">
                                <h2 className="text-xl font-semibold text-gray-800 pb-3 border-b">
                                    Administrador del Colegio
                                </h2>
                                
                                {/* Nombre del Admin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre del Administrador *
                                    </label>
                                    <input
                                        {...register('admin_nombre', { 
                                            required: 'El nombre del administrador es requerido'
                                        })}
                                        type="text"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.admin_nombre ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Ej: Juan Pérez"
                                    />
                                    {errors.admin_nombre && (
                                        <p className="mt-1 text-sm text-red-600">{errors.admin_nombre.message}</p>
                                    )}
                                </div>

                                {/* Email del Admin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email del Administrador *
                                    </label>
                                    <input
                                        {...register('admin_email', { 
                                            required: 'El email es requerido',
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: 'Email inválido'
                                            }
                                        })}
                                        type="email"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.admin_email ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="admin@colegio.edu"
                                    />
                                    {errors.admin_email && (
                                        <p className="mt-1 text-sm text-red-600">{errors.admin_email.message}</p>
                                    )}
                                </div>

                                {/* Contraseña */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contraseña *
                                    </label>
                                    <input
                                        {...register('admin_password', { 
                                            required: 'La contraseña es requerida',
                                            minLength: {
                                                value: 6,
                                                message: 'Mínimo 6 caracteres'
                                            }
                                        })}
                                        type="password"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.admin_password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="••••••"
                                    />
                                    {errors.admin_password && (
                                        <p className="mt-1 text-sm text-red-600">{errors.admin_password.message}</p>
                                    )}
                                </div>

                                {/* Confirmar Contraseña */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirmar Contraseña *
                                    </label>
                                    <input
                                        {...register('confirm_password', { 
                                            required: 'Confirma la contraseña'
                                        })}
                                        type="password"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.confirm_password ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="••••••"
                                    />
                                    {errors.confirm_password && (
                                        <p className="mt-1 text-sm text-red-600">{errors.confirm_password.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Configuración del Sorteo */}
                        <div className="mt-8 pt-6 border-t">
                            <h2 className="text-xl font-semibold text-gray-800 mb-6">
                                ⚙️ Configuración Inicial del Sorteo
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Cifras del boleto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cifras del boleto
                                    </label>
                                    <select
                                        {...register('cifras_sorteo')}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="4">4 cifras</option>
                                        <option value="5">5 cifras</option>
                                        <option value="6">6 cifras</option>
                                        <option value="7">7 cifras</option>
                                    </select>
                                </div>

                                {/* Precio del boleto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Precio del boleto ($)
                                    </label>
                                    <input
                                        {...register('precio_boleto', { 
                                            min: 1,
                                            valueAsNumber: true
                                        })}
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="100.00"
                                    />
                                </div>

                                {/* Comisión del vendedor */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Comisión vendedor (%)
                                    </label>
                                    <input
                                        {...register('comision_vendedor', { 
                                            min: 0,
                                            max: 100,
                                            valueAsNumber: true
                                        })}
                                        type="number"
                                        step="0.1"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="10"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 text-sm text-gray-600">
                                <p>Esta configuración puede ser modificada posteriormente por el administrador del colegio.</p>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="mt-10 pt-6 border-t flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => router.push('/superadmin/dashboard')}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creando...
                                    </span>
                                ) : 'Crear Colegio y Administrador'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Información adicional */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">¿Qué sucede al crear el colegio?</h3>
                            <div className="mt-2 text-sm text-blue-700">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Se creará el colegio en el sistema</li>
                                    <li>Se registrará el administrador con acceso al panel del colegio</li>
                                    <li>Se configurará el primer sorteo con los parámetros establecidos</li>
                                    <li>El administrador recibirá las credenciales por email (si configuras envío de emails)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}