'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSession from '@/hook/useSession'
import Link from 'next/link'

export default function AsignarTerminalForm() {
    const router = useRouter()
    const params = useParams()
    const session = useSession()
    const [loading, setLoading] = useState(false)
    const [terminal, setTerminal] = useState(null)
    const [colegios, setColegios] = useState([])
    const [formData, setFormData] = useState({
        ColegioID: '',
        Colegio: '',
        FechaEntrega: '',
        Asignado: '' // Cambiado de 'Sí' a vacío
    })

    const hasLoaded = useRef(false)
    const authChecked = useRef(false)
    const terminalId = params.id

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
    }, [authChecked.current, terminalId])
    
    const loadTerminal = async () => {
        try {
            const response = await fetch(`/api/terminales/${params.id}`)
            if (response.ok) {
                const data = await response.json()
                setTerminal(data)
                setFormData({
                    ColegioID: data.ColegioID || '',
                    Colegio: data.Colegio || '',
                    FechaEntrega: data.FechaEntrega || '',
                    // Mantener el valor actual si existe, de lo contrario vacío
                    Asignado: data.Asignado || ''
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
                // Asegurarse de que sea un array
                if (Array.isArray(data)) {
                    setColegios(data)
                } else if (data && Array.isArray(data.data)) {
                    // Si la respuesta tiene formato { data: [...] }
                    setColegios(data.data)
                } else if (data && data.colegios) {
                    // Si la respuesta tiene formato { colegios: [...] }
                    setColegios(data.colegios)
                } else {
                    console.error('Formato de respuesta inesperado:', data)
                    setColegios([])
                }
            } else {
                console.error('Error en la respuesta de colegios:', response.status)
                setColegios([])
            }
        } catch (error) {
            console.error('Error cargando colegios:', error)
            setColegios([])
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
                Colegio: colegio ? colegio.nombre : ''
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        // Validar que se haya especificado a quién está asignado
        if (!formData.Asignado.trim()) {
            alert('Por favor, especifica a quién está asignado el terminal')
            setLoading(false)
            return
        }

        try {
            const response = await fetch(`/api/terminales/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...terminal,
                    ...formData,
                    // Si hay colegio pero no se especificó Asignado, usar el colegio
                    Asignado: formData.Asignado.trim() || (formData.ColegioID ? formData.Colegio : 'No asignado')
                })
            })

            if (response.ok) {
                alert('Terminal asignado exitosamente')
                router.push('/superadmin/terminales')
            } else {
                const data = await response.json()
                alert(data.error || 'Error al asignar terminal')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al asignar terminal')
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
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-800 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                                🎯 Asignar Terminal
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Asigna este terminal a un colegio y especifica quién lo tiene
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
                        <div className="grid grid-cols-1 gap-6">
                            {/* Información del Terminal */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-medium text-gray-700 mb-2">Información del Terminal</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Número de Serie</p>
                                        <p className="font-mono font-bold">{terminal.NumeroSerie}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Modelo</p>
                                        <p>{terminal.Modelo || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Color</p>
                                        <div className="flex items-center gap-2">
                                            {terminal.Color && (
                                                <>
                                                    <div 
                                                        className="w-4 h-4 rounded-full"
                                                        style={{ backgroundColor: terminal.Color.toLowerCase() }}
                                                    />
                                                    <span>{terminal.Color}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Estado Actual</p>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            terminal.Asignado && terminal.Asignado !== 'No' && terminal.Asignado !== 'No asignado'
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {terminal.Asignado || 'No asignado'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Seleccionar Colegio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleccionar Colegio *
                                </label>
                                <select
                                    name="ColegioID"
                                    value={formData.ColegioID}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="">Seleccionar colegio...</option>
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

                            {/* Asignado a (Persona/Lugar) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Asignado a (Persona/Lugar) *
                                </label>
                                <input
                                    type="text"
                                    name="Asignado"
                                    value={formData.Asignado}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Ej: Juan Pérez, Almacén Central, Bodega 3"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Especifica la persona o lugar donde está asignado el terminal
                                </p>
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            {/* Colegio seleccionado */}
                            {formData.Colegio && (
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h3 className="font-medium text-green-800 mb-2">Colegio Seleccionado</h3>
                                    <p className="text-green-700">{formData.Colegio}</p>
                                </div>
                            )}

                            {/* Resumen de lo que se va a asignar */}
                            {(formData.ColegioID || formData.Asignado) && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h3 className="font-medium text-blue-800 mb-2">Resumen de Asignación</h3>
                                    <div className="space-y-1">
                                        {formData.Colegio && (
                                            <p className="text-blue-700">✅ Colegio: <span className="font-semibold">{formData.Colegio}</span></p>
                                        )}
                                        {formData.Asignado && (
                                            <p className="text-blue-700">✅ Asignado a: <span className="font-semibold">{formData.Asignado}</span></p>
                                        )}
                                        {formData.FechaEntrega && (
                                            <p className="text-blue-700">✅ Fecha de entrega: <span className="font-semibold">{formData.FechaEntrega}</span></p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

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
                                disabled={loading || !formData.ColegioID || !formData.Asignado.trim()}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Asignando...' : 'Asignar Terminal'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}