'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSession from '@/hook/useSession'
import Link from 'next/link'

export default function TerminalDetail() {
    const router = useRouter()
    const params = useParams()
    const session = useSession()
    const [terminal, setTerminal] = useState(null)
    const [loading, setLoading] = useState(true)

    const hasLoaded = useRef(false)
    const authChecked = useRef(false)

    useEffect(() => {
        if (!session.isLoggedIn() || session.getUserType() !== 'superadmin') {
            router.push('/loginAdmin')
            return
        }

        authChecked.current = true
    }, [router, session])

    useEffect(() => {
        if (authChecked.current && !hasLoaded.current) {
            loadTerminal()
            hasLoaded.current = true
        }
    }, [authChecked.current])

    const loadTerminal = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/terminales/${params.id}`)
            if (response.ok) {
                const data = await response.json()
                setTerminal(data)
            }
        } catch (error) {
            console.error('Error cargando terminal:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este terminal?')) return
        
        try {
            const response = await fetch(`/api/terminales/${params.id}`, {
                method: 'DELETE'
            })
            
            if (response.ok) {
                alert('Terminal eliminado exitosamente')
                router.push('/superadmin/terminales')
            }
        } catch (error) {
            console.error('Error eliminando terminal:', error)
            alert('Error al eliminar terminal')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'No especificada'
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    <p className="text-gray-600 mt-4">Cargando terminal...</p>
                </div>
            </div>
        )
    }

    if (!terminal) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-gray-800">Terminal no encontrado</h1>
                    <p className="text-gray-600 mt-2">El terminal que buscas no existe o fue eliminado</p>
                    <Link
                        href="/superadmin/terminales"
                        className="mt-4 inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Volver a Terminales
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <header className="bg-white shadow-lg">
                <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-800 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                                📋 Detalles del Terminal
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Información completa del equipo terminal
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                ID: <span className="font-mono">{terminal.Id_terminal}</span>
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <Link
                                href="/superadmin/terminales"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                ← Volver
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Información Principal */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="p-6 border-b">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        Información del Terminal
                                    </h2>
                                    <div className="flex gap-2">
                                        <Link
                                            href={`/superadmin/terminales/${terminal.Id_terminal}/editar`}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                        >
                                            Editar
                                        </Link>
                                        <button
                                            onClick={handleDelete}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Número de Serie
                                            </label>
                                            <p className="text-lg font-mono font-bold text-gray-900">
                                                {terminal.NumeroSerie}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Modelo
                                            </label>
                                            <p className="text-gray-900">
                                                {terminal.Modelo || 'No especificado'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Color
                                            </label>
                                            <div className="flex items-center gap-2">
                                                {terminal.Color && (
                                                    <>
                                                        <div 
                                                            className="w-6 h-6 rounded-full border border-gray-300"
                                                            style={{ backgroundColor: terminal.Color.toLowerCase() }}
                                                        />
                                                        <span className="text-gray-900">{terminal.Color}</span>
                                                    </>
                                                )}
                                                {!terminal.Color && (
                                                    <span className="text-gray-400">No especificado</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Cobro con Tarjeta
                                            </label>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                terminal.CobroTarjeta === 'SI'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {terminal.CobroTarjeta === 'SI' ? 'Sí' : 'No'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Costo
                                            </label>
                                            <p className="text-lg font-bold text-gray-900">
                                                ${terminal.Costo ? parseFloat(terminal.Costo).toFixed(2) : '0.00'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Estado
                                            </label>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                                terminal.Asignado === 'Sí'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {terminal.Asignado || 'No asignado'}
                                            </span>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Fecha de Entrega
                                            </label>
                                            <p className="text-gray-900">
                                                {formatDate(terminal.FechaEntrega)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Fecha de Recogida
                                            </label>
                                            <p className="text-gray-900">
                                                {formatDate(terminal.FechaRecoger)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Acciones rápidas */}
                        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {!terminal.ColegioID ? (
                                    <Link
                                        href={`/superadmin/terminales/${terminal.Id_terminal}/asignar`}
                                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                                    >
                                        Asignar a Colegio
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
                                                        alert('Terminal desasignado exitosamente')
                                                        loadTerminal()
                                                    }
                                                } catch (error) {
                                                    console.error('Error:', error)
                                                }
                                            }
                                        }}
                                        className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                    >
                                        Desasignar del Colegio
                                    </button>
                                )}
                                <Link
                                    href={`/superadmin/terminales/${terminal.Id_terminal}/editar`}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                                >
                                    Editar Información
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Información del Colegio */}
                    <div>
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <div className="p-6 border-b">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Colegio Asignado
                                </h2>
                            </div>

                            <div className="p-6">
                                {terminal.ColegioID ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Nombre del Colegio
                                            </label>
                                            <Link
                                                href={`/superadmin/colegios/${terminal.ColegioID}`}
                                                className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                                            >
                                                {terminal.Colegio}
                                            </Link>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                ID del Colegio
                                            </label>
                                            <p className="font-mono text-gray-900">
                                                {terminal.ColegioID}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500 mb-1">
                                                Estado de Asignación
                                            </label>
                                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                                Asignado
                                            </span>
                                        </div>
                                        <div className="pt-4">
                                            <Link
                                                href={`/superadmin/colegios/${terminal.ColegioID}`}
                                                className="w-full text-center block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                            >
                                                Ver Colegio →
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-4">🏫</div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Terminal Sin Asignar
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            Este terminal no está asignado a ningún colegio
                                        </p>
                                        <Link
                                            href={`/superadmin/terminales/${terminal.Id_terminal}/asignar`}
                                            className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            Asignar a Colegio
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}