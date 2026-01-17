"use client";
import { useState, useEffect } from "react";
import { FaMoneyBillWave, FaTicketAlt, FaUsers, FaChartLine, FaTrophy, FaUserCircle, FaCalendarAlt, FaCheckCircle, FaClock } from "react-icons/fa";

export default function DashboardInicio({ colegioId }) {
  const [estadisticas, setEstadisticas] = useState({
    totalBoletos: 0,
    totalIngresos: 0,
    totalLiquidado: 0,
    totalVendedores: 0,
    promedioVenta: 0,
    boletosHoy: 0,
    ingresosHoy: 0,
    boletosPagados: 0,
    boletosPendientes: 0,
    vendedoresActivos: 0,
    sorteosActivos: 0,
    proximosSorteos: 0,
    siguienteSorteo: null
  });
  
  const [topVendedores, setTopVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes"); // "hoy", "semana", "mes", "ano", "todo"

  // Cargar estadísticas
  useEffect(() => {
    if (colegioId) {
      cargarEstadisticas();
      cargarTopVendedores();
    }
  }, [colegioId, periodo]);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard/estadisticas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colegio_id: parseInt(colegioId),
          periodo: periodo
        })
      });

      if (response.ok) {
        const data = await response.json();
        setEstadisticas({
          totalBoletos: data.total_boletos || 0,
          totalIngresos: data.total_ingresos || 0,
          totalLiquidado: data.total_liquidado || 0,
          totalVendedores: data.total_vendedores || 0,
          promedioVenta: data.promedio_venta || 0,
          boletosHoy: data.boletos_hoy || 0,
          ingresosHoy: data.ingresos_hoy || 0,
          boletosPagados: data.boletos_pagados || 0,
          boletosPendientes: data.boletos_pendientes || 0,
          vendedoresActivos: data.vendedores_activos || 0,
          sorteosActivos: data.sorteos_activos || 0,
          proximosSorteos: data.proximos_sorteos || 0,
          siguienteSorteo: data.siguiente_sorteo || null
        });
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

    const cargarTopVendedores = async () => {
    try {
        const response = await fetch("/api/dashboard/top-vendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            colegio_id: parseInt(colegioId),
            limite: 10
            // Remover el parámetro periodo por ahora
        })
        });

        if (response.ok) {
        const data = await response.json();
        setTopVendedores(data);
        }
    } catch (error) {
        console.error("Error cargando top vendedores:", error);
    }
    };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Formatear número
  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-MX').format(num || 0);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "No programado";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Fecha inválida";
      
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return "Fecha inválida";
    }
  };

  // Calcular porcentaje
  const calcularPorcentaje = (parcial, total) => {
    if (total === 0) return 0;
    return Math.round((parcial / total) * 100);
  };

  // Opciones de período
  const periodos = [
    { value: "hoy", label: "Hoy", icon: "📅" },
    { value: "semana", label: "Semana", icon: "📆" },
    { value: "mes", label: "Mes", icon: "🗓️" },
    { value: "ano", label: "Año", icon: "📊" },
    { value: "todo", label: "Total", icon: "📈" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Dashboard Principal</h1>
            <p className="text-gray-600">Estadísticas y resumen general del colegio</p>
          </div>
          
          {/* Selector de período */}
          <div className="flex flex-wrap gap-2">
            {periodos.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value)}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  periodo === p.value
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Boletos Vendidos */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FaTicketAlt className="text-2xl" />
            </div>
            <div className="text-right">
              <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded block mb-1">
                {periodo === "hoy" ? "Hoy" : 
                 periodo === "semana" ? "Semana" :
                 periodo === "mes" ? "Mes" :
                 periodo === "ano" ? "Año" : "Total"}
              </span>
              <span className="text-xs opacity-80">
                {estadisticas.totalVendedores} vendedores
              </span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-blue-100">Boletos Vendidos</h3>
          {loading ? (
            <div className="h-8 bg-white/20 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-3xl font-bold mt-2">{formatNumber(estadisticas.totalBoletos)}</p>
          )}
          <div className="mt-4 pt-4 border-t border-blue-400/30">
            <div className="flex justify-between text-sm">
              <span className="text-blue-100">Ingresos:</span>
              {loading ? (
                <div className="h-4 w-20 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <span className="font-semibold">{formatCurrency(estadisticas.totalIngresos)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Ingresos */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FaMoneyBillWave className="text-2xl" />
            </div>
            <div className="text-right">
              <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded block mb-1">
                Ingresos
              </span>
              <span className="text-xs opacity-80">
                Promedio: {formatCurrency(estadisticas.promedioVenta)}
              </span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-green-100">Total Generado</h3>
          {loading ? (
            <div className="h-8 bg-white/20 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-3xl font-bold mt-2">{formatCurrency(estadisticas.totalIngresos)}</p>
          )}
          <div className="mt-4 pt-4 border-t border-green-400/30">
            <div className="flex justify-between text-sm">
              <span className="text-green-100">Hoy:</span>
              {loading ? (
                <div className="h-4 w-20 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <span className="font-semibold">{formatCurrency(estadisticas.ingresosHoy)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Liquidado */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FaCheckCircle className="text-2xl" />
            </div>
            <div className="text-right">
              <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded block mb-1">
                Liquidado
              </span>
              <span className="text-xs opacity-80">
                {calcularPorcentaje(
                  estadisticas.totalLiquidado,
                  estadisticas.totalIngresos
                )}% del total
              </span>
            </div>
          </div>

          <h3 className="text-sm font-medium text-emerald-100">
            Dinero Cobrado
          </h3>

          {loading ? (
            <div className="h-8 bg-white/20 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-3xl font-bold mt-2">
              {formatCurrency(estadisticas.totalLiquidado)}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-emerald-400/30">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-100">Pendiente:</span>
              {loading ? (
                <div className="h-4 w-20 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <span className="font-semibold">
                  {formatCurrency(
                    estadisticas.totalIngresos - estadisticas.totalLiquidado
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sorteos Activos */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FaChartLine className="text-2xl" />
            </div>
            <div className="text-right">
              <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded block mb-1">
                Sorteos
              </span>
              <span className="text-xs opacity-80">
                {estadisticas.proximosSorteos} próximos
              </span>
            </div>
          </div>
          <h3 className="text-sm font-medium text-orange-100">En Curso</h3>
          {loading ? (
            <div className="h-8 bg-white/20 rounded animate-pulse mt-2"></div>
          ) : (
            <p className="text-3xl font-bold mt-2">{formatNumber(estadisticas.sorteosActivos)}</p>
          )}
          <div className="mt-4 pt-4 border-t border-orange-400/30">
            <div className="flex justify-between text-sm">
              <span className="text-orange-100">Próximo:</span>
              {loading ? (
                <div className="h-4 w-24 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <span className="font-semibold text-sm">
                  {formatDate(estadisticas.siguienteSorteo)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Vendedores y Estadísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Vendedores */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FaTrophy className="text-yellow-500" />
                Top 10 Vendedores
              </h2>
              <p className="text-gray-600 text-sm">Vendedores con más boletos vendidos</p>
            </div>
            <div className="text-sm font-medium text-gray-500 flex items-center gap-1">
              <FaCalendarAlt />
              {periodos.find(p => p.value === periodo)?.label}
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : topVendedores.length === 0 ? (
            <div className="text-center py-8">
              <FaUserCircle className="text-4xl text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay datos de vendedores para este período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topVendedores.map((vendedor, index) => (
                <div
                  key={vendedor.id_vendedor}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                      index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-800' :
                      'bg-gradient-to-r from-red-500 to-red-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {vendedor.nombre || `Vendedor ${vendedor.id_vendedor}`}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="truncate">@{vendedor.usuario}</span>
                        {vendedor.telefono && (
                          <>
                            <span>•</span>
                            <span>{vendedor.telefono}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatNumber(vendedor.total_boletos)} boletos
                    </p>
                    <div className="flex items-center justify-end gap-3 text-sm">
                      <span className="font-medium text-green-600">
                        {formatCurrency(vendedor.total_ventas)}
                      </span>
                      {vendedor.comision > 0 && (
                        <span className="text-blue-600 font-medium">
                          {vendedor.comision}% comisión
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen de Estado */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen de Estado</h2>
          
          <div className="space-y-6">
            {/* Estado de Boletos */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <FaTicketAlt />
                Estado de Boletos
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700">Pagados</span>
                    <span className="font-bold text-green-700">
                      {formatNumber(estadisticas.boletosPagados)} ({calcularPorcentaje(estadisticas.boletosPagados, estadisticas.totalBoletos)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${calcularPorcentaje(estadisticas.boletosPagados, estadisticas.totalBoletos)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700">Pendientes</span>
                    <span className="font-bold text-yellow-700">
                      {formatNumber(estadisticas.boletosPendientes)} ({calcularPorcentaje(estadisticas.boletosPendientes, estadisticas.totalBoletos)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${calcularPorcentaje(estadisticas.boletosPendientes, estadisticas.totalBoletos)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sorteos */}
            <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                <FaCalendarAlt />
                Sorteos Activos
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border border-green-300">
                  <p className="text-2xl font-bold text-green-700">{estadisticas.sorteosActivos}</p>
                  <p className="text-sm text-gray-600">En curso</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-green-300">
                  <p className="text-2xl font-bold text-green-700">{estadisticas.proximosSorteos}</p>
                  <p className="text-sm text-gray-600">Próximos</p>
                </div>
              </div>
              {estadisticas.siguienteSorteo && (
                <div className="mt-3 p-2 bg-green-200/50 rounded text-center">
                  <p className="text-sm font-medium text-green-800">
                    Próximo sorteo: <span className="font-bold">{formatDate(estadisticas.siguienteSorteo)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Vendedores */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-3 flex items-center gap-2">
                <FaUsers />
                Vendedores
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border border-purple-300">
                  <p className="text-2xl font-bold text-purple-700">{estadisticas.vendedoresActivos}</p>
                  <p className="text-sm text-gray-600">Activos</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg border border-purple-300">
                  <p className="text-2xl font-bold text-purple-700">{estadisticas.totalVendedores}</p>
                  <p className="text-sm text-gray-600">Vendiendo</p>
                </div>
              </div>
              {topVendedores.length > 0 && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-600">
                    Mejor vendedor: <span className="font-semibold text-purple-700">{topVendedores[0]?.nombre}</span> con {topVendedores[0]?.total_boletos} boletos
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pie de página con info */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-gray-600 text-sm">
              Actualizado: {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Pagados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Pendientes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Vendiendo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}