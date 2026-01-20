'use client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import useSession from '@/hook/useSession'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import Image from 'next/image';

export default function CrearColegioForm() {
    const session = useSession()
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)
    const [loading, setLoading] = useState(false)
    const [logoPreview, setLogoPreview] = useState(null)
    const [logoFile, setLogoFile] = useState(null)
    const [generandoNumero, setGenerandoNumero] = useState(false)
    
    // Calcular fecha mínima (mañana a las 23:59:59) y fecha máxima (2 años desde hoy)
    const getMinDate = () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(23, 59, 59, 0)
        return tomorrow.toISOString().split('T')[0]
    }

    const getMaxDate = () => {
        const twoYearsLater = new Date()
        twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2)
        twoYearsLater.setHours(23, 59, 59, 0)
        return twoYearsLater.toISOString().split('T')[0]
    }

    // Formatear fecha para enviar al backend
    const formatDateTime = (dateString) => {
        const [year, month, day] = dateString.split('-')
        const date = new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            23, 59, 59, 0
        ))
        return date.toISOString()
    }
    
    // Generar número de sorteo sugerido
    const generarNumeroSorteoSugerido = async () => {
        try {
            setGenerandoNumero(true);
            const response = await fetch('/api/sorteos/generar-numero');
            const data = await response.json();
            
            if (data.success && data.numero_sorteo) {
                setValue('numero_sorteo', data.numero_sorteo);
                Swal.fire({
                    title: 'Número generado',
                    text: `Se ha generado: ${data.numero_sorteo}`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error('Error generando número:', error);
        } finally {
            setGenerandoNumero(false);
        }
    }
    
    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        reset,
        setValue,
        trigger
    } = useForm({
        defaultValues: {
            nombre: '',
            logo_url: '',
            admin_nombre: '',
            admin_usuario: '', 
            admin_password: '',
            confirm_password: '',
            cifras_sorteo: 5,
            fecha_sorteo: getMinDate(), 
            precio_boleto: 100,
            comision_vendedor: 10,
            numero_sorteo: '' 
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

    const formatDateForDisplay = (isoDate) => {
        const date = new Date(isoDate)
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const handleLogoChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({
                    title: 'Archivo demasiado grande',
                    text: 'El logo no debe superar los 2MB',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                })
                e.target.value = ''
                return
            }

            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
            if (!allowedTypes.includes(file.type)) {
                Swal.fire({
                    title: 'Formato no permitido',
                    text: 'Solo se permiten imágenes (JPEG, PNG, GIF, WebP, SVG)',
                    icon: 'error',
                    confirmButtonText: 'Entendido'
                })
                e.target.value = ''
                return
            }

            setLogoFile(file)

            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result)
            }
            reader.readAsDataURL(file)
        } else {
            setLogoFile(null)
            setLogoPreview(null)
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

        // Validar fecha futura
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const selectedDate = new Date(data.fecha_sorteo)
        selectedDate.setHours(0, 0, 0, 0)
        
        if (selectedDate <= today) {
            Swal.fire({
                title: 'Error',
                text: 'La fecha del sorteo debe ser futura',
                icon: 'error',
                confirmButtonText: 'Entendido'
            })
            return
        }

        // Validar número de sorteo
        if (!data.numero_sorteo) {
            Swal.fire({
                title: 'Error',
                text: 'El número de sorteo es requerido',
                icon: 'error',
                confirmButtonText: 'Entendido'
            })
            return
        }

        setLoading(true)
        
        try {
            const colegioData = {
                nombre: data.nombre,
                logo_url: data.logo_url || null,
                logo_base64: logoPreview || null,
                logo_filename: logoFile ? logoFile.name : null, 
                configuracion: JSON.stringify({
                    cifras_sorteo: parseInt(data.cifras_sorteo),
                    precio_boleto: parseFloat(data.precio_boleto),
                    comision_vendedor: parseFloat(data.comision_vendedor)
                }),
                admin_data: {
                    nombre: data.admin_nombre,
                    usuario: data.admin_usuario, 
                    password: data.admin_password
                },
                sorteo_data: {
                    fecha: formatDateTime(data.fecha_sorteo),
                    cifras_sorteo: parseInt(data.cifras_sorteo),
                    nombre: `Sorteo Inicial - ${data.nombre}`,
                    descripcion: `Sorteo inicial creado automáticamente para ${data.nombre}`,
                    estado: 'activo',
                    precio_boleto: parseFloat(data.precio_boleto),
                    comision_vendedor: parseFloat(data.comision_vendedor),
                    numero_sorteo: data.numero_sorteo.trim()
                }
            }

            console.log('📤 Enviando datos del colegio con sorteo:', colegioData)

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
                html: `
                    <div class="text-center">
                        <div class="text-4xl mb-4">🎉</div>
                        <h3 class="text-lg font-semibold mb-2">Colegio creado exitosamente</h3>
                        <div class="text-left bg-yellow-50 p-4 rounded-lg mt-4 border-l-4 border-yellow-400">
                            <p class="font-medium">⚠️ Configuración INICIAL del sorteo:</p>
                            <p class="mt-2"><strong>Número de sorteo:</strong> ${data.numero_sorteo}</p>
                            <p class="mt-1"><strong>Fecha límite:</strong> ${formatDateForDisplay(formatDateTime(data.fecha_sorteo))}</p>
                            <p class="mt-1"><strong>Cifras del boleto:</strong> ${data.cifras_sorteo}</p>
                            <p class="text-sm text-gray-600 mt-2">Estos parámetros NO podrán ser modificados por el administrador del colegio</p>
                        </div>
                        <div class="text-left bg-blue-50 p-4 rounded-lg mt-4">
                            <p class="font-medium">Credenciales del administrador:</p>
                            <p class="mt-1"><strong>Usuario:</strong> ${data.admin_usuario}</p>
                            <p class="mt-1"><strong>Contraseña:</strong> ${data.admin_password}</p>
                            <div id="whatsapp-buttons" class="mt-4 flex gap-2">
                                <button 
                                    onclick="window.copyCredentialsToClipboard()"
                                    class="flex-1 px-3 py-2 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200 transition-colors"
                                >
                                    📋 Copiar credenciales
                                </button>
                                <button 
                                    onclick="window.shareViaWhatsApp()"
                                    class="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200 transition-colors"
                                >
                                    💬 Enviar por WhatsApp
                                </button>
                            </div>
                            <p class="text-xs text-gray-600 mt-2">Guarda estas credenciales para entregarlas al administrador</p>
                        </div>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'Continuar al Dashboard',
                showCancelButton: true,
                cancelButtonText: 'Crear otro colegio',
                width: 600,
                didOpen: () => {
                    // Definir funciones globales para usar en los botones del HTML
                    window.copyCredentialsToClipboard = () => {
                        const text = `Usuario: ${data.admin_usuario}\nContraseña: ${data.admin_password}`;
                        navigator.clipboard.writeText(text).then(() => {
                            Swal.fire({
                                title: 'Copiado',
                                text: 'Credenciales copiadas al portapapeles',
                                icon: 'success',
                                timer: 1500
                            });
                        });
                    };
                    
                    window.shareViaWhatsApp = () => {
                        const colegioNombre = data.nombre;
                        const usuario = data.admin_usuario;
                        const password = data.admin_password;
                        const fechaSorteo = formatDateForDisplay(formatDateTime(data.fecha_sorteo));
                        const numeroSorteo = data.numero_sorteo;
                        
                        const message = `*🏫 Credenciales para ${colegioNombre}*%0A%0A` +
                                    `*Usuario:* ${usuario}%0A` +
                                    `*Contraseña:* ${password}%0A%0A` +
                                    `*Información del sorteo:*%0A` +
                                    `Número de sorteo: ${numeroSorteo}%0A` +
                                    `Fecha límite: ${fechaSorteo}%0A` +
                                    `Cifras del boleto: ${data.cifras_sorteo}%0A%0A` +
                                    `Accede al panel en: ${window.location.origin}/loginAdmin`;
                        
                        const whatsappUrl = `https://wa.me/?text=${message}`;
                        window.open(whatsappUrl, '_blank');
                    };
                }
            }).then((result) => {
                // Limpiar funciones globales
                delete window.copyCredentialsToClipboard;
                delete window.shareViaWhatsApp;
                
                if (result.isConfirmed) {
                    router.push('/superadmin/dashboard')
                } else {
                    reset({
                        nombre: '',
                        logo_url: '',
                        admin_nombre: '',
                        admin_usuario: '',
                        admin_password: '',
                        confirm_password: '',
                        cifras_sorteo: 5,
                        fecha_sorteo: getMinDate(),
                        precio_boleto: 100,
                        comision_vendedor: 10,
                        numero_sorteo: ''
                    })
                    setLogoPreview(null)
                }
            })
            } else {
                const errorMessage = result.details || result.error || 'Error al crear el colegio'
                console.error('❌ Error del servidor:', result)
                throw new Error(errorMessage)
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
                                            <Image 
                                            src={logoPreview} 
                                            alt="Preview" 
                                            width={100} 
                                            height={100} 
                                            priority={false} 
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

                                {/* Usuario del Admin */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Usuario del Administrador *
                                    </label>
                                    <input
                                        {...register('admin_usuario', {
                                            required: 'El usuario es requerido',
                                            minLength: {
                                                value: 3,
                                                message: 'Mínimo 3 caracteres'
                                            },
                                            pattern: {
                                                value: /^[a-zA-Z0-9_]+$/,
                                                message: 'Solo letras, números y guiones bajos'
                                            }
                                        })}
                                        type="text"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.admin_usuario ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="admin_colegio"
                                    />
                                    {errors.admin_usuario && (
                                        <p className="mt-1 text-sm text-red-600">{errors.admin_usuario.message}</p>
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

                        {/* Configuración INICIAL del Sorteo (SOLO SUPERADMIN) */}
                        <div className="mt-8 pt-6 border-t">
                            <h2 className="text-xl font-semibold text-gray-800 mb-6">
                                🎟️ Configuración INICIAL del Sorteo
                            </h2>
                            
                            <div className="grid grid-cols-1 gap-6 mb-8">
                                {/* Número de sorteo manual */}
                                <div className="col-span-full">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Número de sorteo *
                                            <span className="text-xs text-gray-500 ml-2">(Único en todo el sistema)</span>
                                        </label>
                                    </div>
                                    <input
                                        {...register('numero_sorteo', {
                                            required: 'El número de sorteo es requerido',
                                            pattern: {
                                                value: /^[A-Za-z0-9-]+$/,
                                                message: 'Solo letras, números y guiones'
                                            },
                                            minLength: {
                                                value: 3,
                                                message: 'Mínimo 3 caracteres'
                                            },
                                            maxLength: {
                                                value: 50,
                                                message: 'Máximo 50 caracteres'
                                            }
                                        })}
                                        type="text"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.numero_sorteo ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Ej: 1234"
                                    />
                                    {errors.numero_sorteo && (
                                        <p className="mt-1 text-sm text-red-600">{errors.numero_sorteo.message}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Este número identificará el sorteo de manera única en todo el sistema
                                    </p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Fecha del sorteo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha límite del sorteo *
                                    </label>
                                    <input
                                        {...register('fecha_sorteo', {
                                            required: 'La fecha del sorteo es requerida',
                                            validate: {
                                                futureDate: (value) => {
                                                    const selectedDate = new Date(value)
                                                    const today = new Date()
                                                    today.setHours(0, 0, 0, 0)
                                                    return selectedDate > today || 'La fecha debe ser futura'
                                                }
                                            }
                                        })}
                                        type="date"
                                        min={getMinDate()}
                                        max={getMaxDate()}
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.fecha_sorteo ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    />
                                    {errors.fecha_sorteo && (
                                        <p className="mt-1 text-sm text-red-600">{errors.fecha_sorteo.message}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        La venta de boletos finalizará el día seleccionado a las 23:59:59
                                    </p>
                                </div>

                                {/* Cifras del boleto */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cifras del boleto *
                                    </label>
                                    <input
                                        {...register('cifras_sorteo', {
                                            required: 'Las cifras del boleto son requeridas',
                                            min: {
                                                value: 1,
                                                message: 'Mínimo 1 cifra'
                                            },
                                            max: {
                                                value: 10,
                                                message: 'Máximo 10 cifras'
                                            },
                                            valueAsNumber: true
                                        })}
                                        type="number"
                                        min="1"
                                        max="10"
                                        step="1"
                                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                            errors.cifras_sorteo ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        placeholder="Ej: 5"
                                    />
                                    {errors.cifras_sorteo && (
                                        <p className="mt-1 text-sm text-red-600">{errors.cifras_sorteo.message}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Número de cifras (ej: 5 = 00000 al 99999)
                                    </p>
                                </div>
                            </div>

                            {/* Configuración editable por admin colegio */}
                            <div className="mt-8 pt-6 border-t">
                                <h3 className="text-lg font-medium text-gray-700 mb-4">
                                    Configuración editable por el administrador del colegio:
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Precio del boleto */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Precio del boleto ($) - Sugerido
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
                                        <p className="mt-1 text-xs text-gray-500">
                                            Podrá ser ajustado por el administrador
                                        </p>
                                    </div>

                                    {/* Comisión del vendedor */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Comisión vendedor (%) - Sugerido
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
                                        <p className="mt-1 text-xs text-gray-500">
                                            Podrá ser ajustado por el administrador
                                        </p>
                                    </div>
                                </div>
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
                                    <li><strong>Se creará automáticamente un sorteo inicial</strong> con:</li>
                                    <ul className="list-disc pl-5 mt-1">
                                        <li><strong>Número de sorteo único</strong> - ingresado manualmente</li>
                                        <li>Fecha límite</li>
                                        <li>Cifras del boleto</li>
                                        <li>Precio sugerido del boleto - editable por el admin</li>
                                        <li>Comisión sugerida - editable por el admin</li>
                                    </ul>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}