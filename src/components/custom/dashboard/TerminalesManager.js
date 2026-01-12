'use client'
import { useState, useEffect, useRef } from 'react' // Agregar useRef
import { FiRefreshCw, FiSearch, FiPrinter, FiDownload, FiCreditCard, FiEye } from 'react-icons/fi'
import { MdComputer, MdColorLens, MdAttachMoney, MdCalendarToday, MdPerson, MdCheckCircle, MdCancel, MdInfo } from 'react-icons/md'
import { useRouter } from 'next/navigation'
import useSession from '@/hook/useSession'

const TerminalesManager = () => {
  const router = useRouter()
  const session = useSession()
  const [terminales, setTerminales] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    conTarjeta: 0,
    sinTarjeta: 0,
    asignados: 0,
    disponibles: 0,
    valorTotal: 0
  })

  // useRef para controlar bucles
  const hasLoaded = useRef(false)
  const authChecked = useRef(false)

  // Obtener colegioId de la sesión
  const getColegioIdFromSession = () => {
    // Depende de cómo tengas configurada la sesión
    // Opciones posibles:
    if (session.getUserData?.()?.colegioId) {
      return session.getUserData().colegioId
    }
    if (session.getColegioId?.()) {
      return session.getColegioId()
    }
    if (session.user?.colegioId) {
      return session.user.colegioId
    }
    return null
  }

  const colegioId = getColegioIdFromSession()

  // 1. Efecto para verificar autenticación
  useEffect(() => {
    if (authChecked.current) return
    
    if (!session.isLoggedIn()) {
      router.push('/loginAdmin')
      return
    }

    // Verificar que sea admin de colegio
    if (session.getUserType() !== 'admin_colegio') {
      router.push('/')
      return
    }

    // Verificar que tenga colegioId
    if (!colegioId) {
      console.error('Admin de colegio sin colegioId asignado')
      router.push('/')
      return
    }

    authChecked.current = true
  }, [session, router, colegioId])

  // 2. Efecto para cargar terminales
  useEffect(() => {
    if (authChecked.current && !hasLoaded.current) {
      fetchTerminales()
      hasLoaded.current = true
    }
  }, [authChecked.current])

  // Cargar terminales
  const fetchTerminales = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/terminales?colegioId=${colegioId}`)
      if (response.ok) {
        const data = await response.json()
        setTerminales(data)
        calcularStats(data)
      } else {
        console.error('Error al cargar terminales')
        setTerminales([])
      }
    } catch (error) {
      console.error('Error al cargar terminales:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas basadas en la estructura real
  const calcularStats = (data) => {
    const total = data.length
    const conTarjeta = data.filter(t => t.CobroTarjeta === 'SI').length
    const sinTarjeta = total - conTarjeta
    const asignados = data.filter(t => t.Asignado && t.Asignado.trim() !== '').length
    const disponibles = total - asignados
    const valorTotal = data.reduce((sum, t) => sum + (t.Costo || 0), 0)

    setStats({ total, conTarjeta, sinTarjeta, asignados, disponibles, valorTotal })
  }

  // Filtrar terminales por búsqueda
  const filteredTerminales = terminales.filter(terminal => {
    const searchLower = searchTerm.toLowerCase()
    return (
      terminal.NumeroSerie?.toLowerCase().includes(searchLower) ||
      terminal.Modelo?.toLowerCase().includes(searchLower) ||
      terminal.Color?.toLowerCase().includes(searchLower) ||
      terminal.Asignado?.toLowerCase().includes(searchLower) ||
      terminal.CobroTarjeta?.toLowerCase().includes(searchLower)
    )
  })

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
    if (!dateString) return 'No asignada';
    
    let date;
    
    if (dateString.includes('T')) {
        date = new Date(dateString);
    } else if (dateString.includes('-')) {
        const [year, month, day] = dateString.split(' ')[0].split('-');
        date = new Date(year, month - 1, day);
    } else {
        return dateString;
    }
    
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleDateString('es-ES');
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

  // Navegar a detalles del terminal (si tienes página de detalles)
  const handleViewDetails = (terminalId) => {
    // Si tienes página de detalles para admin_colegio
    // router.push(`/admin-colegio/terminales/${terminalId}`)
    
    // O mostrar modal con información detallada
    alert(`Ver detalles del terminal ID: ${terminalId}`)
  }

  // Mostrar información del colegio
  const getColegioInfo = () => {
    // Aquí podrías obtener información del colegio si la necesitas
    return session.getUserData?.()?.colegioNombre || 'Mi Colegio'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando terminales...</p>
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
              <MdComputer className="text-blue-600" />
              Terminales de {getColegioInfo()}
            </h1>
            <p className="text-gray-600">Visualización de dispositivos asignados al colegio</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <MdInfo className="text-blue-400" />
              <span>Modo de solo lectura - Contacta al super administrador para modificaciones</span>
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              ID Colegio: {colegioId}
            </span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
            <div className="text-sm text-blue-600">Total Terminales</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-800">{stats.conTarjeta}</div>
            <div className="flex items-center gap-1 text-sm text-green-600">
              <FiCreditCard /> Con Tarjeta
            </div>
          </div>
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-800">{stats.sinTarjeta}</div>
            <div className="text-sm text-red-600">Sin Tarjeta</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-800">{stats.asignados}</div>
            <div className="flex items-center gap-1 text-sm text-purple-600">
              <MdPerson /> Asignados
            </div>
          </div>
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-l-4 border-amber-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-amber-800">{stats.disponibles}</div>
            <div className="text-sm text-amber-600">Disponibles</div>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-emerald-500 p-4 rounded-lg">
            <div className="text-2xl font-bold text-emerald-800">
              {formatCurrency(stats.valorTotal)}
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-600">
              <MdAttachMoney /> Valor Total
            </div>
          </div>
        </div>

        {/* Barra de búsqueda y acciones */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por serie, modelo, color o asignado..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchTerminales}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <FiRefreshCw /> Actualizar
            </button>
            <button 
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              onClick={() => window.print()}
            >
              <FiPrinter /> Imprimir
            </button>
            <button 
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              onClick={() => {
                // Lógica para exportar a CSV
                const csvContent = [
                  ['N° Serie', 'Modelo', 'Color', 'Tarjeta', 'Asignado a', 'Fecha Entrega', 'Fecha Recoger', 'Costo'],
                  ...terminales.map(t => [
                    t.NumeroSerie,
                    t.Modelo || '',
                    t.Color || '',
                    t.CobroTarjeta === 'SI' ? 'Con Tarjeta' : 'Sin Tarjeta',
                    t.Asignado || '',
                    formatDate(t.FechaEntrega),
                    formatDate(t.FechaRecoger),
                    formatCurrency(t.Costo)
                  ])
                ].map(row => row.join(',')).join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `terminales-colegio-${colegioId}.csv`
                a.click()
              }}
            >
              <FiDownload /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Tabla de terminales - SOLO LECTURA */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Serie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Modelo / Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarjeta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asignado a
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Costo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTerminales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <MdComputer className="text-gray-300 text-4xl mb-3" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No hay terminales asignados</p>
                      <p className="text-gray-600 max-w-md">
                        No se han asignado terminales a este colegio. 
                        Contacta al super administrador para solicitar asignación de equipos.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTerminales.map((terminal) => (
                  <tr key={terminal.Id_terminal} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-blue-600">
                        {terminal.NumeroSerie}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">{terminal.Modelo || 'No especificado'}</div>
                        {terminal.Color && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MdColorLens className="text-gray-400" />
                            <span>{terminal.Color}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {terminal.CobroTarjeta === 'SI' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                          <MdCheckCircle className="text-green-500" />
                          Con Tarjeta
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                          <MdCancel className="text-red-500" />
                          Sin Tarjeta
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {terminal.Asignado ? (
                        <div className="flex items-center gap-2">
                          <MdPerson className="text-gray-400" />
                          <span>{terminal.Asignado}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No asignado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-1">
                          <MdCalendarToday className="text-gray-400 text-xs" />
                          <span className="text-gray-600">Entrega:</span>
                          <span className="font-medium">{formatDate(terminal.FechaEntrega)}</span>
                        </div>
                        {terminal.FechaRecoger && (
                          <div className="flex items-center gap-1">
                            <MdCalendarToday className="text-gray-400 text-xs" />
                            <span className="text-gray-600">Recoger:</span>
                            <span className="font-medium">{formatDate(terminal.FechaRecoger)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(terminal.Costo)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <MdInfo className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Este panel es de solo lectura para administradores de colegio</li>
                <li>Para modificar, crear o eliminar terminales contacta al super administrador</li>
                <li>Los datos se actualizan automáticamente cada vez que accedes</li>
                <li>Puedes exportar la información en formato CSV para reportes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TerminalesManager