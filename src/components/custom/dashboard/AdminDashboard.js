'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSession from '@/hook/useSession'
import Image from 'next/image'

// Importaremos estos componentes después
import DashboardInicio from './DashboardInicio'
import VendedoresManager from './VendedoresManager'
import SorteosManager from './SorteosManager'
import ResultadosManager from './ResultadosManager'
import CorteCajaManager from './CorteCajaManager'
import TerminalesManager from './TerminalesManager'
//import ReportesManager from './ReportesManager'

const ReportesManager = ({ colegioId }) => (
    <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900">📄 Reportes y Estadísticas</h1>
            <p className="text-gray-600">Genera reportes detallados</p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">Próximamente: Reportes personalizados, exportación a Excel/PDF y análisis avanzado.</p>
            </div>
        </div>
    </div>
);

const AdminDashboard = () => {
    const session = useSession()
    const router = useRouter()
    const params = useParams() 
    const [isClient, setIsClient] = useState(false)
    const [activeMenu, setActiveMenu] = useState('dashboard')
    const [colegioData, setColegioData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [colegioId, setColegioId] = useState(null)

    const hasLoaded = useRef(false)
    const loadingRef = useRef(false)

    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', component: 'DashboardInicio' },
        { id: 'vendedores', icon: '👥', label: 'Vendedores', component: 'VendedoresManager' },
        { id: 'sorteos', icon: '🎟️', label: 'Sorteos', component: 'SorteosManager' },
        { id: 'resultados', icon: '🏆', label: 'Resultados', component: 'ResultadosManager' },
        { id: 'corte', icon: '💰', label: 'Corte de Caja', component: 'CorteCajaManager' },
        { id: 'terminales', icon: '🖥️', label: 'Terminales', component: 'TerminalesManager' },
        { id: 'reportes', icon: '📄', label: 'Reportes', component: 'ReportesManager' }
    ]

    const loadColegioData = async (colegioId) => {
        if (loadingRef.current) return
        loadingRef.current = true
        
        try {
            setIsLoading(true)
            //console.log('📊 Cargando datos del colegio:', colegioId)
            
            if (!colegioId) {
                //console.log('❌ No hay colegioId para cargar datos')
                return
            }
            
            // Cargar datos del colegio
            const colegioResponse = await fetch(`/api/colegios/${colegioId}`)
            if (colegioResponse.ok) {
                const data = await colegioResponse.json()
                setColegioData(data)
                //console.log('✅ Datos del colegio cargados:', data.nombre)
            }

        } catch (error) {
            console.error('❌ Error cargando datos:', error)
        } finally {
            setIsLoading(false)
            loadingRef.current = false
        }
    }

    useEffect(() => {
        //console.log('🔵 useEffect - Marcando como cliente')
        setIsClient(true)
    }, [])

    // Obtener colegioId de los parámetros de la ruta
    useEffect(() => {
        if (params && params.colegioId) {
            //console.log('📌 Colegio ID de la URL:', params.colegioId)
            setColegioId(params.colegioId)
        }
    }, [params])

    // VERIFICACIÓN DE AUTENTICACIÓN Y CARGA DE DATOS
    useEffect(() => {
        if (!isClient) {
            //console.log('⏳ No es cliente aún, esperando...')
            return
        }

        /*console.log('🔍 Verificando autenticación...')
        console.log('isLoggedIn:', session.isLoggedIn())
        console.log('userType:', session.getUserType())*/

        const userData = session.getUserData()
        
        if (!session.isLoggedIn()) {
            //console.log('❌ No está logueado, redirigiendo a /loginAdmin')
            router.push('/loginAdmin')
            return
        }

        const userType = session.getUserType()
        if (userType !== 'admin_colegio' && userType !== 'superadmin') {
            //console.log(`❌ Tipo de usuario incorrecto: ${userType}, redirigiendo a /`)
            router.push('/')
            return
        }

        if (userType === 'admin_colegio' && !userData?.colegio_id) {
            //console.log('❌ Admin colegio sin colegio_id, redirigiendo a /loginAdmin')
            router.push('/loginAdmin')
            return
        }

        //console.log('✅ Autenticación OK')
        
        // Determinar el colegioId a usar
        const idColegio = userData?.colegio_id || params.colegioId
        
        if (idColegio) {
            setColegioId(idColegio)
            // Cargar datos solo una vez
            if (!hasLoaded.current) {
                //console.log('🚀 Iniciando carga de datos con colegioId:', idColegio)
                loadColegioData(idColegio)
                hasLoaded.current = true
            }
        }
        
    }, [isClient, params, session, router])

    // Función para manejar el logout
    const handleLogout = () => {
        //onsole.log('🚪 Cerrando sesión...')
        session.logout()
        router.push('/loginAdmin')
    }

    const getUserInitials = () => {
        if (!isClient) return 'AD'
        
        const userData = session.getUserData()
        if (userData && userData.nombre) {
            return userData.nombre
                .split(' ')
                .map(word => word[0])
                .join('')
                .toUpperCase()
                .substring(0, 2)
        }
        return 'AD'
    }

    // Renderizar componente activo
    const renderActiveComponent = () => {
        if (!colegioId) return null;

        const menuItem = menuItems.find(item => item.id === activeMenu);
        if (!menuItem) return <DashboardInicio colegioId={colegioId} />;

        switch(menuItem.id) {
            case 'dashboard':
                return <DashboardInicio colegioId={colegioId} />;
            case 'vendedores':
                return <VendedoresManager colegioId={colegioId} />;
            case 'sorteos':
                return <SorteosManager colegioId={colegioId} />;
            case 'resultados':
                return <ResultadosManager colegioId={colegioId} />;
            case 'corte':
                return <CorteCajaManager colegioId={colegioId} />;
            case 'terminales':
                return <TerminalesManager colegioId={colegioId} />;
            case 'reportes':
                return <ReportesManager colegioId={colegioId} />;
            default:
                return <DashboardInicio colegioId={colegioId} />;
        }
    }

    // Mostrar loading
    if (!isClient || isLoading || !colegioData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-32 h-32">
                        <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-red-500"></div>
                        <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
                            <div className="text-center">
                                <div className="text-xl font-semibold text-gray-700">Cargando</div>
                                <div className="text-sm text-gray-500">Dashboard del colegio</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-gray-900 to-black text-white shadow-xl">
                {/* Logo Section */}
                <div className="p-4 text-center bg-gradient-to-r from-red-800 to-crimson border-b-4 border-purple-500">
                    {colegioData?.logo_url ? (
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 mb-3 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-lg">
                                <Image
                                    src={colegioData.logo_url}
                                    alt={`Logo ${colegioData.nombre}`}
                                    width={80}
                                    height={80}
                                    className="object-contain p-1"
                                />
                            </div>
                            <div className="text-xl font-bold text-white truncate w-full">
                                {colegioData.nombre}
                            </div>
                            <div className="text-xs text-gray-200 mt-1">Sistema de Gestión</div>
                        </div>
                    ) : (
                        // Fallback si no hay logo
                        <div className="w-20 h-20 mx-auto mb-3 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg">
                            🎓
                        </div>
                    )}
                </div>

                {/* Menu */}
                <div className="p-4">
                    {menuItems.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 mb-2 cursor-pointer rounded-lg transition-all duration-300 ${
                                activeMenu === item.id
                                    ? 'bg-purple-500/20 text-white border-l-4 border-purple-500'
                                    : 'text-gray-400 hover:bg-crimson/10 hover:text-white border-l-4 border-transparent'
                            }`}
                            onClick={() => setActiveMenu(item.id)}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-white shadow-md p-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-800 via-crimson to-purple-600 bg-clip-text text-transparent">
                                {menuItems.find(item => item.id === activeMenu)?.label || 'Dashboard'} - {colegioData.nombre}
                            </h1>
                            
                            {/* Contenedor para enlace y botón de copiar */}
                            <div className="flex items-center gap-2">
                                <a
                                    href={`/online?colegio=${colegioId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Ver Online
                                </a>
                                
                                {/* Botón para copiar enlace */}
                                <button
                                    onClick={() => {
                                        const link = `${window.location.origin}/online?colegio=${colegioId}`;
                                        navigator.clipboard.writeText(link)
                                            .then(() => {
                                                // Feedback visual
                                                const btn = event.currentTarget;
                                                const originalHTML = btn.innerHTML;
                                                btn.innerHTML = `
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copiado!
                                                `;
                                                btn.classList.add('bg-green-100', 'text-green-800', 'hover:bg-green-100');
                                                
                                                setTimeout(() => {
                                                    btn.innerHTML = originalHTML;
                                                    btn.classList.remove('bg-green-100', 'text-green-800', 'hover:bg-green-100');
                                                }, 2000);
                                            })
                                            .catch(err => {
                                                console.error('Error al copiar: ', err);
                                            });
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                                    title="Copiar enlace"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copiar
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border-l-4 border-crimson">
                                <div className="font-semibold text-gray-900 text-sm">
                                    Admin: {session.getUserData()?.nombre || 'Administrador'}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-crimson rounded-full flex items-center justify-center text-white font-bold">
                                    {getUserInitials()}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                >
                                    Salir
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Contenido dinámico */}
                <main className="p-6 flex-1">
                    {renderActiveComponent()}
                </main>
            </div>
        </div>
    )
}

export default AdminDashboard