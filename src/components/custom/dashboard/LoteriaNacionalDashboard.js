// components/custom/dashboard/LoteriaNacionalDashboard.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSession from '@/hook/useSession'

export default function LoteriaNacionalDashboard() {
    const router = useRouter()
    const session = useSession()
    const [resultados, setResultados] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('todos') // 'todos', 'pendientes', 'publicados'

    useEffect(() => {
        // Verificar autenticación
        if (!session.isLoggedIn()) {
            router.push('/loginAdmin')
            return
        }

        loadResultados()
    }, [filter])

    const loadResultados = async () => {
        try {
            setLoading(true)
            let url = '/api/resultados-loteria-nacional'
            
            if (filter === 'pendientes') {
                url += '?estado=pendiente'
            } else if (filter === 'publicados') {
                url += '?estado=publicado'
            }
            
            const response = await fetch(url)
            
            if (response.ok) {
                const data = await response.json()
                setResultados(data)
            } else {
                console.error('Error cargando resultados')
                setResultados([])
            }
        } catch (error) {
            console.error('Error:', error)
            setResultados([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este resultado?')) return

        try {
            const response = await fetch(`/api/resultados-loteria-nacional/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                alert('Resultado eliminado exitosamente')
                loadResultados() // Recargar la lista
            } else {
                const error = await response.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error('Error eliminando:', error)
            alert('Error al eliminar el resultado')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    const handleVolver = () => {
        router.push('/superadmin/dashboard')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <button
                                onClick={handleVolver}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2"
                            >
                                ← Volver al Dashboard
                            </button>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                                🎰 Gestión Lotería Nacional
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Administra los resultados de la Lotería Nacional
                            </p>
                        </div>
                        <button
                            onClick={() => router.push('/superadmin/loteria-nacional/crear')}
                            className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all shadow-lg"
                        >
                            + Nuevo Resultado
                        </button>
                    </div>

                    {/* Filtros */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setFilter('todos')}
                            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilter('pendientes')}
                            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'pendientes' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setFilter('publicados')}
                            className={`px-4 py-2 rounded-lg transition-colors ${filter === 'publicados' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Publicados
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Total Resultados</p>
                                <p className="text-3xl font-bold text-gray-900">{resultados.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Pendientes</p>
                                <p className="text-3xl font-bold text-yellow-600">
                                    {resultados.filter(r => r.estado === 'pendiente').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">⏳</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600">Publicados</p>
                                <p className="text-3xl font-bold text-green-600">
                                    {resultados.filter(r => r.estado === 'publicado').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla de Resultados */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Lista de Resultados
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                            <p className="text-gray-600 mt-2">Cargando resultados...</p>
                        </div>
                    ) : resultados.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-4">🎰</div>
                            <p className="text-lg">No hay resultados registrados</p>
                            <p className="text-sm mt-2">Comienza creando un nuevo resultado</p>
                            <button
                                onClick={() => router.push('/superadmin/loteria-nacional/crear')}
                                className="mt-4 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                            >
                                Crear Primer Resultado
                            </button>
                        </div>
                    ) : (
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
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Publicado Por
                                        </th>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {resultados.map((resultado) => (
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
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {resultado.estado === 'publicado' ? 'Publicado' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-600 text-sm">
                                                {resultado.nombre_publicador || 'No publicado'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {resultado.estado === 'pendiente' && (
                                                        <button
                                                            onClick={() => router.push(`/superadmin/loteria-nacional/publicar/${resultado.id_resultado}`)}
                                                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                                                        >
                                                            Publicar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => router.push(`/superadmin/loteria-nacional/${resultado.id_resultado}`)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(resultado.id_resultado)}
                                                        className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
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
        </div>
    )
}