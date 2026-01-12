'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSession from '@/hook/useSession'
import Link from 'next/link'

export default function TerminalesList() {
    const router = useRouter()
    const session = useSession()
    const [terminales, setTerminales] = useState([])
    const [loading, setLoading] = useState(true)
    const [filtro, setFiltro] = useState('todos')
    const [search, setSearch] = useState('')

    const hasLoaded = useRef(false)

    useEffect(() => {
        if (!session.isLoggedIn() || session.getUserType() !== 'superadmin') {
            router.push('/loginAdmin')
            return
        }

        if (!hasLoaded.current) {
            loadTerminales()
            hasLoaded.current = true
        }

    }, [router, session])

    useEffect(() => {
        if (hasLoaded.current) {
            loadTerminales()
        }
    }, [filtro])

    const loadTerminales = async () => {
        try {
            setLoading(true)
            let url = '/api/terminales'
            
            if (filtro === 'sin-asignar') {
                url += '?asignados=false'
            } else if (filtro === 'asignados') {
                url += '?asignados=true'
            }
            
            const response = await fetch(url)
            if (response.ok) {
                const data = await response.json()
                setTerminales(data)
            }
        } catch (error) {
            console.error('Error cargando terminales:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este terminal?')) return
        
        try {
            const response = await fetch(`/api/terminales/${id}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                loadTerminales()
            }
        } catch (error) {
            console.error('Error eliminando terminal:', error)
            alert('Error al eliminar terminal')
        }
    }

    const filteredTerminales = terminales.filter(terminal => {
        const searchLower = search.toLowerCase()
        return (
            terminal.NumeroSerie?.toLowerCase().includes(searchLower) ||
            terminal.Modelo?.toLowerCase().includes(searchLower) ||
            terminal.Colegio?.toLowerCase().includes(searchLower)
        )
    })

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <header className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-800 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                                💻 Gestión de Terminales
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Administra los equipos terminales del sistema
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Link
                                href="/superadmin/dashboard"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                ← Volver
                            </Link>
                            <Link
                                href="/superadmin/terminales/crear"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                + Crear Terminal
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Filtros y Búsqueda */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Buscar Terminal
                            </label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="N° Serie, Modelo, Colegio..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Filtrar por Estado
                            </label>
                            <select
                                value={filtro}
                                onChange={(e) => setFiltro(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="todos">Todos los Terminales</option>
                                <option value="asignados">Terminales Asignados</option>
                                <option value="sin-asignar">Terminales sin Asignar</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={loadTerminales}
                                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                            >
                                🔄 Actualizar Lista
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lista de Terminales */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">
                                Terminales ({filteredTerminales.length})
                            </h2>
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                                Mostrando {filteredTerminales.length} de {terminales.length}
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        N° Serie
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Modelo
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Colegio
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Cobro Tarjeta
                                    </th>
                                    <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredTerminales.map((terminal) => (
                                    <tr key={terminal.Id_terminal} className="hover:bg-gray-50">
                                        <td className="p-4 font-mono font-bold text-gray-900">
                                            {terminal.NumeroSerie}
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {terminal.Modelo || 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            {terminal.Colegio ? (
                                                <Link
                                                    href={`/superadmin/colegios/${terminal.ColegioID}`}
                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                >
                                                    {terminal.Colegio}
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                terminal.Asignado === 'Sí'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {terminal.Asignado || 'No asignado'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                terminal.CobroTarjeta === 'SI'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {terminal.CobroTarjeta === 'SI' ? 'Sí' : 'No'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/superadmin/terminales/${terminal.Id_terminal}/editar`}
                                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                                                >
                                                    Editar
                                                </Link>
                                                {!terminal.ColegioID ? (
                                                    <Link
                                                        href={`/superadmin/terminales/${terminal.Id_terminal}/asignar`}
                                                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                                                    >
                                                        Asignar
                                                    </Link>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm('¿Desasignar este terminal del colegio?')) {
                                                                try {
                                                                    const response = await fetch(`/api/terminales/${terminal.Id_terminal}`, {
                                                                        method: 'PUT',
                                                                        headers: {
                                                                            'Content-Type': 'application/json'
                                                                        },
                                                                        body: JSON.stringify({
                                                                            ...terminal,
                                                                            ColegioID: null,
                                                                            Colegio: '',
                                                                            Asignado: 'No',
                                                                            FechaEntrega: null
                                                                        })
                                                                    })
                                                                    if (response.ok) {
                                                                        loadTerminales()
                                                                    }
                                                                } catch (error) {
                                                                    console.error('Error:', error)
                                                                }
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                                                    >
                                                        Desasignar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(terminal.Id_terminal)}
                                                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
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

                    {loading && (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                            <p className="text-gray-600 mt-2">Cargando terminales...</p>
                        </div>
                    )}

                    {!loading && filteredTerminales.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-4">💻</div>
                            <p className="text-lg">No hay terminales registrados</p>
                            <p className="text-sm mt-2">Crea el primer terminal para comenzar</p>
                            <Link
                                href="/superadmin/terminales/crear"
                                className="mt-4 inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Crear Primer Terminal
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}