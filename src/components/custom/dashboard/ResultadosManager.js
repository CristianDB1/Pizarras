"use client";
import { useState, useEffect } from "react";
import { FaSearch, FaCalendarAlt, FaPrint, FaTrophy, FaTicketAlt, FaCheckCircle, FaMoneyBillWave } from "react-icons/fa";
import Swal from "sweetalert2";

const ResultadosManager = ({ colegioId }) => {
  // Estados para búsqueda
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("numero"); // "numero" o "fecha"
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  
  // Estados para resultados
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [sorteoSeleccionado, setSorteoSeleccionado] = useState(null);
  const [detalleResultado, setDetalleResultado] = useState(null);
  const [boletosGanadores, setBoletosGanadores] = useState([]);
  
  // Estados para UI
  const [paginando, setPaginando] = useState(false);
  const [mostrandoDetalle, setMostrandoDetalle] = useState(false);

  // Cargar últimos sorteos al inicio
  useEffect(() => {
    if (colegioId) {
      cargarUltimosSorteos();
    }
  }, [colegioId]);

  // Buscar resultados
  const buscarResultados = async () => {
    if (searchType === "numero" && !searchTerm.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Por favor ingrese un número de sorteo",
      });
      return;
    }

    if (searchType === "fecha" && !fechaSeleccionada) {
      Swal.fire({
        icon: "warning",
        title: "Fecha no seleccionada",
        text: "Por favor seleccione una fecha",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/resultados/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: searchType,
          valor: searchType === "numero" ? searchTerm : fechaSeleccionada,
          colegio_id: parseInt(colegioId)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la búsqueda");
      }

      const data = await response.json();
      setResultadosBusqueda(data);
      setMostrandoDetalle(false);
      
      if (data.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Sin resultados",
          text: `No se encontraron sorteos ${searchType === "numero" ? "con ese número" : "para esa fecha"}`,
        });
      }
    } catch (error) {
      console.error("Error buscando resultados:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Ocurrió un problema al buscar los resultados",
      });
    } finally {
      setLoading(false);
    }
  };

  // Cargar últimos sorteos
  const cargarUltimosSorteos = async () => {
    setLoading(true);
    try {
      // Buscar sorteos de los últimos 30 días
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);
      const fechaFormateada = fechaLimite.toISOString().split('T')[0];

      const response = await fetch("/api/resultados/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "fecha",
          valor: fechaFormateada,
          colegio_id: parseInt(colegioId)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResultadosBusqueda(data);
      }
    } catch (error) {
      console.error("Error cargando últimos sorteos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar detalle de un sorteo
  const cargarDetalleSorteo = async (sorteo) => {
    setPaginando(true);
    setSorteoSeleccionado(sorteo);
    
    try {
      const response = await fetch("/api/resultados/detalle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_sorteo_ln: sorteo.numero_sorteo,
          colegio_id: parseInt(colegioId),
          id_sorteo: sorteo.id_sorteo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error cargando detalle");
      }

      const data = await response.json();
      setDetalleResultado(data);
      setBoletosGanadores(data.boletos_ganadores || []);
      setMostrandoDetalle(true);
      
      // Scroll suave al detalle
      setTimeout(() => {
        const element = document.getElementById('detalle-resultado');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
    } catch (error) {
      console.error("Error cargando detalle:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al cargar el detalle del sorteo",
      });
    } finally {
      setPaginando(false);
    }
  };

  // Marcar boleto como pagado
  const marcarComoPagado = async (idBoleto) => {
    if (!sorteoSeleccionado) return;

    const { value: confirmar } = await Swal.fire({
      title: '¿Marcar como pagado?',
      text: 'Esta acción no se puede deshacer',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#EF4444',
      confirmButtonText: 'Sí, marcar como pagado',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmar) return;

    try {
      const response = await fetch("/api/resultados/marcar-pagado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_boleto: idBoleto,
          id_sorteo: sorteoSeleccionado.id_sorteo,
          colegio_id: parseInt(colegioId)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error actualizando boleto");
      }

      const result = await response.json();
      
      // Actualizar estado en la lista local
      setBoletosGanadores(prev => 
        prev.map(boleto => 
          boleto.id_boleto === idBoleto 
            ? { ...boleto, estado_pago: 'pagado' }
            : boleto
        )
      );

      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text: result.message || "Boleto marcado como pagado",
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error("Error marcando como pagado:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al marcar el boleto como pagado",
      });
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "Fecha no disponible";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Fecha inválida";
      
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  // Obtener color según estado
  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'publicado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'sin_resultados': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Obtener texto según estado
  const getEstadoTexto = (estado) => {
    switch(estado) {
      case 'publicado': return 'Resultados publicados';
      case 'pendiente': return 'Resultados pendientes';
      case 'sin_resultados': return 'Sin resultados';
      default: return 'Desconocido';
    }
  };

  // Imprimir resultados
  const imprimirResultados = () => {
    if (!detalleResultado) {
      Swal.fire({
        icon: "warning",
        title: "Sin datos",
        text: "No hay resultados para imprimir",
      });
      return;
    }

    // Aquí puedes implementar la lógica de impresión/PDF
    const ventana = window.open('', '_blank');
    ventana.document.write(`
      <html>
        <head>
          <title>Resultados Sorteo ${detalleResultado.sorteo.numero_sorteo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .resultados { display: flex; justify-content: space-around; margin: 30px 0; }
            .resultado-card { text-align: center; padding: 20px; border: 2px solid #333; border-radius: 10px; min-width: 200px; }
            .tabla { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .tabla th, .tabla td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .tabla th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${detalleResultado.sorteo.nombre}</h1>
            <h3>Sorteo Lotería Nacional #${detalleResultado.sorteo.numero_sorteo}</h3>
            <p>${formatDate(detalleResultado.sorteo.fecha)}</p>
          </div>
          
          <div class="resultados">
            <div class="resultado-card">
              <h3>Primer Lugar</h3>
              <h1>${detalleResultado.resultados_colegio.primer_lugar || 'N/A'}</h1>
              <small>(${detalleResultado.resultados_loteria_nacional.primer_lugar || 'N/A'})</small>
            </div>
            <div class="resultado-card">
              <h3>Segundo Lugar</h3>
              <h1>${detalleResultado.resultados_colegio.segundo_lugar || 'N/A'}</h1>
              <small>(${detalleResultado.resultados_loteria_nacional.segundo_lugar || 'N/A'})</small>
            </div>
          </div>
          
          <h3>Boletos Ganadores</h3>
          <table class="tabla">
            <thead>
              <tr>
                <th>Número</th>
                <th>Comprador</th>
                <th>Premio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${detalleResultado.boletos_ganadores.map(boleto => `
                <tr>
                  <td>${boleto.boleto}</td>
                  <td>${boleto.comprador || 'N/A'}</td>
                  <td>${boleto.tipo_premio === 'primer_lugar' ? 'Primer Lugar' : 'Segundo Lugar'}</td>
                  <td>${boleto.estado_pago === 'pagado' ? 'Pagado' : 'Pendiente'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <p style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            Impreso el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}
          </p>
        </body>
      </html>
    `);
    ventana.document.close();
    ventana.print();
  };

  // Regresar a la lista
  const regresarALista = () => {
    setMostrandoDetalle(false);
    setDetalleResultado(null);
    setSorteoSeleccionado(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <FaTrophy className="text-yellow-400" />
          Resultados de Sorteos
        </h1>
        <p className="text-gray-300">Consulta resultados de la Lotería Nacional y verifica boletos ganadores</p>
      </div>

      {/* Panel de búsqueda */}
      {!mostrandoDetalle && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaSearch className="text-red-600" />
            Buscar Resultados
          </h2>

          {/* Selector de tipo de búsqueda */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setSearchType("numero")}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                searchType === "numero"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaSearch />
              Por Número de Sorteo
            </button>
            <button
              onClick={() => setSearchType("fecha")}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                searchType === "fecha"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FaCalendarAlt />
              Por Fecha
            </button>
          </div>

          {/* Input de búsqueda */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            {searchType === "numero" ? (
              <input
                type="text"
                placeholder="Ej: 306 (número de sorteo de Lotería Nacional)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && buscarResultados()}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            ) : (
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            )}
            
            <button
              onClick={buscarResultados}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-red-700 to-red-800 text-white rounded-lg font-semibold hover:from-red-800 hover:to-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Buscando...
                </>
              ) : (
                <>
                  <FaSearch />
                  Buscar
                </>
              )}
            </button>
          </div>

          {/* Botón para cargar últimos */}
          <button
            onClick={cargarUltimosSorteos}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-medium hover:from-gray-800 hover:to-gray-900 transition-all text-sm disabled:opacity-50"
          >
            Ver sorteos recientes
          </button>
        </div>
      )}

      {/* Contenido principal */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {mostrandoDetalle ? (
          /* DETALLE DEL SORTEO */
          <div id="detalle-resultado">
            {/* Botón de regreso */}
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={regresarALista}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2"
              >
                ← Volver a la lista
              </button>
            </div>

            {paginando ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Cargando detalles del sorteo...</p>
              </div>
            ) : detalleResultado ? (
              <div className="p-6">
                {/* Encabezado del sorteo */}
                <div className="mb-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {detalleResultado.sorteo.nombre}
                      </h2>
                      <p className="text-gray-600">
                        {formatDate(detalleResultado.sorteo.fecha)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-medium text-gray-700">
                          Colegio: {detalleResultado.sorteo.colegio?.nombre || 'N/A'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(detalleResultado.resultados_loteria_nacional?.estado || 'sin_resultados')}`}>
                          {getEstadoTexto(detalleResultado.resultados_loteria_nacional?.estado || 'sin_resultados')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={imprimirResultados}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2"
                      >
                        <FaPrint />
                        Imprimir
                      </button>
                    </div>
                  </div>

                  {/* Información del sorteo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Número de Sorteo LN</p>
                      <p className="text-xl font-bold text-gray-900">{detalleResultado.sorteo.numero_sorteo}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Cifras del sorteo</p>
                      <p className="text-xl font-bold text-gray-900">{detalleResultado.sorteo.digitos_boleto} cifras</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500">Total ganadores</p>
                      <p className="text-xl font-bold text-gray-900">{detalleResultado.total_ganadores || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Resultados de Lotería Nacional */}
                {detalleResultado.resultados_loteria_nacional?.primer_lugar && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaTrophy className="text-red-600" />
                      Resultados Oficiales - Lotería Nacional
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-6">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-yellow-800 mb-1">Primer Lugar</p>
                          <p className="text-5xl font-bold text-gray-900 tracking-wider">
                            {detalleResultado.resultados_loteria_nacional.primer_lugar}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">5 cifras completas</p>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-800 mb-1">Segundo Lugar</p>
                          <p className="text-5xl font-bold text-gray-900 tracking-wider">
                            {detalleResultado.resultados_loteria_nacional.segundo_lugar}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">5 cifras completas</p>
                        </div>
                      </div>
                    </div>
                    {detalleResultado.resultados_loteria_nacional.fecha_publicacion && (
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Publicado el {formatDate(detalleResultado.resultados_loteria_nacional.fecha_publicacion)}
                      </p>
                    )}
                  </div>
                )}

                {/* Resultados para este colegio */}
                {detalleResultado.resultados_colegio?.primer_lugar && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaTicketAlt className="text-green-600" />
                      Resultados para este Sorteo ({detalleResultado.sorteo.digitos_boleto} cifras)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-6">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-green-800 mb-1">Primer Lugar</p>
                          <p className="text-5xl font-bold text-gray-900 tracking-wider">
                            {detalleResultado.resultados_colegio.primer_lugar}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            Últimas {detalleResultado.sorteo.digitos_boleto} cifras
                          </p>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-blue-800 mb-1">Segundo Lugar</p>
                          <p className="text-5xl font-bold text-gray-900 tracking-wider">
                            {detalleResultado.resultados_colegio.segundo_lugar}
                          </p>
                          <p className="text-xs text-gray-600 mt-2">
                            Últimas {detalleResultado.sorteo.digitos_boleto} cifras
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Boletos ganadores */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <FaMoneyBillWave className="text-purple-600" />
                      Boletos Ganadores
                      <span className="text-sm font-normal text-gray-500">
                        ({boletosGanadores.length} encontrados)
                      </span>
                    </h3>
                    {boletosGanadores.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {boletosGanadores.filter(b => b.estado_pago === 'pagado').length} pagados
                      </div>
                    )}
                  </div>
                  
                  {boletosGanadores.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <FaTicketAlt className="text-4xl text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {detalleResultado.resultados_loteria_nacional?.primer_lugar 
                          ? "No se encontraron boletos ganadores para este sorteo" 
                          : "Los resultados de Lotería Nacional aún no han sido publicados"}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Número
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Comprador
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vendedor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Premio
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {boletosGanadores.map((boleto, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-bold text-lg text-gray-900">
                                  {boleto.boleto}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-900">{boleto.comprador || 'N/A'}</p>
                                  {boleto.fecha_venta && (
                                    <p className="text-xs text-gray-500">
                                      {new Date(boleto.fecha_venta).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {boleto.vendedor_nombre || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                  boleto.tipo_premio === 'primer_lugar'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {boleto.tipo_premio === 'primer_lugar' ? 'Primer Lugar' : 'Segundo Lugar'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                  boleto.estado_pago === 'pagado'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {boleto.estado_pago === 'pagado' ? 'Pagado' : 'Pendiente'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {boleto.estado_pago !== 'pagado' && (
                                  <button
                                    onClick={() => marcarComoPagado(boleto.id_boleto)}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                  >
                                    <FaCheckCircle className="text-xs" />
                                    Marcar Pagado
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* LISTA DE RESULTADOS */
          <div className="p-6">
            <h3 className="font-bold text-lg text-gray-800 mb-4">
              {resultadosBusqueda.length > 0 ? 'Resultados Encontrados' : 'Sorteos Recientes'}
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Cargando resultados...</p>
              </div>
            ) : resultadosBusqueda.length === 0 ? (
              <div className="text-center py-8">
                <FaTicketAlt className="text-5xl text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">No hay sorteos para mostrar</h4>
                <p className="text-gray-500">Busca por número de sorteo o fecha para ver resultados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resultadosBusqueda.map((sorteo, index) => (
                  <div
                    key={index}
                    onClick={() => cargarDetalleSorteo(sorteo)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                      sorteoSeleccionado?.id_sorteo === sorteo.id_sorteo
                        ? "bg-red-50 border-red-300 shadow-md"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-800 line-clamp-1">
                          {sorteo.nombre_sorteo}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(sorteo.fecha)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(sorteo.estado_visual)}`}>
                        {getEstadoTexto(sorteo.estado_visual)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Sorteo LN</p>
                        <p className="font-medium">#{sorteo.numero_sorteo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500">Cifras</p>
                        <p className="font-medium">{sorteo.digitos_boleto}</p>
                      </div>
                    </div>
                    
                    {sorteo.primer_premio_ln && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Resultados:</span>
                          <span className="font-medium">
                            {sorteo.primer_premio_ln.slice(-sorteo.digitos_boleto)} / {sorteo.segundo_premio_ln.slice(-sorteo.digitos_boleto)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 text-center">
                      <span className="text-red-600 text-sm font-medium inline-flex items-center gap-1">
                        Ver detalles →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultadosManager;