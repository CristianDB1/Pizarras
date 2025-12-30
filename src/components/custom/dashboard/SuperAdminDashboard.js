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
    const [resultados, setResultados] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingResultados, setLoadingResultados] = useState(false)
    
    // Agregar useRef para evitar bucles
    const hasLoaded = useRef(false)
    const authChecked = useRef(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    // VERIFICACIÓN DE AUTENTICACIÓN
    useEffect(() => {
        if (!isClient) return

        if (authChecked.current) return

        const userData = session.getUserData()
        
        if (!session.isLoggedIn()) {
            router.push('/loginAdmin')
            return
        }

        const userType = session.getUserType()
        if (userType !== 'admin_colegio' && userType !== 'superadmin') {
            router.push('/')
            return
        }

        authChecked.current = true
        
        if (!hasLoaded.current) {
            loadColegios()
            loadResultadosLoteria()
            hasLoaded.current = true
        }
        
    }, [isClient, router, session]);

    const loadColegios = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/colegios')
            
            if (response.ok) {
                const data = await response.json()
                setColegios(data)
            } else {
                setColegios([])
            }
        } catch (error) {
            console.error('Error cargando colegios:', error)
            setColegios([])
        } finally {
            setLoading(false)
        }
    }

    const loadResultadosLoteria = async () => {
        try {
            setLoadingResultados(true)
            const response = await fetch('/api/resultados-loteria-nacional')
            
            if (response.ok) {
                const data = await response.json()
                setResultados(data)
            } else {
                setResultados([])
            }
        } catch (error) {
            console.error('Error cargando resultados lotería:', error)
            setResultados([])
        } finally {
            setLoadingResultados(false)
        }
    }

    const handleLogout = () => {
        session.logout()
        router.push('/loginAdmin')
    }

    const handleCreateColegio = () => {
        router.push('/superadmin/crear-colegio')
    }

    const handleGestionarLoteria = () => {
        router.push('/superadmin/loteria-nacional')
    }

    const handlePublicarResultado = (id) => {
        router.push(`/superadmin/loteria-nacional/publicar/${id}`)
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    // Mostrar loading mientras se verifica autenticación
    if (!isClient || (loading && !hasLoaded.current)) {
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🏫</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Crear Colegio</h3>
                                <p className="text-sm text-gray-600 mt-1">Registrar institución</p>
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
                                <p className="text-sm text-gray-600 mt-1">Gestionar administradores</p>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/superadmin/administradores')}
                            className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Ver Administradores
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🎰</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Lotería Nacional</h3>
                                <p className="text-sm text-gray-600 mt-1">Gestionar resultados</p>
                            </div>
                        </div>
                        <button
                            onClick={handleGestionarLoteria}
                            className="mt-4 w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            Gestionar Lotería
                        </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Estadísticas</h3>
                                <p className="text-sm text-gray-600 mt-1">Vista general sistema</p>
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

                {/* Resultados Lotería Nacional - Vista Rápida */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">
                                🎰 Resultados Lotería Nacional
                            </h2>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                                    Total: {resultados.length}
                                </span>
                                <button
                                    onClick={handleGestionarLoteria}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                                >
                                    Gestionar
                                </button>
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">
                            Últimos resultados registrados
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sorteo
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        1er Premio
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        2do Premio
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {resultados.slice(0, 5).map((resultado) => (
                                    <tr key={resultado.id_resultado} className="hover:bg-gray-50">
                                        <td className="p-4 font-medium text-gray-900">
                                            #{resultado.numero_sorteo_ln}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {formatDate(resultado.fecha_sorteo_ln)}
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono font-bold text-lg text-green-600">
                                                {resultado.primer_premio_ln || '--'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono font-bold text-lg text-blue-600">
                                                {resultado.segundo_premio_ln || '--'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                resultado.estado === 'publicado'
                                                    ? 'bg-green-100 text-green-800'
                                                    : resultado.estado === 'pendiente'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {resultado.estado === 'publicado' ? 'Publicado' : 
                                                 resultado.estado === 'pendiente' ? 'Pendiente' : 
                                                 resultado.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {resultados.length === 0 && !loadingResultados && (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-4">🎰</div>
                            <p className="text-lg">No hay resultados registrados</p>
                            <p className="text-sm mt-2">Comienza registrando el primer resultado</p>
                            <button
                                onClick={handleGestionarLoteria}
                                className="mt-4 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            >
                                Crear Primer Resultado
                            </button>
                        </div>
                    )}

                    {loadingResultados && (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                            <p className="text-gray-600 mt-2">Cargando resultados...</p>
                        </div>
                    )}

                    {resultados.length > 5 && (
                        <div className="p-4 border-t text-center">
                            <button
                                onClick={handleGestionarLoteria}
                                className="text-yellow-600 hover:text-yellow-800 font-medium"
                            >
                                Ver todos los resultados ({resultados.length}) →
                            </button>
                        </div>
                    )}
                </div>

                {/* Colegios List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">
                                🏫 Colegios Registrados ({colegios.length})
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