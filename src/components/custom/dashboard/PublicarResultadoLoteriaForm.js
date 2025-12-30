// components/custom/dashboard/PublicarResultadoLoteriaForm.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSession from '@/hook/useSession'

export default function PublicarResultadoLoteriaForm({ id }) {
    const router = useRouter()
    const session = useSession()
    const [loading, setLoading] = useState(true)
    const [publishing, setPublishing] = useState(false)
    const [error, setError] = useState('')
    
    const [resultado, setResultado] = useState(null)
    const [verificacion, setVerificacion] = useState({
        primerPremioConfirmado: false,
        segundoPremioConfirmado: false
    })

    useEffect(() => {
        if (id) {
            loadResultado()
        }
    }, [id])

    const loadResultado = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/resultados-loteria-nacional/${id}`)
            
            if (response.ok) {
                const data = await response.json()
                setResultado(data)
                
                // Inicializar verificación si ya hay premios
                setVerificacion({
                    primerPremioConfirmado: !!data.primer_premio_ln,
                    segundoPremioConfirmado: !!data.segundo_premio_ln
                })
            } else {
                setError('No se pudo cargar el resultado')
            }
        } catch (error) {
            console.error('Error:', error)
            setError('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    const handleCheckboxChange = (field) => {
        setVerificacion(prev => ({
            ...prev,
            [field]: !prev[field]
        }))
    }

    const canPublish = () => {
        return verificacion.primerPremioConfirmado && verificacion.segundoPremioConfirmado
    }

    const handlePublish = async () => {
        if (!canPublish()) {
            alert('Debes verificar ambos premios antes de publicar')
            return
        }

        if (!confirm('¿Estás seguro de publicar este resultado? Una vez publicado, no podrá ser modificado.')) {
            return
        }

        try {
            setPublishing(true)
            setError('')
            
            const userData = session.getUserData()
            
            const response = await fetch(`/api/resultados-loteria-nacional/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estado: 'publicado',
                    publicado_por: userData?.id_usuario || null
                })
            })
            
            if (response.ok) {
                alert('✅ Resultado publicado exitosamente')
                router.push('/superadmin/loteria-nacional')
            } else {
                const errorData = await response.json()
                setError(errorData.error || 'Error al publicar el resultado')
            }
        } catch (error) {
            console.error('Error:', error)
            setError('Error de conexión')
        } finally {
            setPublishing(false)
        }
    }

    const handleVolver = () => {
        router.push('/superadmin/loteria-nacional')
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        return new Date(dateString).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            weekday: 'long'
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Cargando resultado...</p>
                </div>
            </div>
        )
    }

    if (!resultado) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">❌</div>
                    <p className="text-lg text-gray-700">Resultado no encontrado</p>
                    <button
                        onClick={handleVolver}
                        className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Volver
                    </button>
                </div>
            </div>
        )
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
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 bg-clip-text text-transparent">
                        ✅ Publicar Resultado
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Verifica y publica el resultado de la Lotería Nacional
                    </p>
                </div>

                {/* Card de Información */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-2">🎰</div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Sorteo #{resultado.numero_sorteo_ln}
                        </h2>
                        <p className="text-gray-600">
                            {formatDate(resultado.fecha_sorteo_ln)}
                        </p>
                    </div>

                    {/* Premios */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Primer Premio */}
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                            <div className="text-sm font-medium text-green-800 mb-2">1er Premio</div>
                            <div className="text-5xl font-bold font-mono text-green-600 mb-4">
                                {resultado.primer_premio_ln || 'No asignado'}
                            </div>
                            <label className="flex items-center justify-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={verificacion.primerPremioConfirmado}
                                    onChange={() => handleCheckboxChange('primerPremioConfirmado')}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Verificar primer premio
                                </span>
                            </label>
                        </div>

                        {/* Segundo Premio */}
                        <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                            <div className="text-sm font-medium text-blue-800 mb-2">2do Premio</div>
                            <div className="text-5xl font-bold font-mono text-blue-600 mb-4">
                                {resultado.segundo_premio_ln || 'No asignado'}
                            </div>
                            <label className="flex items-center justify-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={verificacion.segundoPremioConfirmado}
                                    onChange={() => handleCheckboxChange('segundoPremioConfirmado')}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Verificar segundo premio
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Información Adicional */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium text-gray-700 mb-2">Información del Sorteo</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Estado actual:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                                    resultado.estado === 'pendiente' 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-green-100 text-green-800'
                                }`}>
                                    {resultado.estado === 'pendiente' ? 'Pendiente' : 'Publicado'}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Creado:</span>
                                <span className="ml-2 text-gray-700">
                                    {resultado.created_at ? new Date(resultado.created_at).toLocaleDateString('es-ES') : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mensaje de Error */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Verificación de Publicación */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
                    <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                        <span className="text-xl">🔍</span>
                        Verificación para Publicación
                    </h3>
                    
                    <div className="space-y-4 mb-6">
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${verificacion.primerPremioConfirmado ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${verificacion.primerPremioConfirmado ? 'bg-green-500' : 'bg-gray-300'}`}>
                                {verificacion.primerPremioConfirmado ? '✓' : '1'}
                            </div>
                            <span className={verificacion.primerPremioConfirmado ? 'text-green-700 font-medium' : 'text-gray-700'}>
                                Primer premio verificado
                            </span>
                        </div>
                        
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${verificacion.segundoPremioConfirmado ? 'bg-green-100' : 'bg-gray-100'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${verificacion.segundoPremioConfirmado ? 'bg-green-500' : 'bg-gray-300'}`}>
                                {verificacion.segundoPremioConfirmado ? '✓' : '2'}
                            </div>
                            <span className={verificacion.segundoPremioConfirmado ? 'text-green-700 font-medium' : 'text-gray-700'}>
                                Segundo premio verificado
                            </span>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg ${canPublish() ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'}`}>
                        <p className={`font-medium ${canPublish() ? 'text-green-800' : 'text-yellow-800'}`}>
                            {canPublish() 
                                ? '✅ Todos los premios han sido verificados. Puedes proceder con la publicación.'
                                : '⚠️ Verifica ambos premios para habilitar la publicación.'
                            }
                        </p>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex gap-4">
                    <button
                        onClick={handleVolver}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={publishing}
                    >
                        Cancelar
                    </button>
                    
                    <button
                        onClick={handlePublish}
                        disabled={!canPublish() || publishing}
                        className={`px-6 py-3 text-white rounded-lg transition-all flex-1 ${
                            canPublish() 
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                                : 'bg-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {publishing ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Publicando...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <span className="text-xl">📢</span>
                                Publicar Resultado
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}