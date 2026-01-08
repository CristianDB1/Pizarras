// components/custom/online/OnlineHome.js - VERSIÓN MEJORADA
'use client'
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ResultadosOnline from "@/components/custom/resultadosOnline/ResultadosOnline";

const OnlineHome = () => {
  const searchParams = useSearchParams();
  const colegioId = searchParams.get('colegio');
  
  const [colegio, setColegio] = useState(null);
  const [loadingColegio, setLoadingColegio] = useState(false);
  const [activeTab, setActiveTab] = useState("juegos");
  const [sorteos, setSorteos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Cargar datos del colegio
  useEffect(() => {
    const fetchColegio = async () => {
      if (!colegioId) {
        setColegio(null);
        return;
      }
      
      try {
        setLoadingColegio(true);
        const response = await fetch(`/api/colegios/${colegioId}`);
        
        if (response.ok) {
          const data = await response.json();
          setColegio(data);
        }
      } catch (error) {
        console.error("Error cargando colegio:", error);
        setColegio(null);
      } finally {
        setLoadingColegio(false);
      }
    };

    fetchColegio();
  }, [colegioId]);

  // Cargar sorteos
  useEffect(() => {
    const fetchSorteos = async () => {
      try {
        setLoading(true);
        
        if (colegioId) {
          const response = await fetch(`/api/sorteos/colegio/${colegioId}`);
          const data = await response.json();
          
          if (data.success) {
            setSorteos(data.sorteos || []);
          } else {
            setSorteos([]);
          }
        } else {
          const response = await fetch("/api/ticketBuy", { method: "PUT" });
          const data = await response.json();
          setSorteos(data.result || data || []);
        }
      } catch (error) {
        console.error("Error cargando sorteos:", error);
        setSorteos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSorteos();
  }, [colegioId]);

  const handleJugar = (sorteo) => {
    localStorage.setItem('sorteoSeleccionado', JSON.stringify(sorteo));
    
    const urlBase = "/CompraOnlineEspecial";
    const urlFinal = colegioId 
      ? `${urlBase}?colegio=${colegioId}`
      : urlBase;
    
    router.push(urlFinal);
  };

  const formatFecha = (fechaString) => {
    if (!fechaString) return "Fecha no definida";
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header con pestañas */}
        <div className="bg-red-600 p-4">
          <div className="flex space-x-8 justify-center">
            <button
              onClick={() => setActiveTab("juegos")}
              className={`px-6 py-2 rounded-full font-bold text-lg transition-all ${
                activeTab === "juegos" 
                  ? "bg-yellow-400 text-red-600 shadow-lg" 
                  : "text-white hover:bg-red-700"
              }`}
            >
              JUEGOS
            </button>
            <button
              onClick={() => setActiveTab("resultados")}
              className={`px-6 py-2 rounded-full font-bold text-lg transition-all ${
                activeTab === "resultados" 
                  ? "bg-yellow-400 text-red-600 shadow-lg" 
                  : "text-white hover:bg-red-700"
              }`}
            >
              RESULTADOS
            </button>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        <div className="p-6">
          {activeTab === "juegos" ? (
            <div>
              {/* Cabecera con nombre y logo del colegio (solo si hay colegioId) */}
              {colegioId && (
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <div className="flex flex-col md:flex-row items-center justify-center space-y-3 md:space-y-0 md:space-x-4">
                    {colegio?.logo_url && (
                      <img 
                        src={colegio.logo_url} 
                        alt={colegio.nombre}
                        className="h-16 w-16 object-contain"
                      />
                    )}
                    <div className="text-center md:text-left">
                      <h1 className="text-2xl font-bold text-gray-800">
                        {colegio?.nombre || `Colegio ${colegioId}`}
                      </h1>
                      <p className="text-lg text-red-600 font-semibold">
                        Sorteos del Colegio
                      </p>
                    </div>
                  </div>
                  
                  {/* Spinner mientras carga el colegio */}
                  {loadingColegio && (
                    <div className="text-center mt-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-600 inline-block"></div>
                    </div>
                  )}
                </div>
              )}

              {/* Si NO hay colegioId, mostrar título normal */}
              {!colegioId && (
                <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                  SORTEOS DISPONIBLES
                </h1>
              )}

              {/* Fecha actual */}
              <div className="text-center mb-6">
                <p className="text-lg text-red-600 font-semibold">
                  Hoy es {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
              
              {/* Lista de sorteos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sorteos.map((sorteo) => (
                  <div 
                    key={sorteo.id_sorteo || sorteo.Idsorteo}
                    className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {/* Etiqueta SORTEO */}
                    <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 inline-block text-center w-full">
                      SORTEO
                    </div>
                    
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-red-700 mb-2">
                        {sorteo.nombre || sorteo.leyenda2?.split(' - ')[0] || `Sorteo ${sorteo.numero_sorteo}`}
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">
                        {formatFecha(sorteo.fecha || sorteo.Fecha)}
                      </p>
                      <div className="text-xs text-gray-500">
                        <span className="font-semibold">1ro: </span>${sorteo.primer_premio || sorteo.Primerpremio} |{" "}
                        <span className="font-semibold">2do: </span>${sorteo.segundo_premio || sorteo.Segundopremio}
                      </div>
                      {sorteo.nombre_colegio && !colegioId && (
                        <p className="text-xs text-gray-400 mt-1">
                          Colegio: {sorteo.nombre_colegio}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleJugar(sorteo)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                    >
                      JUGAR AHORA
                    </button>
                  </div>
                ))}
              </div>

              {sorteos.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">
                    {colegioId 
                      ? "No hay sorteos disponibles para este colegio" 
                      : "No hay sorteos disponibles en este momento"}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Pestaña de Resultados */
            <ResultadosOnline colegioId={colegioId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineHome;