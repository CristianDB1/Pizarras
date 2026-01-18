"use client";
import { useState, useEffect } from "react";
import { FaHome, FaSearch } from "react-icons/fa";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

const WinnerSraffle = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [colegioId, setColegioId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tipoBusqueda, setTipoBusqueda] = useState("numero");
  const [valorBusqueda, setValorBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);

  // Obtener colegioId de la URL
  useEffect(() => {
    const id = searchParams.get('colegioId');
    console.log("🔍 colegioId desde URL:", id);
    
    // Si no hay en URL, intentar obtener de localStorage
    if (!id && typeof window !== 'undefined') {
      const userData = JSON.parse(localStorage.getItem('userData'));
      if (userData?.colegio_id) {
        setColegioId(userData.colegio_id);
        console.log("📂 colegioId desde localStorage:", userData.colegio_id);
      }
    } else {
      setColegioId(id);
    }
  }, [searchParams]);

  /* ===============================
     CARGA INICIAL - ÚLTIMOS SORTEOS DEL COLEGIO
     MISMA LÓGICA QUE EL ADMINISTRADOR
  =============================== */
  useEffect(() => {
    if (!colegioId) {
      console.log("⏳ Esperando colegioId...");
      return;
    }
    
    console.log("✅ COLEGIO ID obtenido:", colegioId);
    cargarUltimosSorteos();
  }, [colegioId]);

  /* ===============================
     CARGAR ÚLTIMOS SORTEOS DEL COLEGIO
     EXACTA MISMA LÓGICA QUE EL ADMINISTRADOR
  =============================== */
  const cargarUltimosSorteos = async () => {
    if (!colegioId) {
      Swal.fire("Error", "No se ha proporcionado el ID del colegio", "error");
      return;
    }

    setLoading(true);
    setResultados([]);

    try {
      // IMPORTANTE: Usar MISMO endpoint que el administrador
      // Buscar sorteos de los últimos 30 días (igual que el admin)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);
      const fechaFormateada = fechaLimite.toISOString().split('T')[0];

      console.log("📅 Buscando sorteos desde:", fechaFormateada);
      
      const response = await fetch("/api/resultados/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "fecha",
          valor: fechaFormateada,
          colegio_id: parseInt(colegioId)  // ESTO FILTRA POR COLEGIO
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error cargando sorteos");
      }

      const data = await response.json();
      setResultados(Array.isArray(data) ? data : []);
      
      console.log(`📊 Encontrados ${data.length} sorteos para el colegio ${colegioId}`);
      
      if (data.length === 0) {
        Swal.fire("Info", "No hay sorteos disponibles para este colegio", "info");
      }
    } catch (error) {
      console.error("Error cargando sorteos:", error);
      Swal.fire("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     FUNCIÓN CENTRAL PARA BÚSQUEDAS
     MISMA LÓGICA QUE EL ADMINISTRADOR
  =============================== */
  const buscarResultados = async () => {
    if (!colegioId) {
      Swal.fire("Error", "No se ha proporcionado el ID del colegio", "error");
      return;
    }

    if (tipoBusqueda === "numero" && !valorBusqueda.trim()) {
      Swal.fire("Atención", "Ingrese un número de sorteo", "warning");
      return;
    }

    if (tipoBusqueda === "fecha" && !valorBusqueda) {
      Swal.fire("Atención", "Seleccione una fecha", "warning");
      return;
    }

    setLoading(true);
    setResultados([]);

    try {
      const response = await fetch("/api/resultados/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoBusqueda,
          valor: tipoBusqueda === "numero" ? valorBusqueda : valorBusqueda,
          colegio_id: parseInt(colegioId)  // ESTO FILTRA POR COLEGIO
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error en la búsqueda");
      }

      const data = await response.json();
      setResultados(Array.isArray(data) ? data : []);
      
      if (data.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Sin resultados",
          text: `No se encontraron sorteos ${tipoBusqueda === "numero" ? "con ese número" : "para esa fecha"}`,
        });
      }
    } catch (error) {
      console.error("Error buscando resultados:", error);
      Swal.fire("Error", error.message || "Error al buscar resultados", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     HELPERS
  =============================== */
  const formatDate = (fecha) => {
    if (!fecha) return "—";
    try {
      const d = new Date(fecha);
      return d.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
      });
    } catch (error) {
      return fecha;
    }
  };

  const estadoColor = (estado) => {
    if (estado === "publicado") return "bg-green-700";
    if (estado === "pendiente") return "bg-yellow-600";
    return "bg-gray-600";
  };

  const estadoTexto = (estado) => {
    if (estado === "publicado") return "RESULTADOS PUBLICADOS";
    if (estado === "pendiente") return "RESULTADOS PENDIENTES";
    return "SIN RESULTADOS";
  };

  return (
    <div className="min-h-screen bg-[rgb(38,38,38)] p-4 flex justify-center">
      <div className="w-full max-w-xl border border-red-700 rounded-lg p-4">
        <div className="text-center mb-4">
          <h2 className="text-white text-2xl font-bold">
            Resultados del Sorteo
          </h2>
        </div>

        {/* Botón para recargar últimos sorteos (igual que admin) */}
        <div className="flex justify-center mb-4">
          <button
            onClick={cargarUltimosSorteos}
            disabled={loading || !colegioId}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {colegioId ? "Ver sorteos recientes" : "Esperando ID del colegio..."}
          </button>
        </div>

        {/* ================= BUSCADOR ================= */}
        <div className="flex gap-2 mb-4">
          <select
            value={tipoBusqueda}
            onChange={(e) => setTipoBusqueda(e.target.value)}
            disabled={!colegioId}
            className="bg-gray-800 text-white p-2 rounded border border-red-700 disabled:opacity-50"
          >
            <option value="numero">Número</option>
            <option value="fecha">Fecha</option>
          </select>

          <input
            type={tipoBusqueda === "fecha" ? "date" : "text"}
            value={valorBusqueda}
            onChange={(e) => setValorBusqueda(e.target.value)}
            placeholder={tipoBusqueda === "numero" ? "Ej: 306 (número de sorteo)" : ""}
            disabled={!colegioId}
            className="flex-1 p-2 rounded bg-gray-800 text-white border border-red-700 disabled:opacity-50"
          />

          <button
            onClick={buscarResultados}
            disabled={loading || !colegioId}
            className="bg-red-700 hover:bg-red-800 text-white p-3 rounded disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <FaSearch />
            )}
          </button>
        </div>

        {/* Mensaje si no hay colegioId */}
        {!colegioId && !loading && (
          <div className="text-center py-8">
            <div className="inline-block p-4 bg-yellow-900 rounded-lg">
              <p className="text-yellow-200 font-medium">
                ⚠️ No se ha encontrado el ID del colegio
              </p>
              <p className="text-gray-300 text-sm mt-2">
                Por favor, regresa al menú e intenta nuevamente
              </p>
              <button
                onClick={() => router.push('/menu')}
                className="mt-4 bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded"
              >
                Volver al Menú
              </button>
            </div>
          </div>
        )}

        {/* ================= LOADING ================= */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-700"></div>
            <p className="text-white mt-2">Cargando...</p>
          </div>
        )}

        {/* ================= RESULTADOS ================= */}
        {!loading && colegioId && resultados.map((r) => (
          <div
            key={r.id_sorteo || r.numero_sorteo}
            className="bg-red-900 text-white p-4 rounded-lg mb-4 border border-white"
          >
            <div className="text-center mb-2">
              <h3 className="font-bold text-lg">
                Sorteo #{r.numero_sorteo}
              </h3>
              <p className="text-sm">{formatDate(r.fecha)}</p>
              {r.nombre_sorteo && (
                <p className="text-sm text-gray-300">{r.nombre_sorteo}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 my-3">
              <div className="bg-red-950 p-3 rounded text-center border">
                <p className="text-sm">1er Premio LN</p>
                <p className="text-xl font-bold">
                  {r.primer_premio_ln ? r.primer_premio_ln.slice(-r.digitos_boleto) : "—"}
                </p>
                {r.primer_premio_ln && (
                  <p className="text-xs text-gray-400 mt-1">
                    Completo: {r.primer_premio_ln}
                  </p>
                )}
              </div>
              <div className="bg-red-950 p-3 rounded text-center border">
                <p className="text-sm">2do Premio LN</p>
                <p className="text-xl font-bold">
                  {r.segundo_premio_ln ? r.segundo_premio_ln.slice(-r.digitos_boleto) : "—"}
                </p>
                {r.segundo_premio_ln && (
                  <p className="text-xs text-gray-400 mt-1">
                    Completo: {r.segundo_premio_ln}
                  </p>
                )}
              </div>
            </div>

            <div className={`text-center text-sm font-bold py-1 rounded ${estadoColor(r.estado_visual)}`}>
              {estadoTexto(r.estado_visual)}
            </div>
          </div>
        ))}

        {!loading && colegioId && resultados.length === 0 && (
          <p className="text-gray-300 text-center py-4">
            No hay sorteos para mostrar
          </p>
        )}
      </div>

      {/* ================= BOTÓN MENÚ ================= */}
      <button
        onClick={() => router.push("/menu")}
        className="fixed bottom-4 right-4 bg-red-700 text-white text-4xl p-3 rounded-full border-4 border-white hover:bg-red-800"
      >
        <FaHome />
      </button>
    </div>
  );
};

export default WinnerSraffle;