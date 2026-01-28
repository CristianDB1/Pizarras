'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSession from '@/hook/useSession'
import Link from 'next/link'

export default function CrearTerminalForm() {
    const router = useRouter()
    const session = useSession()
    const [loading, setLoading] = useState(false)
    const [colegios, setColegios] = useState([])
    const [formData, setFormData] = useState({
        NumeroSerie: '',
        Modelo: '',
        Color: '',
        CobroTarjeta: 'NO',
        Colegio: '',
        Asignado: '', // Cambiado de 'No' a vacío
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
            loadColegios()
            hasLoaded.current = true
        }
    }, [authChecked.current])

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
        
        // Si cambia ColegioID, actualizar Colegio pero NO Asignado
        if (name === 'ColegioID') {
            const colegio = Array.isArray(colegios) ? colegios.find(c => c.id_colegio === parseInt(value)) : null
            setFormData(prev => ({
                ...prev,
                ColegioID: value,
                Colegio: colegio ? colegio.nombre : ''
                // NO cambiar Asignado automáticamente
            }))
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/terminales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    ColegioID: formData.ColegioID || null,
                    Costo: parseFloat(formData.Costo) || 0,
                    // Si hay ColegioID pero Asignado está vacío, usar el nombre del colegio
                    Asignado: formData.Asignado.trim() || 
                              (formData.ColegioID ? formData.Colegio : 'No asignado')
                })
            })

            const data = await response.json()

            if (response.ok) {
                alert('Terminal creado exitosamente')
                router.push('/superadmin/terminales')
            } else {
                alert(data.error || 'Error al crear terminal')
            }
        } catch (error) {
            console.error('Error:', error)
            alert('Error al crear terminal')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            <header className="bg-white shadow-lg">
                <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-800 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                                ➕ Crear Nuevo Terminal
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Registra un nuevo equipo terminal en el sistema
                            </p>
                        </div>
                        <Link
                            href="/superadmin/terminales"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            ← Cancelar
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
                                    placeholder="Ej: SN123456789"
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
                                    placeholder="Ej: TP-LINK TL-WR940N"
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
                                    placeholder="Ej: Negro"
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
                                    Asignar a Colegio
                                </label>
                                <select
                                    name="ColegioID"
                                    value={formData.ColegioID}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Ej: Juan Pérez, Almacén Central, Bodega 3"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Especifica la persona o lugar donde está asignado el terminal
                                </p>
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
                                    placeholder="0.00"
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
                                {loading ? 'Creando...' : 'Crear Terminal'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}