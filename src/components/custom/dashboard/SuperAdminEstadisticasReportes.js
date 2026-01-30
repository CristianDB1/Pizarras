'use client'
import { useState, useEffect, useRef } from 'react'
import useSession from '@/hook/useSession'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { CSVLink } from 'react-csv'

export default function EstadisticasSuperAdmin() {
    const session = useSession()
    const router = useRouter()
    const [isClient, setIsClient] = useState(false)
    const [colegios, setColegios] = useState([])
    const [colegioDetallado, setColegioDetallado] = useState(null)
    const [loading, setLoading] = useState(false)
    const [loadingDetalle, setLoadingDetalle] = useState(false)
    const [fechaInicio, setFechaInicio] = useState(null)
    const [fechaFin, setFechaFin] = useState(null)
    const [estatusFilter, setEstatusFilter] = useState('todos')
    const [selectedColegioId, setSelectedColegioId] = useState(null)
    
    // Para exportar CSV
    const [csvData, setCsvData] = useState([])
    const [csvFileName, setCsvFileName] = useState('reporte_colegios.csv')
    
    // Para mostrar/ocultar detalles
    const [showDetalle, setShowDetalle] = useState(false)
    
    // Refs para controlar bucles
    const authChecked = useRef(false)
    const initialLoad = useRef(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    // Cargar datos iniciales una sola vez
    useEffect(() => {
        if (!isClient || initialLoad.current) return

        const userType = session.getUserType()
        if (userType !== 'superadmin') {
            router.push('/')
            return
        }

        // Cargar datos iniciales (últimos 30 días)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        
        setFechaInicio(startDate)
        setFechaFin(endDate)
        
        initialLoad.current = true
        
    }, [isClient, router, session])

    // Efecto separado para cargar datos cuando se establecen las fechas
    useEffect(() => {
        if (fechaInicio && fechaFin && initialLoad.current) {
            loadColegiosConFiltros(fechaInicio, fechaFin, 'todos')
        }
    }, [fechaInicio, fechaFin])

    const loadColegiosConFiltros = async (startDate, endDate, estatus) => {
        try {
            setLoading(true)
            setShowDetalle(false)
            setColegioDetallado(null)
            setSelectedColegioId(null)
            
            const params = new URLSearchParams()
            if (startDate) {
                params.append('fechaInicio', startDate.toISOString().split('T')[0])
            }
            if (endDate) {
                params.append('fechaFin', endDate.toISOString().split('T')[0])
            }
            if (estatus && estatus !== 'todos') {
                params.append('estatus', estatus)
            }

            const response = await fetch(`/api/colegios/estadisticas?${params.toString()}`)
            
            if (response.ok) {
                const data = await response.json()
                setColegios(data.colegios || [])
                
                // Preparar datos para CSV
                prepararDatosCSV(data.colegios || [], startDate, endDate, estatus)
            } else {
                setColegios([])
                setCsvData([])
            }
        } catch (error) {
            console.error('Error cargando colegios:', error)
            setColegios([])
            setCsvData([])
        } finally {
            setLoading(false)
        }
    }

    const prepararDatosCSV = (data, startDate, endDate, estatus) => {
        const csvData = data.map(colegio => ({
            'ID': colegio.id_colegio,
            'Nombre': colegio.nombre,
            'Fecha Registro': colegio.created_at ? new Date(colegio.created_at).toLocaleDateString('es-ES') : 'N/A',
            'Estatus': colegio.estatus === 'activo' ? 'Activo' : 'Inactivo',
            'Sorteos Activos': colegio.sorteos_activos || 0,
            'Boletos Vendidos': colegio.boletos_vendidos || 0,
            'Recaudación Actual': formatCurrencyForCSV(colegio.recaudacion_actual || 0),
            'Recaudación Esperada': formatCurrencyForCSV(colegio.recaudacion_esperada_total || 0),
            'Comisión Actual': formatCurrencyForCSV(colegio.comision_actual_total || 0),
            'Comisión Esperada': formatCurrencyForCSV(colegio.comision_esperada_total || 0),
            'Porcentaje Venta': `${colegio.porcentaje_venta || 0}%`,
            'Neto Actual': formatCurrencyForCSV((colegio.recaudacion_actual || 0) - (colegio.comision_actual_total || 0)),
            'Neto Esperado': formatCurrencyForCSV((colegio.recaudacion_esperada_total || 0) - (colegio.comision_esperada_total || 0))
        }))

        setCsvData(csvData)
        
        // Nombre del archivo con filtros
        const filtros = []
        if (startDate) filtros.push(`desde-${startDate.toISOString().split('T')[0]}`)
        if (endDate) filtros.push(`hasta-${endDate.toISOString().split('T')[0]}`)
        if (estatus && estatus !== 'todos') filtros.push(`estatus-${estatus}`)
        
        setCsvFileName(`reporte-colegios-${filtros.length > 0 ? filtros.join('-') : 'completo'}.csv`)
    }

    // Función para CSV (sin símbolo $ al inicio para mejor compatibilidad)
    const formatCurrencyForCSV = (amount) => {
        return `$${new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0)}`
    }

    const cargarDetalleColegio = async (colegioId) => {
        try {
            setLoadingDetalle(true)
            setSelectedColegioId(colegioId)
            setShowDetalle(true)
            
            // Cargar datos detallados del colegio
            const response = await fetch(`/api/colegios/${colegioId}/reporte-detallado`)
            
            if (response.ok) {
                const data = await response.json()
                setColegioDetallado(data)
            } else {
                setColegioDetallado(null)
            }
        } catch (error) {
            console.error('Error cargando detalle:', error)
            setColegioDetallado(null)
        } finally {
            setLoadingDetalle(false)
        }
    }

    const handleFiltrar = () => {
        loadColegiosConFiltros(fechaInicio, fechaFin, estatusFilter)
    }

    const handleResetFiltros = () => {
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
        
        setFechaInicio(startDate)
        setFechaFin(endDate)
        setEstatusFilter('todos')
        
        // No llamar directamente a loadColegiosConFiltros aquí
        // Se activará automáticamente con el useEffect cuando se actualicen las fechas
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            return new Date(dateString).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })
        } catch (error) {
            return 'Fecha inválida'
        }
    }

    // CORREGIDO: Ahora muestra pesos mexicanos (MXN)
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0)
    }

    // Formato simplificado para pesos (solo el símbolo $)
    const formatCurrencySimple = (amount) => {
        return `$${new Intl.NumberFormat('es-MX', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0)}`
    }

    const formatPorcentaje = (porcentaje) => {
        return `${parseFloat(porcentaje || 0).toFixed(2)}%`
    }

    if (!isClient) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-32 h-32">
                        <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-500"></div>
                        <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
                            <div className="text-center">
                                <div className="text-xl font-semibold text-gray-700">Cargando</div>
                                <div className="text-sm text-gray-500">Estadísticas y Reportes</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
            {/* Header */}
            <header className="bg-white shadow-lg">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-800 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                📊 Estadísticas y Reportes
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Análisis detallado de colegios y sorteos
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.push('/superadmin/dashboard')}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                ← Volver al Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Filtros */}
                <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                        🔍 Filtros de Búsqueda
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha Inicio
                            </label>
                            <DatePicker
                                selected={fechaInicio}
                                onChange={(date) => setFechaInicio(date)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                dateFormat="dd/MM/yyyy"
                                isClearable
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha Fin
                            </label>
                            <DatePicker
                                selected={fechaFin}
                                onChange={(date) => setFechaFin(date)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                dateFormat="dd/MM/yyyy"
                                isClearable
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Estatus
                            </label>
                            <select
                                value={estatusFilter}
                                onChange={(e) => setEstatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="todos">Todos los estatus</option>
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                            </select>
                        </div>
                        
                        <div className="flex items-end gap-4">
                            <button
                                onClick={handleFiltrar}
                                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                            >
                                Aplicar Filtros
                            </button>
                            <button
                                onClick={handleResetFiltros}
                                className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                            >
                                Resetear
                            </button>
                        </div>
                    </div>
                    
                    {/* Exportar CSV */}
                    <div className="mt-6 flex justify-end">
                        {csvData.length > 0 && (
                            <CSVLink
                                data={csvData}
                                filename={csvFileName}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                            >
                                📥 Exportar a CSV
                            </CSVLink>
                        )}
                    </div>
                </div>

                {/* Listado de Colegios */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
                    <div className="p-6 border-b">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">
                                🏫 Listado de Colegios ({colegios.length})
                            </h2>
                            <div className="flex items-center gap-4">
                                <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                                    Activos: {colegios.filter(c => c.estatus === 'activo').length}
                                </div>
                                <div className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full font-medium">
                                    Inactivos: {colegios.filter(c => c.estatus === 'inactivo').length}
                                </div>
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-1">
                            Haga clic en un colegio para ver el reporte detallado
                        </p>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                            <p className="text-gray-600 mt-2">Cargando colegios...</p>
                        </div>
                    ) : colegios.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-4">📊</div>
                            <p className="text-lg">No se encontraron colegios con los filtros aplicados</p>
                            <p className="text-sm mt-2">Prueba con otros criterios de búsqueda</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Colegio
                                        </th>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fecha Registro
                                        </th>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Estatus
                                        </th>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sorteos Activos
                                        </th>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Recaudación Actual
                                        </th>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            % Venta
                                        </th>
                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {colegios.map((colegio) => (
                                        <tr 
                                            key={colegio.id_colegio} 
                                            className={`hover:bg-gray-50 cursor-pointer ${
                                                selectedColegioId === colegio.id_colegio ? 'bg-purple-50' : ''
                                            }`}
                                            onClick={() => cargarDetalleColegio(colegio.id_colegio)}
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {/* LOGO - usar colegio.logo_url */}
                                                    {colegio.logo_url ? (
                                                        <div className="relative">
                                                            <img 
                                                                src={colegio.logo_url}
                                                                alt={`Logo de ${colegio.nombre}`}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    const fallbackDiv = document.createElement('div');
                                                                    fallbackDiv.className = "w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold";
                                                                    fallbackDiv.textContent = colegio.nombre?.charAt(0) || 'C';
                                                                    e.target.parentNode.appendChild(fallbackDiv);
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                                            {colegio.nombre?.charAt(0) || 'C'}
                                                        </div>
                                                    )}
                                                    {/* NOMBRE - usar colegio.nombre */}
                                                    <div>
                                                    <div className="font-medium text-gray-900">
                                                        {colegio.nombre || 'Sin nombre'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {colegio.boletos_vendidos || 0} boletos vendidos
                                                    </div>
                                                    </div>
                                                </div>
                                                </td>
                                            <td className="p-4 text-gray-600">
                                                {formatDate(colegio.created_at)}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    colegio.estatus === 'activo'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {colegio.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="font-bold text-lg text-purple-600">
                                                    {colegio.sorteos_activos || 0}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-green-600">
                                                {formatCurrency(colegio.recaudacion_actual || 0)}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center">
                                                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                                        <div 
                                                            className="bg-green-500 h-2 rounded-full"
                                                            style={{ width: `${Math.min(parseFloat(colegio.porcentaje_venta || 0), 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium">
                                                        {formatPorcentaje(colegio.porcentaje_venta)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        cargarDetalleColegio(colegio.id_colegio)
                                                    }}
                                                    className="text-purple-600 hover:text-purple-800 font-medium text-sm flex items-center gap-1"
                                                >
                                                    📊 Ver Reporte
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Reporte Detallado del Colegio */}
                {showDetalle && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 border-b">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    📋 Reporte Detallado
                                    {colegioDetallado?.colegio && ` - ${colegioDetallado.colegio.nombre}`}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowDetalle(false)
                                        setColegioDetallado(null)
                                        setSelectedColegioId(null)
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕ Cerrar
                                </button>
                            </div>
                        </div>

                        {loadingDetalle ? (
                            <div className="p-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                                <p className="text-gray-600 mt-2">Cargando reporte detallado...</p>
                            </div>
                        ) : colegioDetallado ? (
                            <div className="p-6">
                                {/* Información del Colegio */}
                                <div className="mb-8 p-6 bg-gray-50 rounded-xl">
                                    <div className="flex items-start gap-6">
                                        {colegioDetallado.colegio?.logo_url ? (
                                            <Image 
                                                src={colegioDetallado.colegio.logo_url}
                                                width={150}
                                                height={150} 
                                                alt={colegioDetallado.colegio.nombre}
                                                className="w-24 h-24 rounded-xl object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none'
                                                    e.target.parentNode.innerHTML = `
                                                        <div class="w-24 h-24 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-4xl">
                                                            ${colegioDetallado.colegio.nombre?.charAt(0) || 'C'}
                                                        </div>
                                                    `
                                                }}
                                            />
                                        ) : (
                                            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-4xl">
                                                {colegioDetallado.colegio?.nombre?.charAt(0) || 'C'}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-bold text-gray-900">
                                                {colegioDetallado.colegio?.nombre}
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                                <div>
                                                    <p className="text-sm text-gray-600">Fecha Registro</p>
                                                    <p className="font-semibold">{formatDate(colegioDetallado.colegio?.created_at)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Estatus</p>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                        colegioDetallado.colegio?.estatus === 'activo'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {colegioDetallado.colegio?.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Sorteos Activos</p>
                                                    <p className="font-bold text-lg text-purple-600">
                                                        {colegioDetallado.colegio?.sorteos_activos_count || 0}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Sorteos</p>
                                                    <p className="font-bold text-lg text-gray-700">
                                                        {colegioDetallado.colegio?.total_sorteos || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sorteos Activos */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        🎰 Sorteos Activos ({colegioDetallado.sorteos_activos?.length || 0})
                                    </h3>
                                    
                                    {colegioDetallado.sorteos_activos && colegioDetallado.sorteos_activos.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Sorteo
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Dígitos
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Fecha
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Boletos
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Recaudación
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            % Venta
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Comisión Esperada
                                                        </th>
                                                        <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Comisión Actual
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {colegioDetallado.sorteos_activos.map((sorteo) => (
                                                        <tr key={sorteo.id_sorteo} className="hover:bg-gray-50">
                                                            <td className="p-4">
                                                                <div className="font-medium text-gray-900">
                                                                    {sorteo.nombre_sorteo}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    #{sorteo.numero_sorteo}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="font-mono font-bold text-purple-600">
                                                                    {sorteo.digitos || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-gray-600">
                                                                {formatDate(sorteo.fecha_sorteo)}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold">{sorteo.boletos_vendidos || 0}</span>
                                                                        <span className="text-gray-400">/</span>
                                                                        <span className="text-gray-600">{sorteo.boletos_totales?.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {sorteo.boletos_disponibles?.toLocaleString()} disponibles
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-green-600">
                                                                        {formatCurrency(sorteo.recaudacion_actual || 0)}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        de {formatCurrency(sorteo.recaudacion_esperada || 0)}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-lg text-purple-600">
                                                                        {formatPorcentaje(sorteo.porcentaje_venta)}
                                                                    </span>
                                                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                                                        <div 
                                                                            className="bg-green-500 h-1.5 rounded-full"
                                                                            style={{ width: `${Math.min(parseFloat(sorteo.porcentaje_venta || 0), 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {/* Comisión Esperada */}
                                                            <td className="p-4 font-bold text-blue-600">
                                                                {formatCurrency(sorteo.comision_esperada || 0)}
                                                            </td>
                                                            {/* Comisión Actual */}
                                                            <td className="p-4 font-bold text-green-600">
                                                                {formatCurrency(sorteo.comision_actual || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {/* Total - FILA MODIFICADA */}
                                                    {colegioDetallado.resumen_financiero && (
                                                        <tr className="bg-gray-50 font-bold">
                                                            <td colSpan="4" className="p-4 text-right">
                                                                TOTALES:
                                                            </td>
                                                            {/* Recaudación Total */}
                                                            <td className="p-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-blue-700">
                                                                        {formatCurrency(colegioDetallado.resumen_financiero.recaudacion_actual_total || 0)}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        de {formatCurrency(colegioDetallado.resumen_financiero.recaudacion_esperada_total || 0)}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            {/* Porcentaje de Venta Total */}
                                                            <td className="p-4 text-purple-700">
                                                                {formatPorcentaje(colegioDetallado.resumen_financiero.porcentaje_venta_total)}
                                                            </td>
                                                            {/* Comisión Esperada Total */}
                                                            <td className="p-4 text-blue-700">
                                                                {formatCurrency(colegioDetallado.resumen_financiero.comision_esperada_total || 0)}
                                                            </td>
                                                            {/* Comisión Actual Total */}
                                                            <td className="p-4 text-green-700">
                                                                {formatCurrency(colegioDetallado.resumen_financiero.comision_actual_total || 0)}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <div className="text-4xl mb-4">🎰</div>
                                            <p className="text-lg">No hay sorteos activos para este colegio</p>
                                        </div>
                                    )}
                                </div>

                                {/* Resumen Financiero */}
                                {colegioDetallado.resumen_financiero && (
                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-5 gap-6">
                                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
                                            <h4 className="text-lg font-semibold mb-2">💰 Recaudación Actual</h4>
                                            <p className="text-2xl font-bold">
                                                {formatCurrency(colegioDetallado.resumen_financiero.recaudacion_actual_total || 0)}
                                            </p>
                                            <p className="text-sm opacity-90 mt-1">
                                                de {formatCurrency(colegioDetallado.resumen_financiero.recaudacion_esperada_total || 0)}
                                            </p>
                                        </div>
                                        
                                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
                                            <h4 className="text-lg font-semibold mb-2">📈 Porcentaje Venta</h4>
                                            <p className="text-2xl font-bold">
                                                {formatPorcentaje(colegioDetallado.resumen_financiero.porcentaje_venta_total)}
                                            </p>
                                            <p className="text-sm opacity-90 mt-1">
                                                {colegioDetallado.colegio?.total_boletos_vendidos || 0} boletos vendidos
                                            </p>
                                        </div>
                                        
                                        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                                            <h4 className="text-lg font-semibold mb-2">💸 Comisión Esperada</h4>
                                            <p className="text-2xl font-bold">
                                                {formatCurrency(colegioDetallado.resumen_financiero.comision_esperada_total || 0)}
                                            </p>
                                            <p className="text-sm opacity-90 mt-1">
                                                Sobre recaudación esperada
                                            </p>
                                        </div>
                                        
                                        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 rounded-xl text-white">
                                            <h4 className="text-lg font-semibold mb-2">💵 Comisión Actual</h4>
                                            <p className="text-2xl font-bold">
                                                {formatCurrency(colegioDetallado.resumen_financiero.comision_actual_total || 0)}
                                            </p>
                                            <p className="text-sm opacity-90 mt-1">
                                                Sobre venta actual
                                            </p>
                                        </div>
                                        
                                        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-xl text-white">
                                            <h4 className="text-lg font-semibold mb-2">🎯 Sorteos Activos</h4>
                                            <p className="text-2xl font-bold">
                                                {colegioDetallado.colegio?.sorteos_activos_count || 0}
                                            </p>
                                            <p className="text-sm opacity-90 mt-1">
                                                Total: {colegioDetallado.colegio?.total_sorteos || 0} sorteos
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-4xl mb-4">❌</div>
                                <p className="text-lg">No se pudo cargar el reporte detallado</p>
                                <p className="text-sm mt-2">Intente nuevamente</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}