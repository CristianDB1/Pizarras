// components/custom/dashboard/CrearResultadoLoteriaForm.js
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSession from '@/hook/useSession'

export default function CrearResultadoLoteriaForm() {
    const router = useRouter()
    const session = useSession()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    
    const [formData, setFormData] = useState({
        numero_sorteo_ln: '',
        fecha_sorteo_ln: '',
        primer_premio_ln: '',
        segundo_premio_ln: '',
        estado: 'pendiente'
    })

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value.toUpperCase()
        }))
        
        // Limpiar errores al escribir
        if (error) setError('')
    }

    const validateForm = () => {
        if (!formData.numero_sorteo_ln.trim()) {
            setError('El número de sorteo es requerido')
            return false
        }
        
        if (!formData.fecha_sorteo_ln) {
            setError('La fecha del sorteo es requerida')
            return false
        }
        
        if (formData.primer_premio_ln && formData.primer_premio_ln.length !== 5) {
            setError('El primer premio debe tener exactamente 5 dígitos')
            return false
        }
        
        if (formData.segundo_premio_ln && formData.segundo_premio_ln.length !== 5) {
            setError('El segundo premio debe tener exactamente 5 dígitos')
            return false
        }
        
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) return
        
        try {
            setLoading(true)
            setError('')
            
            const userData = session.getUserData()
            
            const response = await fetch('/api/resultados-loteria-nacional', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    publicado_por: userData?.id_usuario || null
                })
            })
            
            if (response.ok) {
                alert('✅ Resultado creado exitosamente')
                router.push('/superadmin/loteria-nacional')
            } else {
                const errorData = await response.json()
                setError(errorData.error || 'Error al crear el resultado')
            }
        } catch (error) {
            console.error('Error:', error)
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    const handleVolver = () => {
        router.push('/superadmin/loteria-nacional')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={handleVolver}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
                    >
                        ← Volver a Lotería Nacional
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                        🎰 Crear Nuevo Resultado
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Ingresa los datos del resultado de la Lotería Nacional
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Número de Sorteo */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Número de Sorteo *
                                </label>
                                <input
                                    type="text"
                                    name="numero_sorteo_ln"
                                    value={formData.numero_sorteo_ln}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                                    placeholder="Ej: LN-2024-001"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Identificador único del sorteo
                                </p>
                            </div>

                            {/* Fecha del Sorteo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha del Sorteo *
                                </label>
                                <input
                                    type="date"
                                    name="fecha_sorteo_ln"
                                    value={formData.fecha_sorteo_ln}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                                    required
                                />
                            </div>

                            {/* Estado */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Estado
                                </label>
                                <select
                                    name="estado"
                                    value={formData.estado}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="publicado">Publicado</option>
                                </select>
                            </div>

                            {/* Primer Premio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Primer Premio (5 dígitos)
                                </label>
                                <input
                                    type="text"
                                    name="primer_premio_ln"
                                    value={formData.primer_premio_ln}
                                    onChange={handleChange}
                                    maxLength="5"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition font-mono text-center text-2xl"
                                    placeholder="00000"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Ej: 12345
                                </p>
                            </div>

                            {/* Segundo Premio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Segundo Premio (5 dígitos)
                                </label>
                                <input
                                    type="text"
                                    name="segundo_premio_ln"
                                    value={formData.segundo_premio_ln}
                                    onChange={handleChange}
                                    maxLength="5"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition font-mono text-center text-2xl"
                                    placeholder="00000"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Ej: 67890
                                </p>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="mt-8 flex gap-4">
                            <button
                                type="button"
                                onClick={handleVolver}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Creando...
                                    </span>
                                ) : (
                                    'Crear Resultado'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}