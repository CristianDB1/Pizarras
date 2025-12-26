'use client'
import { useState, useEffect } from 'react'
import { FiRefreshCw, FiEdit, FiTrash2, FiPlus, FiSearch, FiPrinter, FiDownload, FiCreditCard } from 'react-icons/fi'
import { MdComputer, MdColorLens, MdAttachMoney, MdCalendarToday, MdPerson, MdCheckCircle, MdCancel } from 'react-icons/md'

const TerminalesManager = ({ colegioId }) => {
  const [terminales, setTerminales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTerminal, setEditingTerminal] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    conTarjeta: 0,
    sinTarjeta: 0,
    asignados: 0,
    disponibles: 0,
    valorTotal: 0
  })

  const [formData, setFormData] = useState({
    NumeroSerie: '',
    Modelo: '',
    Color: '',
    CobroTarjeta: 'NO',
    Colegio: '',
    Asignado: '',
    FechaEntrega: '',
    FechaRecoger: '',
    Costo: '',
    ColegioID: colegioId
  })

  // Estados para feedback
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [message, setMessage] = useState('')

  // Cargar terminales
  const fetchTerminales = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/terminales?colegioId=${colegioId}`)
      if (response.ok) {
        const data = await response.json()
        setTerminales(data)
        calcularStats(data)
      }
    } catch (error) {
      console.error('Error al cargar terminales:', error)
      showMessage('Error al cargar terminales', 'error')
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

  useEffect(() => {
    if (colegioId) {
      fetchTerminales()
    }
  }, [colegioId])

  // Mostrar mensajes de feedback
  const showMessage = (text, type = 'success') => {
    setMessage(text)
    if (type === 'success') {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } else {
      setShowError(true)
      setTimeout(() => setShowError(false), 3000)
    }
  }

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Formatear fecha para input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    // Si la fecha ya viene en formato YYYY-MM-DD de MySQL
    if (dateString.includes('T')) {
        // Formato ISO: "2024-01-15T05:00:00.000Z"
        return dateString.split('T')[0];
    } else if (dateString.includes('-')) {
        // Formato MySQL: "2024-01-15"
        return dateString.split(' ')[0]; // Por si viene con hora: "2024-01-15 00:00:00"
    }
    
    // Si es un timestamp de JavaScript
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toISOString().split('T')[0];
    };

  // Abrir modal para crear/editar
  const handleOpenModal = (terminal = null) => {
    if (terminal) {
      setEditingTerminal(terminal)
      setFormData({
        NumeroSerie: terminal.NumeroSerie || '',
        Modelo: terminal.Modelo || '',
        Color: terminal.Color || '',
        CobroTarjeta: terminal.CobroTarjeta || 'NO',
        Colegio: terminal.Colegio || '',
        Asignado: terminal.Asignado || '',
        FechaEntrega: formatDateForInput(terminal.FechaEntrega),
        FechaRecoger: formatDateForInput(terminal.FechaRecoger),
        Costo: terminal.Costo || '',
        ColegioID: colegioId
      })
    } else {
      setEditingTerminal(null)
      setFormData({
        NumeroSerie: '',
        Modelo: '',
        Color: '',
        CobroTarjeta: 'NO',
        Colegio: '',
        Asignado: '',
        FechaEntrega: '',
        FechaRecoger: '',
        Costo: '',
        ColegioID: colegioId
      })
    }
    setShowModal(true)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTerminal(null)
  }

  // Guardar terminal
  const handleSaveTerminal = async () => {
    try {
      // Validaciones básicas
      if (!formData.NumeroSerie.trim()) {
        showMessage('El número de serie es requerido', 'error')
        return
      }

      const url = editingTerminal 
        ? `/api/terminales/${editingTerminal.Id_terminal}`
        : '/api/terminales'
      
      const method = editingTerminal ? 'PUT' : 'POST'
      
      const payload = {
        ...formData,
        ColegioID: parseInt(colegioId),
        Costo: formData.Costo ? parseFloat(formData.Costo) : 0
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        fetchTerminales()
        handleCloseModal()
        showMessage(
          editingTerminal 
            ? 'Terminal actualizado correctamente' 
            : 'Terminal creado correctamente'
        )
      } else {
        const error = await response.json()
        showMessage(error.error || 'Error al guardar', 'error')
      }
    } catch (error) {
      console.error('Error al guardar terminal:', error)
      showMessage('Error al guardar terminal', 'error')
    }
  }

  // Eliminar terminal
  const handleDeleteTerminal = async (id) => {
    if (!confirm('¿Está seguro de eliminar este terminal?')) return

    try {
      const response = await fetch(`/api/terminales/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTerminales()
        showMessage('Terminal eliminado correctamente')
      } else {
        const error = await response.json()
        showMessage(error.error || 'Error al eliminar', 'error')
      }
    } catch (error) {
      console.error('Error al eliminar terminal:', error)
      showMessage('Error al eliminar terminal', 'error')
    }
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
    
    // Manejar diferentes formatos de fecha
    if (dateString.includes('T')) {
        date = new Date(dateString);
    } else if (dateString.includes('-')) {
        // Formato MySQL sin T
        const [year, month, day] = dateString.split(' ')[0].split('-');
        date = new Date(year, month - 1, day);
    } else {
        return dateString; // Retorna el string tal cual si no podemos parsearlo
    }
    
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    return date.toLocaleDateString('es-ES');
    };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0)
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
              <MdComputer className="text-indigo-600" />
              Terminales y Equipos
            </h1>
            <p className="text-gray-600">Gestiona dispositivos de venta</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
            >
              <FiPlus /> Nuevo Terminal
            </button>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <FiPrinter /> Imprimir
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <FiDownload /> Exportar
            </button>
          </div>
        </div>

        {/* Tabla de terminales */}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTerminales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No se encontraron terminales
                  </td>
                </tr>
              ) : (
                filteredTerminales.map((terminal) => (
                  <tr key={terminal.Id_terminal} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-indigo-600">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(terminal)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteTerminal(terminal.Id_terminal)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingTerminal ? 'Editar Terminal' : 'Nuevo Terminal'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna 1 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número de Serie *
                    </label>
                    <input
                      type="text"
                      name="NumeroSerie"
                      value={formData.NumeroSerie}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ej: SN123456789"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      name="Modelo"
                      value={formData.Modelo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ej: Verifone VX520"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      name="Color"
                      value={formData.Color}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Ej: Negro, Blanco"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cobro con Tarjeta
                    </label>
                    <select
                      name="CobroTarjeta"
                      value={formData.CobroTarjeta}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="NO">No</option>
                      <option value="SI">Sí</option>
                    </select>
                  </div>
                </div>

                {/* Columna 2 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Asignado a
                    </label>
                    <input
                      type="text"
                      name="Asignado"
                      value={formData.Asignado}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Nombre del vendedor/empleado"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Entrega
                    </label>
                    <input
                      type="date"
                      name="FechaEntrega"
                      value={formData.FechaEntrega}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha para Recoger
                    </label>
                    <input
                      type="date"
                      name="FechaRecoger"
                      value={formData.FechaRecoger}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Costo (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="Costo"
                      value={formData.Costo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveTerminal}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all"
                >
                  {editingTerminal ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de feedback */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-lg z-50 animate-slide-in">
          <div className="flex items-center gap-2">
            <MdCheckCircle className="text-green-500" />
            <span>{message}</span>
          </div>
        </div>
      )}

      {showError && (
        <div className="fixed top-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-lg z-50 animate-slide-in">
          <div className="flex items-center gap-2">
            <MdCancel className="text-red-500" />
            <span>{message}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default TerminalesManager