'use client'
import { useState, useEffect, useRef } from 'react'
import useSession from '@/hook/useSession'
import { useRouter } from 'next/navigation'

// Componente separado para los gráficos (solo se carga en cliente)
const ChartSection = ({ incomeChartData, drawsChartData }) => {
    const [ChartComponents, setChartComponents] = useState(null)
    const [isChartReady, setIsChartReady] = useState(false)
    
    useEffect(() => {
        // Importar solo en el cliente
        const loadCharts = async () => {
            try {
                const { Chart, registerables } = await import('chart.js')
                const { Line, Doughnut } = await import('react-chartjs-2')
                
                // Registrar componentes
                Chart.register(...registerables)
                
                setChartComponents({ Line, Doughnut })
                setIsChartReady(true)
            } catch (error) {
                console.error('Error cargando gráficos:', error)
            }
        }
        
        loadCharts()
    }, [])
    
    if (!isChartReady || !ChartComponents) {
        return (
            <>
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                        📈 Ingresos por Sorteos - Últimos 6 Meses
                    </h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                        <div className="text-gray-500">Cargando gráfico...</div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                        🏅 Top Sorteos del Mes
                    </h3>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                        <div className="text-gray-500">Cargando gráfico...</div>
                    </div>
                </div>
            </>
        )
    }
    
    const incomeChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            filler: { propagate: true }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function(value) {
                        return '$' + value.toLocaleString()
                    }
                }
            }
        }
    }
    
    const drawsChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 15,
                    font: { size: 11 }
                }
            }
        }
    }
    
    return (
        <>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                    📈 Ingresos por Sorteos - Últimos 6 Meses
                </h3>
                <div className="h-64">
                    <ChartComponents.Line data={incomeChartData} options={incomeChartOptions} />
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-3 border-b">
                    🏅 Top Sorteos del Mes
                </h3>
                <div className="h-64">
                    <ChartComponents.Doughnut data={drawsChartData} options={drawsChartOptions} />
                </div>
            </div>
        </>
    )
}

