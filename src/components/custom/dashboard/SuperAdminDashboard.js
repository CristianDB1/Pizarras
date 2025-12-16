'use client'
import { useState, useEffect, useRef } from 'react'
import useSession from '@/hook/useSession'
import { useRouter } from 'next/navigation'
import Image from 'next/image';

export default function SuperAdminDashboard() {
    const session = useSession()
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)
    const [colegios, setColegios] = useState([])
    const [loading, setLoading] = useState(true)
    
    // Agregar useRef para evitar bucles
    const hasLoaded = useRef(false)
    const authChecked = useRef(false)

    useEffect(() => {
        console.log('🔄 useEffect - Marcando como cliente')
        setIsClient(true)
    }, [])

    // VERIFICACIÓN DE AUTENTICACIÓN - CORREGIDA para evitar bucles
    useEffect(() => {
        if (!isClient) {
            console.log('⏳ No es cliente aún, esperando...')
            return
        }

        // Evitar múltiples verificaciones
        if (authChecked.current) {
            console.log('✅ Autenticación ya verificada (skip)')
            return
        }

        console.log('🔍 Verificando autenticación...')
        console.log('isLoggedIn:', session.isLoggedIn())
        console.log('userType:', session.getUserType())
        console.log('userData:', session.getUserData())

        const userData = session.getUserData()
        
        if (!session.isLoggedIn()) {
            console.log('❌ No está logueado, redirigiendo a /loginAdmin')
            router.push('/loginAdmin')
            return
        }

        const userType = session.getUserType()
        if (userType !== 'admin_colegio' && userType !== 'superadmin') {
            console.log(`❌ Tipo de usuario incorrecto: ${userType}, redirigiendo a /`)
            router.push('/')
            return
        }

        console.log('✅ Autenticación OK, marcando como verificada')
        authChecked.current = true
        
        // Cargar colegios solo una vez
        if (!hasLoaded.current) {
            console.log('📊 Cargando colegios por primera vez')
            loadColegios()
            hasLoaded.current = true
        }
        
    }, [isClient, router, session]); // IMPORTANTE: Solo dependencia de isClient

    const loadColegios = async () => {
        try {
            console.log('📡 Haciendo fetch a /api/colegios...')
            setLoading(true)
            const response = await fetch('/api/colegios')
            console.log('📥 Respuesta recibida, status:', response.status)
            
            if (response.ok) {
                const data = await response.json()
                console.log(`✅ Colegios cargados: ${data.length} registros`)
                setColegios(data)
            } else {
                console.log('❌ Error en respuesta de API:', response.status)
                setColegios([])
            }
        } catch (error) {
            console.error('❌ Error cargando colegios:', error)
            setColegios([])
        } finally {
            console.log('🏁 Carga de colegios finalizada')
            setLoading(false)
        }
    }

    const handleLogout = () => {
        console.log('🚪 Cerrando sesión...')
        session.logout()
        router.push('/loginAdmin')
    }

    const handleCreateColegio = () => {
        router.push('/superadmin/crear-colegio')
    }

    // Mostrar loading mientras se verifica autenticación
    if (!isClient || (loading && !hasLoaded.current)) {
        console.log('🌀 Mostrando loading...')
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-32 h-32">
                        <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-red-500"></div>
                        <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
                            <div className="text-center">
                                <div className="text-xl font-semibold text-gray-700">Cargando</div>
                                <div className="text-sm text-gray-500">Panel Super Admin</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    console.log('🎨 Renderizando dashboard...')
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            {/* Header */}
            <header className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-800 via-crimson to-purple-600 bg-clip-text text-transparent">
                                🎓 Panel Super Administrador
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Gestión completa del sistema de sorteos
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-4 py-2 bg-gray-100 rounded-lg">
                                <span className="font-semibold text-gray-800">
                                    {session.getUserName() || 'Super Admin'}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🏫</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Crear Nuevo Colegio</h3>
                                <p className="text-sm text-gray-600 mt-1">Registra una nueva institución</p>
                            </div>
                        </div>
                        <button
                            onClick={handleCreateColegio}
                            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Crear Colegio
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👑</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Administradores</h3>
                                <p className="text-sm text-gray-600 mt-1">Gestiona administradores del sistema</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/superadmin/administradores')}
                            className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Ver Administradores
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Estadísticas Globales</h3>
                                <p className="text-sm text-gray-600 mt-1">Vista general del sistema</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/superadmin/estadisticas')}
                            className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Ver Estadísticas
                        </button>
                    </div>
                </div>

                {/* Colegios List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Colegios Registrados ({colegios.length})
                            </h2>
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                                Total: {colegios.length}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Colegio
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha Registro
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {colegios.map((colegio) => (
                                    <tr key={colegio.id_colegio} className="hover:bg-gray-50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {colegio.logo_url ? (
                                                    <Image 
                                                        src={colegio.logo_url}
                                                        width={120}
                                                        height={120} 
                                                        alt={colegio.nombre}
                                                        className="w-10 h-10 rounded-full"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none'
                                                            e.target.parentNode.innerHTML = `
                                                                <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                                                    ${colegio.nombre?.charAt(0) || 'C'}
                                                                </div>
                                                            `
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                                        {colegio.nombre?.charAt(0) || 'C'}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {colegio.nombre}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                colegio.estatus === 'activo'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {colegio.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {colegio.created_at ? new Date(colegio.created_at).toLocaleDateString('es-ES') : 'No registrada'}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => router.push(`/superadmin/colegios/${colegio.id_colegio}`)}
                                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                            >
                                                Ver detalles →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {colegios.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-4">🏫</div>
                            <p className="text-lg">No hay colegios registrados aún</p>
                            <p className="text-sm mt-2">Crea el primer colegio para comenzar</p>
                            <button
                                onClick={handleCreateColegio}
                                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Crear Primer Colegio
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                            <p className="text-gray-600 mt-2">Cargando colegios...</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}