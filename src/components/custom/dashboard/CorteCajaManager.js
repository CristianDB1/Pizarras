'use client'
import { useState, useEffect } from 'react'
import { FiSearch, FiFilter, FiDollarSign, FiCheckCircle, FiClock, FiDownload, FiRefreshCw, FiCalendar, FiTag } from 'react-icons/fi'
import { MdAttachMoney, MdPerson, MdPercent, MdReceipt, MdNumbers } from 'react-icons/md'
import Swal from 'sweetalert2'

const CorteCajaManager = ({ colegioId }) => {
  const [vendedores, setVendedores] = useState([])
  const [sorteos, setSorteos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('pendientes')
  const [sorteoSeleccionado, setSorteoSeleccionado] = useState('todos')
  const [montoEntregado, setMontoEntregado] = useState({})
  const [liquidando, setLiquidando] = useState(null)
  
  const [estadisticas, setEstadisticas] = useState({
    totalVendedores: 0,
    pendientes: 0,
    liquidados: 0,
    ventaTotal: 0,
    comisionTotal: 0,
    entregarTotal: 0,
    boletosPendientes: 0
  })

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Mostrar alertas (las mismas funciones que ya tenías)
  const showError = (title, text) => {
    Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Aceptar'
    })
  }

  const showSuccess = (title, text) => {
    Swal.fire({
      icon: 'success',
      title: title,
      text: text,
      confirmButtonColor: '#059669',
      confirmButtonText: 'Aceptar',
      timer: 3000,
      timerProgressBar: true
    })
  }

  const showConfirm = (title, text, confirmText = 'Sí, liquidar') => {
    return Swal.fire({
      title: title,
      text: text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#dc2626',
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    })
  }

  // Cargar sorteos
  const fetchSorteos = async () => {
    try {
      const response = await fetch(`/api/sorteos?colegioId=${colegioId}`)
      if (response.ok) {
        const data = await response.json()
        setSorteos(data)
      }
    } catch (error) {
      console.error('Error al cargar sorteos:', error)
    }
  }

  // Cargar vendedores con cortes calculados
  const fetchVendedoresConCorte = async () => {
    try {
      setLoading(true)
      
      const url = `/api/corte-caja/vendedores?colegioId=${colegioId}${
        sorteoSeleccionado && sorteoSeleccionado !== 'todos' 
          ? `&sorteoId=${sorteoSeleccionado}` 
          : ''
      }`
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setVendedores(data)
        calcularEstadisticas(data)
      } else {
        console.error('Error al cargar vendedores')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas
  const calcularEstadisticas = (data) => {
    const vendedoresPendientes = data.filter(v => v.estado === 'pendiente' && v.tieneBoletosPendientes)
    const vendedoresLiquidados = data.filter(v => v.estado === 'liquidado')
    
    const totalVendedores = [...new Set(data.map(v => v.id_vendedor))].length
    const pendientes = [...new Set(vendedoresPendientes.map(v => v.id_vendedor))].length
    const liquidados = [...new Set(vendedoresLiquidados.map(v => v.id_vendedor))].length
    const ventaTotal = vendedoresPendientes.reduce((sum, v) => sum + v.ventaTotal, 0)
    const comisionTotal = vendedoresPendientes.reduce((sum, v) => sum + v.comisionGanada, 0)
    const entregarTotal = vendedoresPendientes.reduce((sum, v) => sum + v.totalEntregar, 0)
    const boletosPendientes = vendedoresPendientes.reduce((sum, v) => sum + v.boletosVendidos, 0)

    setEstadisticas({
      totalVendedores,
      pendientes,
      liquidados,
      ventaTotal,
      comisionTotal,
      entregarTotal,
      boletosPendientes
    })
  }

  // Cargar datos iniciales
  useEffect(() => {
    if (colegioId) {
      fetchSorteos()
      fetchVendedoresConCorte()
    }
  }, [colegioId])

  // Recargar cuando cambie el sorteo
  useEffect(() => {
    if (colegioId) {
      fetchVendedoresConCorte()
    }
  }, [sorteoSeleccionado])

  // Filtrar vendedores
  const vendedoresFiltrados = vendedores.filter(vendedor => {
    const coincideBusqueda = 
      vendedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendedor.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vendedor.nombre_sorteo && vendedor.nombre_sorteo.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const coincideEstado = 
      filtroEstado === 'todos' || 
      (filtroEstado === 'pendientes' && vendedor.estado === 'pendiente' && vendedor.tieneBoletosPendientes) ||
      (filtroEstado === 'liquidados' && vendedor.estado === 'liquidado')
    
    return coincideBusqueda && coincideEstado
  })

  // Manejar cambio en monto a entregar
  const handleMontoChange = (idVendedor, idSorteo, monto) => {
    const key = `${idVendedor}_${idSorteo}`
    setMontoEntregado(prev => ({
      ...prev,
      [key]: parseFloat(monto) || 0
    }))
  }

  // Manejar liquidación
  const handleLiquidar = async (vendedor) => {
    const key = `${vendedor.id_vendedor}_${vendedor.id_sorteo}`
    const monto = montoEntregado[key] || vendedor.totalEntregar
    
    if (!monto || monto <= 0) {
      showError('Monto inválido', 'Ingrese un monto válido para la liquidación')
      return
    }
    
    const sorteoInfo = vendedor.nombre_sorteo 
      ? `para el sorteo "${vendedor.nombre_sorteo}"`
      : ''
    
    const result = await showConfirm(
      'Confirmar Liquidación',
      `¿Está seguro de liquidar a ${vendedor.nombre} ${sorteoInfo} por ${formatCurrency(monto)}?`,
      `Sí, liquidar por ${formatCurrency(monto)}`
    )
    
    if (result.isConfirmed) {
      setLiquidando(key)
      
      Swal.fire({
        title: 'Procesando liquidación...',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading()
        }
      })
      
      try {
        const response = await fetch('/api/corte-caja/liquidar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id_vendedor: vendedor.id_vendedor,
            nombre_vendedor: vendedor.nombre,
            boletos_vendidos: vendedor.boletosVendidos,
            venta: vendedor.ventaTotal,
            porcentaje_comision: vendedor.comision,
            comision: vendedor.comisionGanada,
            total_caja: vendedor.ventaTotal,
            total_entregado: monto,
            id_sorteo: vendedor.id_sorteo,  // ¡IMPORTANTE! Enviar el id_sorteo
            colegio_id: colegioId
          })
        })
        
        Swal.close()
        
        if (response.ok) {
          const result = await response.json()
          
          showSuccess(
            '¡Liquidación Exitosa!',
            `Se liquidó a ${vendedor.nombre} ${sorteoInfo}\nMonto: ${formatCurrency(monto)}\nBoletos actualizados: ${result.boletos_actualizados}`
          )
          
          // Recargar datos
          fetchVendedoresConCorte()
          setMontoEntregado(prev => {
            const nuevo = { ...prev }
            delete nuevo[key]
            return nuevo
          })
        } else {
          const error = await response.json()
          showError('Error en la liquidación', error.error || 'Ocurrió un error al procesar')
        }
      } catch (error) {
        console.error('Error al liquidar:', error)
        showError('Error de conexión', 'No se pudo conectar con el servidor')
      } finally {
        setLiquidando(null)
      }
    }
  }

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
  }

  // Obtener color para el estado del sorteo
  const getSorteoColor = (fechaSorteo) => {
    if (!fechaSorteo) return 'gray';
    
    const hoy = new Date();
    const fechaSorteoDate = new Date(fechaSorteo);
    const diffTime = fechaSorteoDate - hoy;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'red';    // Pasado
    if (diffDays <= 7) return 'amber'; // Próximo (esta semana)
    return 'green';                    // Futuro
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Calculando cortes de caja...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MdAttachMoney className="text-green-600" />
              Corte de Caja
            </h1>
            <p className="text-gray-600">Control de ingresos y egresos por sorteo</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <button
              onClick={fetchVendedoresConCorte}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:opacity-90 flex items-center gap-2"
            >
              <FiRefreshCw /> Actualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FiCalendar /> Sorteo
              </label>
              <select
                value={sorteoSeleccionado}
                onChange={(e) => setSorteoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="todos">Todos los sorteos</option>
                {sorteos.map(sorteo => (
                  <option key={sorteo.id_sorteo} value={sorteo.id_sorteo}>
                    {sorteo.nombre || `Sorteo ${sorteo.id_sorteo}`} ({formatDate(sorteo.fecha)})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FiFilter /> Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="pendientes">Pendientes de liquidar</option>
                <option value="liquidados">Ya liquidados</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <FiSearch /> Buscar
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Vendedor, usuario o sorteo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-800">
              {formatCurrency(estadisticas.ventaTotal)}
            </div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <FiDollarSign /> Venta Total Pendiente
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">
              {formatCurrency(estadisticas.comisionTotal)}
            </div>
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <MdPercent /> Comisión Total
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-800">
              {formatCurrency(estadisticas.entregarTotal)}
            </div>
            <div className="flex items-center gap-1 text-sm text-purple-600">
              <MdReceipt /> Total a Entregar
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-amber-800">
              {estadisticas.boletosPendientes}
            </div>
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <MdNumbers /> Boletos Pendientes
            </div>
          </div>
        </div>

        {/* Tabla de Cortes */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendedor / Sorteo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Boletos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventas / Comisión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total a Entregar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto a Liquidar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vendedoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {vendedores.length === 0 
                      ? 'No hay vendedores activos' 
                      : 'No hay vendedores pendientes de liquidar con los filtros aplicados'}
                  </td>
                </tr>
              ) : (
                vendedoresFiltrados.map((vendedor) => {
                  const key = `${vendedor.id_vendedor}_${vendedor.id_sorteo}`
                  const sorteoColor = getSorteoColor(vendedor.fecha_sorteo)
                  
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                            {vendedor.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">{vendedor.nombre}</div>
                            <div className="text-sm text-gray-500">@{vendedor.usuario}</div>
                            <div className="text-xs text-gray-400">Comisión: {vendedor.comision}%</div>
                            
                            {vendedor.nombre_sorteo && (
                              <div className="mt-2">
                                <div className="flex items-center gap-1">
                                  <FiTag className={`text-${sorteoColor}-500 text-xs`} />
                                  <span className="text-xs font-medium text-gray-700">
                                    {vendedor.nombre_sorteo}
                                  </span>
                                </div>
                                {vendedor.fecha_sorteo && (
                                  <div className="text-xs text-gray-500">
                                    Fecha: {formatDate(vendedor.fecha_sorteo)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${vendedor.boletosVendidos > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                            {vendedor.boletosVendidos || 0}
                          </div>
                          <div className="text-xs text-gray-500">boletos pendientes</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-green-700">
                            {formatCurrency(vendedor.ventaTotal || 0)}
                          </div>
                          <div className="text-sm text-blue-600">
                            Comisión: {formatCurrency(vendedor.comisionGanada || 0)}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="font-bold text-lg text-purple-700">
                          {formatCurrency(vendedor.totalEntregar || 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          (Venta - Comisión)
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        {vendedor.estado === 'liquidado' ? (
                          <div className="flex flex-col gap-1">
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                              <FiCheckCircle className="text-green-500" />
                              Liquidado
                            </span>
                            {vendedor.fechaLiquidacion && (
                              <div className="text-xs text-green-600">
                                {formatDate(vendedor.fechaLiquidacion)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                            vendedor.boletosVendidos > 0 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            <FiClock className={vendedor.boletosVendidos > 0 ? "text-amber-500" : "text-gray-500"} />
                            {vendedor.boletosVendidos > 0 ? 'Pendiente' : 'Sin boletos'}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        {vendedor.estado === 'pendiente' && vendedor.boletosVendidos > 0 ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={montoEntregado[key] !== undefined 
                                ? montoEntregado[key] 
                                : vendedor.totalEntregar}
                              onChange={(e) => handleMontoChange(vendedor.id_vendedor, vendedor.id_sorteo, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                              placeholder="Monto a liquidar"
                            />
                            <div className="text-xs text-gray-500 text-center">
                              Sugerido: {formatCurrency(vendedor.totalEntregar)}
                            </div>
                          </div>
                        ) : (
                          vendedor.total_entregado ? (
                            <div className="text-center">
                              <div className="font-medium text-gray-900">
                                {formatCurrency(vendedor.total_entregado)}
                              </div>
                              <div className="text-xs text-gray-500">liquidado</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm italic">N/A</span>
                          )
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        {vendedor.estado === 'pendiente' && vendedor.boletosVendidos > 0 ? (
                          <button
                            onClick={() => handleLiquidar(vendedor)}
                            disabled={liquidando === key}
                            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm w-full justify-center ${
                              liquidando === key
                                ? 'bg-gray-300 text-gray-500 cursor-wait'
                                : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:opacity-90'
                            }`}
                          >
                            {liquidando === key ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                Procesando...
                              </>
                            ) : (
                              <>
                                <FiCheckCircle /> LIQUIDAR
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="text-center">
                            <span className="text-gray-400 text-sm italic">
                              {vendedor.estado === 'liquidado' ? 'Ya liquidado' : 'Sin boletos'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CorteCajaManager