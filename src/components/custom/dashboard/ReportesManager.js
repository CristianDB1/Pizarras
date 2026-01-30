'use client'

import { useState, useEffect } from 'react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { CSVLink } from 'react-csv'
import dynamic from 'next/dynamic'

// Función para formatear números al formato mexicano
const formatoMexicano = (numero, decimales = 2) => {
    if (numero === null || numero === undefined) return '$0.00'
    
    const numeroFloat = typeof numero === 'string' ? parseFloat(numero) : numero
    
    if (isNaN(numeroFloat)) return '$0.00'
    
    // Formatear con separadores mexicanos
    return numeroFloat.toLocaleString('es-MX', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    })
}

// Función para formatear como moneda mexicana
const formatoMonedaMexicana = (numero, decimales = 2) => {
    return `$${formatoMexicano(numero, decimales)}`
}

// Importar jsPDF dinámicamente para evitar problemas con SSR
const ReportesManager = ({ colegioId }) => {
    const [loading, setLoading] = useState(false)
    const [activeReport, setActiveReport] = useState('ventas')
    
    // Estados para filtros
    const [fechaInicio, setFechaInicio] = useState(() => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date
    })
    const [fechaFin, setFechaFin] = useState(new Date())
    const [vendedorId, setVendedorId] = useState('')
    const [sorteoId, setSorteoId] = useState('')
    
    // Estados para datos
    const [vendedores, setVendedores] = useState([])
    const [sorteos, setSorteos] = useState([])
    const [reporteVentas, setReporteVentas] = useState([])
    const [reporteCortes, setReporteCortes] = useState([])
    const [vendedoresPorPagar, setVendedoresPorPagar] = useState([])
    const [resumen, setResumen] = useState({
        totalVentas: 0,
        totalPagado: 0,
        totalPorPagar: 0,
        deudaPendiente: 0,
        vendedoresPorPagar: 0,
        totalRegistros: 0
    })
    const [colegio, setColegio] = useState(null)

    // Cargar datos iniciales
    useEffect(() => {
        if (colegioId) {
            cargarVendedores()
            cargarSorteos()
            cargarColegio()
        }
    }, [colegioId])

    const cargarColegio = async () => {
        try {
            const res = await fetch(`/api/colegios/${colegioId}`)
            if (res.ok) {
                const data = await res.json()
                setColegio(data)
            }
        } catch (error) {
            console.error('Error cargando colegio:', error)
        }
    }

    const getImageBase64 = (url) =>
    new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = reject
        img.src = url
    })

    
    const cargarVendedores = async () => {
        try {
            const response = await fetch(`/api/vendedores?colegioId=${colegioId}`)
            if (response.ok) {
                const data = await response.json()
                setVendedores(data)
            } else {
                // Fallback
                const fallbackResponse = await fetch(`/api/vendedores/colegio/${colegioId}`)
                if (fallbackResponse.ok) {
                    const data = await fallbackResponse.json()
                    setVendedores(data)
                }
            }
        } catch (error) {
            console.error('Error cargando vendedores:', error)
        }
    }
    
    const cargarSorteos = async () => {
        try {
            const response = await fetch(`/api/sorteos?colegioId=${colegioId}`)
            if (response.ok) {
                const data = await response.json()
                setSorteos(data)
            }
        } catch (error) {
            console.error('Error cargando sorteos:', error)
        }
    }
    
    const generarReporteVentas = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                colegioId,
                fechaInicio: fechaInicio.toISOString(),
                fechaFin: fechaFin.toISOString(),
                ...(vendedorId && { vendedorId }),
                ...(sorteoId && { sorteoId })
            })
            
            const response = await fetch(`/api/reportes/ventas?${params}`)
            if (response.ok) {
                const data = await response.json()
                setReporteVentas(data.ventas || [])
                
                if (data.resumen) {
                    setResumen(data.resumen)
                }
            } else {
                console.error('Error en la respuesta del servidor')
            }
            
        } catch (error) {
            console.error('Error generando reporte:', error)
            alert('Error al generar el reporte')
        } finally {
            setLoading(false)
        }
    }
    
    const generarReporteCortes = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                colegioId,
                fechaInicio: fechaInicio.toISOString(),
                fechaFin: fechaFin.toISOString(),
                ...(vendedorId && { vendedorId })
            })
            
            const response = await fetch(`/api/reportes/cortes?${params}`)
            if (response.ok) {
                const data = await response.json()
                setReporteCortes(data.cortes || [])
                setVendedoresPorPagar(data.vendedoresPorPagar || [])
                
                if (data.resumen) {
                    setResumen({
                        totalVentas: data.resumen.totalVenta,
                        totalPagado: data.resumen.totalEntregado,
                        totalPorPagar: data.resumen.totalPendiente,
                        deudaPendiente: data.resumen.totalDeuda,
                        vendedoresPorPagar: data.resumen.vendedoresPorPagar,
                        totalRegistros: data.resumen.totalCortes
                    })
                }
            } else {
                console.error('Error en la respuesta del servidor')
            }
            
        } catch (error) {
            console.error('Error generando reporte de cortes:', error)
            alert('Error al generar el reporte de cortes')
        } finally {
            setLoading(false)
        }
    }
    
    const prepararDatosCSV = () => {
        if (activeReport === 'ventas') {
            // Calcular totales
            const totalVentas = reporteVentas.reduce((sum, venta) => sum + parseFloat(venta.monto), 0)
            const totalPagado = reporteVentas
                .filter(v => v.estado === 'pagado')
                .reduce((sum, venta) => sum + parseFloat(venta.monto), 0)
            const totalPendiente = reporteVentas
                .filter(v => v.estado !== 'pagado')
                .reduce((sum, venta) => sum + parseFloat(venta.monto), 0)
            
            // Crear array de datos con formato mexicano
            const csvData = reporteVentas.map(venta => ({
                'ID Boleto': venta.id,
                'Fecha': venta.fecha,
                'Vendedor': venta.vendedor_nombre,
                'Sorteo': venta.sorteo_nombre,
                'Número': venta.numero,
                'Comprador': venta.comprador || 'Sin nombre',
                'Monto': formatoMonedaMexicana(venta.monto, 2),
                'Estado': venta.estado
            }))
            
            // Agregar filas de totales al final
            csvData.push({}) // Fila vacía para separación
            csvData.push({
                'ID Boleto': '',
                'Fecha': '',
                'Vendedor': '',
                'Sorteo': '',
                'Número': '',
                'Comprador': 'TOTAL VENTAS:',
                'Monto': formatoMonedaMexicana(totalVentas, 2),
                'Estado': ''
            })
            csvData.push({
                'ID Boleto': '',
                'Fecha': '',
                'Vendedor': '',
                'Sorteo': '',
                'Número': '',
                'Comprador': 'TOTAL PAGADO:',
                'Monto': formatoMonedaMexicana(totalPagado, 2),
                'Estado': 'Pagado'
            })
            csvData.push({
                'ID Boleto': '',
                'Fecha': '',
                'Vendedor': '',
                'Sorteo': '',
                'Número': '',
                'Comprador': 'TOTAL PENDIENTE:',
                'Monto': formatoMonedaMexicana(totalPendiente, 2),
                'Estado': 'Pendiente'
            })
            
            return csvData
        } else {
            // Para reporte de cortes, calcular totales similares
            const totalVenta = reporteCortes.reduce((sum, corte) => sum + parseFloat(corte.venta_total), 0)
            const totalEntregado = reporteCortes.reduce((sum, corte) => sum + parseFloat(corte.total_entregado), 0)
            const totalPendiente = reporteCortes.reduce((sum, corte) => sum + parseFloat(corte.saldo_pendiente), 0)
            const totalDeuda = reporteCortes.reduce((sum, corte) => sum + parseFloat(corte.deuda_vendedor), 0)
            
            const csvData = reporteCortes.map(corte => ({
                'ID Corte': corte.id_corte,
                'Fecha': corte.fecha,
                'Vendedor': corte.vendedor_nombre,
                'Sorteo': corte.sorteo_nombre,
                'Boletos Vendidos': corte.boletos_vendidos,
                'Venta Total': formatoMonedaMexicana(corte.venta_total, 2),
                'Comisión %': `${corte.porcentaje_comision}%`,
                'Total Entregado': formatoMonedaMexicana(corte.total_entregado, 2),
                'Saldo Pendiente': formatoMonedaMexicana(corte.saldo_pendiente, 2),
                'Deuda Vendedor': formatoMonedaMexicana(corte.deuda_vendedor, 2),
                'Estado': corte.estado
            }))
            
            // Agregar filas de totales al final
            csvData.push({}) // Fila vacía para separación
            csvData.push({
                'ID Corte': '',
                'Fecha': '',
                'Vendedor': '',
                'Sorteo': '',
                'Boletos Vendidos': '',
                'Venta Total': formatoMonedaMexicana(totalVenta, 2),
                'Comisión %': 'TOTALES:',
                'Total Entregado': formatoMonedaMexicana(totalEntregado, 2),
                'Saldo Pendiente': formatoMonedaMexicana(totalPendiente, 2),
                'Deuda Vendedor': formatoMonedaMexicana(totalDeuda, 2),
                'Estado': ''
            })
            
            return csvData
        }
    }
    
    const exportarPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf')
            const autoTable = (await import('jspdf-autotable')).default

            const doc = new jsPDF()

            // Configuración inicial
            doc.setFontSize(16)
            doc.text('Reporte de Ventas', 14, 15)

            doc.setFontSize(10)
            doc.text(`Colegio: ${colegio?.nombre || '—'}`, 14, 25)
            doc.text(
                `Período: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`,
                14,
                30
            )

            // Logo del colegio
            if (colegio?.logo_url) {
                const logoBase64 = await getImageBase64(colegio.logo_url)
                doc.addImage(logoBase64, 'PNG', 150, 10, 40, 20)
            }

            // Preparar datos de la tabla con formato mexicano
            const tableData = reporteVentas.map(v => [
                v.fecha,
                v.vendedor_nombre,
                v.sorteo_nombre,
                v.numero,
                v.comprador || 'Sin nombre',
                formatoMonedaMexicana(v.monto, 2),
                v.estado
            ])

            // Calcular totales
            const totalVentas = reporteVentas.reduce((sum, venta) => sum + parseFloat(venta.monto), 0)
            const totalPagado = reporteVentas
                .filter(v => v.estado === 'pagado')
                .reduce((sum, venta) => sum + parseFloat(venta.monto), 0)
            const totalPendiente = reporteVentas
                .filter(v => v.estado !== 'pagado')
                .reduce((sum, venta) => sum + parseFloat(venta.monto), 0)

            // Generar la tabla
            autoTable(doc, {
                startY: 40,
                head: [['Fecha', 'Vendedor', 'Sorteo', 'Número', 'Comprador', 'Monto', 'Estado']],
                body: tableData,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [220, 53, 69] },
                foot: [
                    [
                        '',
                        '',
                        '',
                        '',
                        'TOTAL VENTAS:',
                        formatoMonedaMexicana(totalVentas, 2),
                        ''
                    ],
                    [
                        '',
                        '',
                        '',
                        '',
                        'TOTAL PAGADO:',
                        formatoMonedaMexicana(totalPagado, 2),
                        ''
                    ],
                    [
                        '',
                        '',
                        '',
                        '',
                        'TOTAL PENDIENTE:',
                        formatoMonedaMexicana(totalPendiente, 2),
                        ''
                    ]
                ],
                footStyles: { 
                    fillColor: [240, 240, 240],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    fontSize: 9
                }
            })

            // Agregar resumen adicional debajo de la tabla
            const finalY = doc.lastAutoTable.finalY + 10
            
            doc.setFontSize(10)
            doc.setFont(undefined, 'bold')
            doc.text('Resumen Financiero:', 14, finalY)
            
            doc.setFont(undefined, 'normal')
            doc.text(`Total de ventas generadas: ${reporteVentas.length} boletos`, 14, finalY + 8)
            doc.text(`Monto total en ventas: ${formatoMonedaMexicana(totalVentas, 2)}`, 14, finalY + 16)
            doc.text(`Porcentaje pagado: ${totalVentas > 0 ? ((totalPagado / totalVentas) * 100).toFixed(2) : '0'}%`, 14, finalY + 24)
            doc.text(`Porcentaje pendiente: ${totalVentas > 0 ? ((totalPendiente / totalVentas) * 100).toFixed(2) : '0'}%`, 14, finalY + 32)

            // Fecha de generación
            doc.setFontSize(8)
            doc.text(`Reporte generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 280)

            // Guardar PDF
            doc.save(`reporte_ventas_${colegioId}_${new Date().toISOString().split('T')[0]}.pdf`)
        } catch (error) {
            console.error('Error al exportar PDF:', error)
            alert('Error al generar el PDF')
        }
    }

    const renderReporteVentas = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-700 font-medium">Total Ventas</div>
                    <div className="text-2xl font-bold text-blue-900">{formatoMonedaMexicana(resumen.totalVentas)}</div>
                    <div className="text-xs text-blue-600 mt-1">{resumen.totalRegistros} boletos</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-700 font-medium">Total Pagado</div>
                    <div className="text-2xl font-bold text-green-900">{formatoMonedaMexicana(resumen.totalPagado)}</div>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                    <div className="text-sm text-yellow-700 font-medium">Por Pagar</div>
                    <div className="text-2xl font-bold text-yellow-900">{formatoMonedaMexicana(resumen.totalPorPagar)}</div>
                </div>
            </div>
            
            {reporteVentas.length > 0 ? (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sorteo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comprador</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reporteVentas.map((venta) => (
                                    <tr key={venta.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venta.fecha}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venta.vendedor_nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venta.sorteo_nombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{venta.numero}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venta.comprador || 'Sin nombre'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatoMonedaMexicana(venta.monto)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                venta.estado === 'pagado' 
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {venta.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {reporteVentas.length > 0 && (
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 mt-6">
                                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                                    📊 Resumen Financiero
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg p-4 shadow border border-blue-200">
                                        <div className="text-sm text-blue-700 font-medium">Total Dinero Pagado</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {formatoMonedaMexicana(resumen.totalPagado)}
                                        </div>
                                        <div className="text-xs text-blue-600 mt-1">
                                            {resumen.totalVentas > 0 ? 
                                                ((resumen.totalPagado / resumen.totalVentas) * 100).toFixed(2) : 0}% del total
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 shadow border border-yellow-200">
                                        <div className="text-sm text-yellow-700 font-medium">Total Dinero Pendiente</div>
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {formatoMonedaMexicana(resumen.totalPorPagar)}
                                        </div>
                                        <div className="text-xs text-yellow-600 mt-1">
                                            {resumen.totalVentas > 0 ? 
                                                ((resumen.totalPorPagar / resumen.totalVentas) * 100).toFixed(2) : 0}% del total
                                        </div>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
                                        <div className="text-sm text-gray-700 font-medium">Resumen General</div>
                                        <div className="space-y-2 mt-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Total Ventas:</span>
                                                <span className="font-medium">{formatoMonedaMexicana(resumen.totalVentas)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Total Boletos:</span>
                                                <span className="font-medium">{resumen.totalRegistros}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Promedio por boleto:</span>
                                                <span className="font-medium">
                                                    {resumen.totalRegistros > 0 ? 
                                                        formatoMonedaMexicana(resumen.totalVentas / resumen.totalRegistros) : '$0.00'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                    </div>
                    <p className="text-gray-500">No hay datos de ventas para el período seleccionado</p>
                    <p className="text-sm text-gray-400 mt-2">Aplica filtros diferentes o genera el reporte</p>
                </div>
            )}
        </div>
    )
    
    const renderReporteCortes = () => (
        <div className="space-y-6">
            {reporteCortes.length > 0 ? (
                <>
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sorteo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boletos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venta Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entregado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deuda</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {reporteCortes.map((corte) => (
                                        <tr key={corte.id_corte} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{corte.fecha}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{corte.vendedor_nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{corte.sorteo_nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{corte.boletos_vendidos}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatoMonedaMexicana(corte.venta_total)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                {formatoMonedaMexicana(corte.total_entregado)}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                                corte.saldo_pendiente > 0 ? 'text-red-600' : 'text-gray-900'
                                            }`}>
                                                {formatoMonedaMexicana(corte.saldo_pendiente)}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                                                corte.deuda_vendedor > 0 ? 'text-orange-600' : 'text-gray-900'
                                            }`}>
                                                {formatoMonedaMexicana(corte.deuda_vendedor)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    corte.estado === 'completado' 
                                                        ? 'bg-green-100 text-green-800'
                                                        : corte.estado === 'parcial'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {corte.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* Vendedores por pagar */}
                    {vendedoresPorPagar.length > 0 && (
                        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                📋 Vendedores con Saldo Pendiente
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {vendedoresPorPagar.map((vendedor, index) => (
                                    <div key={index} className="bg-white rounded-lg p-4 shadow border border-red-200">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-900">{vendedor.nombre}</p>
                                                <p className="text-sm text-gray-600">ID: {vendedor.id_vendedor}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-red-600">{formatoMonedaMexicana(vendedor.total_adeudo)}</p>
                                                <div className="flex text-xs text-gray-500 gap-2">
                                                    <span>Saldo: {formatoMonedaMexicana(vendedor.saldo_pendiente)}</span>
                                                    <span>•</span>
                                                    <span>Deuda: {formatoMonedaMexicana(vendedor.deuda_vendedor)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                    <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-500">No hay datos de cortes de caja para el período seleccionado</p>
                    <p className="text-sm text-gray-400 mt-2">Aplica filtros diferentes o genera el reporte</p>
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">📊 Reportes y Estadísticas</h1>
                <p className="text-gray-600">Genera reportes detallados de ventas y cortes de caja</p>
            </div>
            
            {/* Selector de reportes */}
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex space-x-4 mb-6">
                    <button
                        onClick={() => setActiveReport('ventas')}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                            activeReport === 'ventas'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        Reporte de Ventas
                    </button>
                </div>
                
                {/* Filtros */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        🔍 Filtros del Reporte
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Inicio
                            </label>
                            <DatePicker
                                selected={fechaInicio}
                                onChange={setFechaInicio}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                dateFormat="dd/MM/yyyy"
                                maxDate={fechaFin}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha Fin
                            </label>
                            <DatePicker
                                selected={fechaFin}
                                onChange={setFechaFin}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                dateFormat="dd/MM/yyyy"
                                minDate={fechaInicio}
                                maxDate={new Date()}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vendedor
                            </label>
                            <select
                                value={vendedorId}
                                onChange={(e) => setVendedorId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            >
                                <option value="">Todos los vendedores</option>
                                {vendedores.map(v => (
                                    <option key={v.id_vendedor} value={v.id_vendedor}>{v.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sorteo
                            </label>
                            <select
                                value={sorteoId}
                                onChange={(e) => setSorteoId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                disabled={activeReport === 'cortes'}
                            >
                                <option value="">Todos los sorteos</option>
                                {sorteos.map(s => (
                                    <option key={s.id_sorteo} value={s.id_sorteo}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end space-x-4">
                        <button
                            onClick={activeReport === 'ventas' ? generarReporteVentas : generarReporteCortes}
                            disabled={loading}
                            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Generar Reporte
                                </>
                            )}
                        </button>
                        
                        {((activeReport === 'ventas' && reporteVentas.length > 0) || 
                          (activeReport === 'cortes' && reporteCortes.length > 0)) && (
                            <div className="flex space-x-4">
                                <CSVLink
                                    data={prepararDatosCSV()}
                                    filename={`reporte_${activeReport}_${colegioId}_${new Date().toISOString().split('T')[0]}.csv`}
                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Exportar Excel
                                </CSVLink>
                                
                                <button
                                    onClick={exportarPDF}
                                    className="px-6 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Exportar PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Contenido del reporte */}
                {activeReport === 'ventas' ? renderReporteVentas() : renderReporteCortes()}
            </div>
        </div>
    )
}

export default ReportesManager