const AdminDashboard = () => {
    const session = useSession()
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)
    const [activeMenu, setActiveMenu] = useState('dashboard')
    const [searchTerm, setSearchTerm] = useState('')
    const [colegioData, setColegioData] = useState(null)
    const [stats, setStats] = useState({
        ingresos: 0,
        sorteosActivos: 0,
        vendedores: 0,
        boletosVendidos: 0
    })
    const [vendedores, setVendedores] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [authChecked, setAuthChecked] = useState(false)

    // Datos para gráficos...
    const incomeChartData = {
        labels: ['Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'],
        datasets: [{
            label: 'Ingresos ($)',
            data: [85000, 92000, 98000, 105000, 115000, 127450],
            borderColor: '#dc143c',
            backgroundColor: 'rgba(220, 20, 60, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointBackgroundColor: '#dc143c',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        }]
    }

    const drawsChartData = {
        labels: ['Gran Sorteo', 'Sorteo Especial', 'Mini Sorteo', 'Sorteo Express', 'Otros'],
        datasets: [{
            data: [35, 25, 20, 12, 8],
            backgroundColor: [
                '#dc143c',
                '#9b30ff',
                '#1a1a1a',
                '#ff69b4',
                '#cccccc'
            ],
            borderWidth: 3,
            borderColor: '#fff'
        }]
    }

    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'vendedores', icon: '👥', label: 'Vendedores' },
        { id: 'sorteos', icon: '🎟️', label: 'Sorteos' },
        { id: 'resultados', icon: '🏆', label: 'Resultados' },
        { id: 'corte', icon: '💰', label: 'Corte de Caja' },
        { id: 'terminales', icon: '🖥️', label: 'Terminales' },
        { id: 'reportes', icon: '📄', label: 'Reportes' }
    ]

    useEffect(() => {
        console.log('🔵 useEffect - Marcando como cliente')
        setIsClient(true)
    }, [])

    // VERIFICACIÓN DE AUTENTICACIÓN - CORREGIDA
    useEffect(() => {
        if (!isClient) {
            console.log('⏳ No es cliente aún, esperando...')
            return
        }

        console.log('🔍 Verificando autenticación...')
        console.log('isClient:', isClient)
        console.log('session.isLoggedIn():', session.isLoggedIn())
        console.log('session.getUserType():', session.getUserType())
        console.log('session.getUserData():', session.getUserData())

        const userData = session.getUserData()
        
        if (!session.isLoggedIn()) {
            console.log('❌ No está logueado, redirigiendo a /loginAdmin')
            router.push('/loginAdmin')
            return
        }

        const userType = session.getUserType()
        if (userType !== 'admin_colegio' && userType !== 'superadmin') {
            console.log(`❌ Tipo de usuario incorrecto: ${userType}, redirigiendo a /`)
            router.push('/')
            return
        }

        if (userType === 'admin_colegio' && !userData?.colegio_id) {
            console.log('❌ Admin colegio sin colegio_id, redirigiendo a /loginAdmin')
            router.push('/loginAdmin')
            return
        }

        console.log('✅ Autenticación OK, marcando como verificada')
        setAuthChecked(true)
        
    }, [isClient, session, router])

    // Cargar datos solo después de verificar autenticación
    useEffect(() => {
        if (!authChecked || !isClient) return

        console.log('📊 Cargando datos del dashboard...')
        const userData = session.getUserData()
        
        const loadAllData = async () => {
            try {
                setIsLoading(true)
                
                // Cargar datos del colegio
                if (userData?.colegio_id) {
                    console.log('📁 Cargando datos del colegio:', userData.colegio_id)
                    const colegioResponse = await fetch(`/api/colegios/${userData.colegio_id}`)
                    if (colegioResponse.ok) {
                        const data = await colegioResponse.json()
                        setColegioData(data)
                        console.log('✅ Datos del colegio cargados:', data.nombre)
                    }
                }

                // Cargar estadísticas
                if (userData?.colegio_id) {
                    console.log('📈 Cargando estadísticas...')
                    const statsResponse = await fetch(`/api/stats/colegio/${userData.colegio_id}`)
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json()
                        setStats(statsData)
                        console.log('✅ Estadísticas cargadas')
                    }
                }

                // Cargar vendedores
                if (userData?.colegio_id) {
                    console.log('👥 Cargando vendedores...')
                    const vendedoresResponse = await fetch(`/api/vendedores/colegio/${userData.colegio_id}`)
                    if (vendedoresResponse.ok) {
                        const vendedoresData = await vendedoresResponse.json()
                        setVendedores(vendedoresData)
                        console.log('✅ Vendedores cargados:', vendedoresData.length)
                    } else {
                        // Datos de ejemplo
                        setVendedores([
                            { id: 1, nombre: 'María Contreras', boletos: 487, ventas: 24350, comision: 2435, estado: 'activo', iniciales: 'MC' },
                            { id: 2, nombre: 'José López', boletos: 425, ventas: 21250, comision: 2125, estado: 'activo', iniciales: 'JL' },
                            { id: 3, nombre: 'Ana García', boletos: 398, ventas: 19900, comision: 1990, estado: 'activo', iniciales: 'AG' }
                        ])
                    }
                }
            } catch (error) {
                console.error('❌ Error cargando datos:', error)
            } finally {
                setIsLoading(false)
                console.log('🏁 Carga de datos completada')
            }
        }

        loadAllData()
    }, [authChecked, isClient, session])

    // ... resto de las funciones (handleLogout, getUserInitials, etc.)

    const filteredVendedores = vendedores.filter(vendedor =>
        vendedor.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleLogout = () => {
        console.log('🚪 Cerrando sesión...')
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

    // Mostrar loading mientras se verifica autenticación
    if (!isClient || !authChecked) {
        console.log('🌀 Mostrando loading (verificando autenticación)')
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-32 h-32">
                        <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-red-500"></div>
                        <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
                            <div className="text-center">
                                <div className="text-xl font-semibold text-gray-700">Verificando</div>
                                <div className="text-sm text-gray-500">sesión...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Si está cargando datos
    if (isLoading) {
        console.log('🌀 Mostrando loading (cargando datos)')
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

    console.log('🎨 Renderizando dashboard...')

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            {/* Sidebar */}
            <div className="w-64 bg-gradient-to-b from-gray-900 to-black text-white shadow-xl">
                {/* Logo Section */}
                <div className="p-6 text-center bg-gradient-to-r from-red-800 to-crimson border-b-4 border-purple-500">
                    <div className="w-20 h-20 mx-auto mb-3 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg">
                        🎓
                    </div>
                    <div className="text-2xl font-bold text-white">Tu Sorteo</div>
                    <div className="text-xs text-gray-200 mt-1">Sistema de Gestión</div>
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
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-800 via-crimson to-purple-600 bg-clip-text text-transparent">
                            Dashboard Principal
                        </h1>
                        <div className="flex items-center gap-6">
                            <div className="px-5 py-2 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg border-l-4 border-crimson">
                                <div className="font-semibold text-gray-900">
                                    {colegioData?.nombre || 'Colegio Mexicano'}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-crimson rounded-full flex items-center justify-center text-white font-bold">
                                    {getUserInitials()}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Salir
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <main className="p-6 flex-1">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {/* Ingresos Totales */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-crimson hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                                    Ingresos Totales
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-crimson to-red-900 rounded-lg flex items-center justify-center text-white text-xl">
                                    💵
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                ${(stats.ingresos || 127450).toLocaleString()}
                            </div>
                            <div className="text-gray-500 text-sm mb-3">Último mes</div>
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                ↑ 15.3%
                            </span>
                        </div>

                        {/* Sorteos Activos */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-600 hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                                    Sorteos Activos
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center text-white text-xl">
                                    🎟️
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {stats.sorteosActivos || 24}
                            </div>
                            <div className="text-gray-500 text-sm mb-3">En curso</div>
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                ↑ 8 nuevos
                            </span>
                        </div>

                        {/* Vendedores */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-gray-900 hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                                    Vendedores
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center text-white text-xl">
                                    👥
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {stats.vendedores || 42}
                            </div>
                            <div className="text-gray-500 text-sm mb-3">Activos</div>
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                ↑ 5 este mes
                            </span>
                        </div>

                        {/* Boletos Vendidos */}
                        <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-crimson hover:-translate-y-1 transition-transform">
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-gray-500 text-sm font-medium uppercase tracking-wider">
                                    Boletos Vendidos
                                </div>
                                <div className="w-12 h-12 bg-gradient-to-br from-crimson to-red-900 rounded-lg flex items-center justify-center text-white text-xl">
                                    🎫
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {(stats.boletosVendidos || 3847).toLocaleString()}
                            </div>
                            <div className="text-gray-500 text-sm mb-3">Este mes</div>
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                ↑ 22.1%
                            </span>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        <ChartSection 
                            incomeChartData={incomeChartData}
                            drawsChartData={drawsChartData}
                        />
                    </div>

                    {/* Sellers Table */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    🌟 Ranking de Vendedores por Ventas
                                </h3>
                                <input
                                    type="text"
                                    placeholder="Buscar vendedor..."
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                                    <tr>
                                        <th className="p-4 text-left text-xs font-medium uppercase tracking-wider">#</th>
                                        <th className="p-4 text-left text-xs font-medium uppercase tracking-wider">Vendedor</th>
                                        <th className="p-4 text-left text-xs font-medium uppercase tracking-wider">Boletos Vendidos</th>
                                        <th className="p-4 text-left text-xs font-medium uppercase tracking-wider">Total Ventas</th>
                                        <th className="p-4 text-left text-xs font-medium uppercase tracking-wider">Comisión</th>
                                        <th className="p-4 text-left text-xs font-medium uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredVendedores.map((vendedor, index) => (
                                        <tr key={vendedor.id} className="hover:bg-gray-50">
                                            <td className="p-4">{index + 1}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-r from-crimson to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                        {vendedor.iniciales || vendedor.nombre?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span>{vendedor.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">{vendedor.boletos || 0}</td>
                                            <td className="p-4 font-semibold">${(vendedor.ventas || 0).toLocaleString()}</td>
                                            <td className="p-4">${(vendedor.comision || 0).toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    (vendedor.estado || 'activo') === 'activo'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {(vendedor.estado || 'activo') === 'activo' ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}


export default AdminDashboard