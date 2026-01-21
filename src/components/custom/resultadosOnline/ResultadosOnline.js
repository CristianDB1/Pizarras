'use client'
import { useState, useEffect } from "react";
import { FaSearch, FaCalendarAlt, FaTrophy, FaTicketAlt } from "react-icons/fa";
import Swal from "sweetalert2";

const ResultadosOnline = ({ colegioId }) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("numero");
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [winner, setWinner] = useState(null);
  const [recentWinners, setRecentWinners] = useState([]);

  // Cargar últimos sorteos cuando tengamos colegioId
  useEffect(() => {
    if (colegioId) {
      // Establecer fecha actual por defecto
      const today = new Date().toISOString().split('T')[0];
      setFechaSeleccionada(today);
      cargarUltimosSorteos();
    } else {
      // Si no hay colegioId, mostrar mensaje
      Swal.fire({
        icon: "warning",
        title: "Colegio no especificado",
        text: "No se puede cargar resultados sin especificar un colegio",
      });
    }
  }, [colegioId]);

  // Cargar últimos sorteos
  const cargarUltimosSorteos = async () => {
    if (!colegioId) {
      console.error("No hay colegioId para cargar sorteos");
      Swal.fire({
        icon: "warning",
        title: "Colegio no identificado",
        text: "Por favor, vuelve a la página principal",
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch("/api/resultados/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ultimos",
          colegio_id: parseInt(colegioId)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const sorteosAdaptados = data.map(adaptSorteoData);
        setWinner(sorteosAdaptados[0]);
        setRecentWinners(sorteosAdaptados.slice(0, 5));
      } else {
        setWinner(null);
        setRecentWinners([]);
        Swal.fire({
          icon: "info",
          title: "Sin resultados",
          text: "No se encontraron sorteos recientes para este colegio",
          timer: 3000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error fetching winners:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un problema al cargar los datos",
      });
    } finally {
      setLoading(false);
    }
  };

  // Buscar resultados
  const buscarResultados = async () => {
    if (!colegioId) {
      Swal.fire({
        icon: "warning",
        title: "Colegio no identificado",
        text: "Por favor, vuelve a la página principal",
      });
      return;
    }

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
      const valorBusqueda = searchType === "numero" ? searchTerm : fechaSeleccionada;
      
      const response = await fetch("/api/resultados/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: searchType,
          valor: valorBusqueda,
          colegio_id: parseInt(colegioId)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la búsqueda");
      }

      const data = await response.json();
      const sorteosAdaptados = data.map(adaptSorteoData);
      
      if (sorteosAdaptados.length > 0) {
        setWinner(sorteosAdaptados[0]);
        setRecentWinners(sorteosAdaptados.slice(0, 5));
        
        Swal.fire({
          icon: "success",
          title: "Resultado encontrado",
          text: `Sorteo del ${formatDate(sorteosAdaptados[0].fecha)}`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "info",
          title: "Sin resultados",
          text: `No se encontraron sorteos ${searchType === "numero" ? "con ese número" : "para esa fecha"}`,
        });
        setWinner(null);
        setRecentWinners([]);
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

  // Adaptar datos del sorteo
  const adaptSorteoData = (data) => {
    // Extraer últimos dígitos según el número de cifras del sorteo
    const digitos = data.digitos_boleto || 5;
    const primerLugar = data.primer_premio_ln 
      ? data.primer_premio_ln.slice(-digitos)
      : "No disponible";
    const segundoLugar = data.segundo_premio_ln 
      ? data.segundo_premio_ln.slice(-digitos)
      : "No disponible";

    return {
      // Mapeo para compatibilidad con el componente
      Sorteo: data.numero_sorteo,
      fechasorteo: data.fecha,
      primerlugar: primerLugar,
      segundolugar: segundoLugar,
      // Datos originales
      ...data,
      // Alias para el componente
      primer_premio: primerLugar,
      segundo_premio: segundoLugar
    };
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "";
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

  // Formatear fecha corta
  const formatShortDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return "";
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
      case 'publicado': return 'Publicado';
      case 'pendiente': return 'Pendiente';
      case 'sin_resultados': return 'Sin resultados';
      default: return 'Desconocido';
    }
  };

  // Función para buscar por número (mantener compatibilidad)
  const searchBySorteo = () => {
    setSearchType("numero");
    buscarResultados();
  };

  // Función para buscar por fecha (mantener compatibilidad)
  const searchByDate = () => {
    setSearchType("fecha");
    buscarResultados();
  };

  // Si no hay colegioId, mostrar mensaje
  if (!colegioId) {
    return (
      <div className="w-full bg-white p-8 text-center rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Resultados de Sorteos</h2>
        <p className="text-gray-600 mb-4">Para ver los resultados, necesitas acceder desde un colegio específico.</p>
        <p className="text-gray-500">Por favor, vuelve a la página principal del colegio.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      {/* Header de Resultados */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-red-600 mb-2">RESULTADOS DE LOTERÍAS</h1>
        <p className="text-gray-600">Resultados oficiales - Tu Sorteo Digital</p>      
      </div>

      {/* Panel de Búsqueda */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Consultar Resultados</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Búsqueda por número */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Número de Sorteo
            </label>
            <div className="flex">
              <input
                type="text"
                placeholder="Ej: 306"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchBySorteo()}
                className="flex-1 p-3 rounded-l border border-gray-300 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={searchBySorteo}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-r transition duration-200 flex items-center justify-center"
                disabled={loading}
              >
                <FaSearch />
              </button>
            </div>
          </div>

          {/* Búsqueda por fecha */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Por Fecha
            </label>
            <div className="flex">
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="flex-1 p-3 rounded-l border border-gray-300 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={searchByDate}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-r transition duration-200 flex items-center justify-center"
                disabled={loading}
              >
                <FaCalendarAlt />
              </button>
            </div>
          </div>

          {/* Botón últimos resultados */}
          <div className="flex items-end">
            <button
              onClick={cargarUltimosSorteos}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded transition duration-200"
              disabled={loading}
            >
              Últimos Resultados
            </button>
          </div>
        </div>
      </div>

      {/* Resultado Principal */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando resultados...</p>
        </div>
      ) : winner ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-8">
          {/* Header del Sorteo */}
          <div className="bg-red-600 text-white p-6 rounded-t-lg">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                <FaTrophy />
                {winner.nombre_sorteo || "TRÉBOL DE LA SUERTE"}
              </h3>
              <p className="text-lg mb-2">{formatDate(winner.fecha)}</p>
              <div className="flex flex-wrap justify-center items-center gap-3 mt-3">
                <div className="bg-red-700 px-3 py-1 rounded-full">
                  <p className="text-sm font-medium">
                    Sorteo LN #{winner.Sorteo}
                  </p>
                </div>
                <div className="bg-red-700 px-3 py-1 rounded-full">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <FaTicketAlt className="text-xs" />
                    {winner.digitos_boleto} cifras
                  </p>
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getEstadoColor(winner.estado_visual)}`}>
                  {getEstadoTexto(winner.estado_visual)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Resultados */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="text-center bg-gradient-to-r from-yellow-50 to-yellow-100 p-8 rounded-xl border-2 border-yellow-200 shadow-sm">
                <h4 className="font-bold text-2xl mb-4 text-yellow-700">1er Lugar</h4>
                <p className="text-6xl font-bold text-gray-900 tracking-wider mb-2">
                  {winner.primerlugar}
                </p>
                <p className="text-sm text-gray-600">
                  Últimas {winner.digitos_boleto} cifras
                </p>
                {winner.primer_premio_ln && (
                  <p className="text-xs text-gray-500 mt-2">
                    Número completo: {winner.primer_premio_ln}
                  </p>
                )}
              </div>
              <div className="text-center bg-gradient-to-r from-gray-50 to-gray-100 p-8 rounded-xl border-2 border-gray-200 shadow-sm">
                <h4 className="font-bold text-2xl mb-4 text-gray-700">2do Lugar</h4>
                <p className="text-6xl font-bold text-gray-900 tracking-wider mb-2">
                  {winner.segundolugar}
                </p>
                <p className="text-sm text-gray-600">
                  Últimas {winner.digitos_boleto} cifras
                </p>
                {winner.segundo_premio_ln && (
                  <p className="text-xs text-gray-500 mt-2">
                    Número completo: {winner.segundo_premio_ln}
                  </p>
                )}
              </div>
            </div>
            
            {/* Información adicional */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Estado del Sorteo</p>
                <p className="font-semibold text-lg">{winner.estatus || "No disponible"}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Estado del Resultado</p>
                <p className="font-semibold text-lg">{winner.estado_resultado || "No disponible"}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Fecha de Publicación</p>
                <p className="font-semibold text-lg">
                  {winner.fecha_publicacion ? formatShortDate(winner.fecha_publicacion) : "No publicado"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FaTicketAlt className="text-5xl text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-2">No hay resultados disponibles</p>
          <p className="text-gray-500">Utilice las opciones de búsqueda para consultar resultados</p>
          <p className="text-sm text-gray-400 mt-4">Colegio ID: {colegioId}</p>
        </div>
      )}

      {/* Sorteos Recientes */}
      {recentWinners.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaCalendarAlt className="text-red-600" />
            Sorteos Recientes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentWinners.map((sorteo, index) => {
              const estadoBadge = getEstadoColor(sorteo.estado_visual);
              const estadoTexto = getEstadoTexto(sorteo.estado_visual);
              
              return (
                <div 
                  key={index}
                  className="bg-white p-5 rounded-xl border border-gray-200 cursor-pointer hover:border-red-300 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => setWinner(sorteo)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded-full">
                        Sorteo #{sorteo.Sorteo}
                      </span>
                      <span className={`ml-2 text-xs font-bold px-2 py-1 rounded-full ${estadoBadge}`}>
                        {estadoTexto}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {sorteo.digitos_boleto} cifras
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{formatDate(sorteo.fecha)}</p>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-1">{sorteo.nombre_sorteo}</p>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-left">
                      <p className="text-gray-500 text-xs">1er Lugar</p>
                      <p className="font-bold text-gray-800">{sorteo.primerlugar}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">2do Lugar</p>
                      <p className="font-bold text-gray-800">{sorteo.segundolugar}</p>
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultadosOnline;