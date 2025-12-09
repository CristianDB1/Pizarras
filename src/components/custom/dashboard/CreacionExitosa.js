'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSession from '@/hook/useSession'

export default function CreacionExitosa() {
    const session = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [credenciales, setCredenciales] = useState(null)

    useEffect(() => {
        if (!session.isLoggedIn() || !session.isSuperAdmin()) {
            router.push('/loginAdmin')
        }

        // Obtener datos de la URL si existen
        const usuario = searchParams.get('usuario')
        const password = searchParams.get('password')
        
        if (usuario && password) {
            setCredenciales({ usuario, password })
        }
    }, [session, router, searchParams])

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl">✅</span>
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    ¡Colegio Creado Exitosamente!
                </h1>
                
                <p className="text-gray-600 mb-6">
                    El colegio y su administrador han sido registrados en el sistema.
                </p>

                {credenciales && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold text-gray-800 mb-3">
                            Credenciales del Administrador
                        </h3>
                        <div className="text-left space-y-2">
                            <div>
                                <span className="font-medium">Usuario:</span>
                                <div className="bg-white p-2 rounded border mt-1 font-mono">
                                    {credenciales.usuario}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">Contraseña:</span>
                                <div className="bg-white p-2 rounded border mt-1 font-mono">
                                    {credenciales.password}
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-3">
                            Guarda estas credenciales para entregarlas al administrador.
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/superadmin/dashboard')}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Volver al Dashboard
                    </button>
                    
                    <button
                        onClick={() => router.push('/superadmin/crear-colegio')}
                        className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Crear otro colegio
                    </button>
                </div>
            </div>
        </div>
    )
}