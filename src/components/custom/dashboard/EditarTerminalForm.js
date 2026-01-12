'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSession from '@/hook/useSession'
import Link from 'next/link'

export default function EditarTerminalForm() {
    const router = useRouter()
    const params = useParams()
    const session = useSession()
    const [loading, setLoading] = useState(false)
    const [terminal, setTerminal] = useState(null)
    const [colegios, setColegios] = useState([])
    const [formData, setFormData] = useState({
        NumeroSerie: '',
        Modelo: '',
        Color: '',
        CobroTarjeta: 'NO',
        Colegio: '',
        Asignado: 'No',
        FechaEntrega: '',
        FechaRecoger: '',
        Costo: '',
        ColegioID: ''
    })

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
            loadColegios()
            hasLoaded.current = true
        }
    }, [authChecked.current])

    const loadTerminal = async () => {
        try {
            const response = await fetch(`/api/terminales/${params.id}`)
            if (response.ok) {
                const data = await response.json()
                setTerminal(data)
                setFormData({
                    NumeroSerie: data.NumeroSerie || '',
                    Modelo: data.Modelo || '',
                    Color: data.Color || '',
                    CobroTarjeta: data.CobroTarjeta || 'NO',
                    Colegio: data.Colegio || '',
                    Asignado: data.Asignado || 'No',
                    FechaEntrega: data.FechaEntrega ? data.FechaEntrega.split('T')[0] : '',
                    FechaRecoger: data.FechaRecoger ? data.FechaRecoger.split('T')[0] : '',
                    Costo: data.Costo || '',
                    ColegioID: data.ColegioID || ''
                })
            }
        } catch (error) {
            console.error('Error cargando terminal:', error)
        }
    }

    const loadColegios = async () => {
        try {
            const response = await fetch('/api/colegios?estatus=activo')
            if (response.ok) {
                const data = await response.json()
                setColegios(data)
            }
        } catch (error) {
            console.error('Error cargando colegios:', error)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        if (name === 'ColegioID') {
            const colegio = colegios.find(c => c.id_colegio === parseInt(value))
            setFormData(prev => ({
                ...prev,
                Colegio: colegio ? colegio.nombre : '',
                Asignado: value ? 'Sí' : 'No'
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch(`/api/terminales/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    ColegioID: formData.ColegioID || null,
                    Costo: parseFloat(formData.Costo) || 0
                })
            })

            if (response.ok) {
                alert('Terminal actualizado exitosamente')
                router.push('/superadmin/terminales')
            } else {
                const data = await response.json()
                alert(data.error || 'Error al actualizar terminal')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al actualizar terminal')
        } finally {
            setLoading(false)
        }
    }

    if (!terminal) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                    <p className="text-gray-600 mt-4">Cargando terminal...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <header className="bg-white shadow-lg">
                <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-800 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                                ✏️ Editar Terminal
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Modifica la información del terminal
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                N° Serie: <span className="font-mono font-bold">{terminal.NumeroSerie}</span>
                            </p>
                        </div>
                        <Link
                            href="/superadmin/terminales"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            ← Volver
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Número de Serie */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Serie *
                                </label>
                                <input
                                    type="text"
                                    name="NumeroSerie"
                                    value={formData.NumeroSerie}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Modelo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Modelo
                                </label>
                                <input
                                    type="text"
                                    name="Modelo"
                                    value={formData.Modelo}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Color */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Color
                                </label>
                                <input
                                    type="text"
                                    name="Color"
                                    value={formData.Color}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Cobro con Tarjeta */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cobro con Tarjeta
                                </label>
                                <select
                                    name="CobroTarjeta"
                                    value={formData.CobroTarjeta}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="NO">No</option>
                                    <option value="SI">Sí</option>
                                </select>
                            </div>

                            {/* Colegio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Colegio Asignado
                                </label>
                                <select
                                    name="ColegioID"
                                    value={formData.ColegioID}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="">Sin asignar</option>
                                    {colegios.map(colegio => (
                                        <option key={colegio.id_colegio} value={colegio.id_colegio}>
                                            {colegio.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Costo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Costo
                                </label>
                                <input
                                    type="number"
                                    name="Costo"
                                    value={formData.Costo}
                                    onChange={handleChange}
                                    step="0.01"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Fecha de Entrega */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de Entrega
                                </label>
                                <input
                                    type="date"
                                    name="FechaEntrega"
                                    value={formData.FechaEntrega}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Fecha de Recoger */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de Recogida
                                </label>
                                <input
                                    type="date"
                                    name="FechaRecoger"
                                    value={formData.FechaRecoger}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Estado actual */}
                        {terminal && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-medium text-gray-700 mb-2">Estado Actual</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Asignado</p>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            terminal.Asignado === 'Sí'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {terminal.Asignado || 'No'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Colegio</p>
                                        <p>{terminal.Colegio || 'Ninguno'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Cobro Tarjeta</p>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            terminal.CobroTarjeta === 'SI'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {terminal.CobroTarjeta === 'SI' ? 'Sí' : 'No'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Fecha Entrega</p>
                                        <p>{terminal.FechaEntrega ? terminal.FechaEntrega.split('T')[0] : 'No especificada'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex justify-end gap-4 pt-6 border-t">
                            <Link
                                href="/superadmin/terminales"
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancelar
                            </Link>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Actualizando...' : 'Actualizar Terminal'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}