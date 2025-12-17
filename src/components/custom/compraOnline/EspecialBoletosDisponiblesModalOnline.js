// EspecialBoletosDisponiblesModalOnline.js - VERSIÓN MODIFICADA
import React from "react";

const EspecialBoletosDisponiblesModalOnline = ({ tickets, onClose, colegioId }) => { 
  const boletosVendidosNormal = tickets.boletosNormal || []; 
  const boletosVendidosOnline = tickets.boletosOnline || []; 
  
  // Debug para verificar datos
  /*console.log("🎫 Modal - Boletos recibidos:", {
    normales: boletosVendidosNormal,
    online: boletosVendidosOnline,
    colegioId
  });*/
  
  // NORMALIZAR todos a strings de 3 dígitos para comparación consistente
  const todosBoletosVendidos = [
    ...boletosVendidosNormal.map(ticket => 
      typeof ticket === 'number' ? ticket.toString().padStart(3, '0') : ticket
    ),
    ...boletosVendidosOnline.map(ticket => 
      typeof ticket === 'number' ? ticket.toString().padStart(3, '0') : ticket
    )
  ];

  // Eliminar duplicados y ordenar
  const todosBoletosVendidosUnicos = [...new Set(todosBoletosVendidos)]
    .sort((a, b) => parseInt(a) - parseInt(b));

  // Generar todos los números posibles de 000 a 999
  const todosLosBoletos = Array.from({ length: 1000 }, (_, i) => 
    i.toString().padStart(3, '0')
  );

  // Filtrar boletos disponibles
  const boletosDisponibles = todosLosBoletos.filter(
    (boleto) => !todosBoletosVendidosUnicos.includes(boleto)
  );

  // Estadísticas
  const totalVendidos = todosBoletosVendidosUnicos.length;
  const totalDisponibles = boletosDisponibles.length;
  const porcentajeVendidos = ((totalVendidos / 1000) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-purple-800 mb-2">
            Boletos Disponibles - Colegio {colegioId || "General"}
          </h2>
          
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-semibold">TOTAL</div>
              <div className="text-2xl font-bold text-blue-700">1,000</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="text-sm text-red-600 font-semibold">VENDIDOS</div>
              <div className="text-2xl font-bold text-red-700">{totalVendidos}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-semibold">DISPONIBLES</div>
              <div className="text-2xl font-bold text-green-700">{totalDisponibles}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-600 font-semibold">OCUPACIÓN</div>
              <div className="text-2xl font-bold text-yellow-700">{porcentajeVendidos}%</div>
            </div>
          </div>

          {/* Desglose */}
          <div className="text-sm text-gray-600 mb-4">
            <p>
              <span className="font-semibold">Boletos normales vendidos:</span> {boletosVendidosNormal.length} | 
              <span className="font-semibold ml-3">Boletos online vendidos:</span> {boletosVendidosOnline.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Los números muestran ceros a la izquierda para mejor visualización (036 en lugar de 36)
            </p>
          </div>
        </div>

        {/* Lista de boletos disponibles */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-gray-50 p-3 border border-gray-200 rounded-t-lg flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Boletos disponibles ({totalDisponibles})
            </span>
            <span className="text-xs text-gray-500">
              Haz clic para copiar número
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto border border-gray-200 border-t-0 rounded-b-lg">
            <div className="p-4">
              {boletosDisponibles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">⚠️ No hay boletos disponibles</p>
                  <p className="text-sm mt-2">Todos los boletos han sido vendidos o reservados</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {boletosDisponibles.map((boleto, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Copiar al portapapeles
                        navigator.clipboard.writeText(boleto);
                        // Mostrar feedback (opcional)
                        const elemento = document.getElementById(`boleto-${index}`);
                        if (elemento) {
                          elemento.textContent = "✓ Copiado";
                          elemento.className = "text-center p-3 bg-blue-100 border border-blue-300 rounded text-sm font-medium text-blue-700 cursor-pointer transition-all duration-200";
                          setTimeout(() => {
                            elemento.textContent = boleto;
                            elemento.className = "text-center p-3 bg-green-50 border border-green-200 rounded text-sm font-medium text-green-700 cursor-pointer hover:bg-green-100 hover:border-green-300 transition-all duration-200";
                          }, 1000);
                        }
                      }}
                      id={`boleto-${index}`}
                      className="text-center p-3 bg-green-50 border border-green-200 rounded text-sm font-medium text-green-700 cursor-pointer hover:bg-green-100 hover:border-green-300 transition-all duration-200"
                      title={`Click para copiar ${boleto}`}
                    >
                      {boleto}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de boletos vendidos (opcional, pestaña o sección colapsable) */}
        {totalVendidos > 0 && (
          <div className="mt-4 border-t pt-4">
            <details className="group">
              <summary className="flex justify-between items-center cursor-pointer text-gray-700">
                <span className="font-semibold">Ver boletos vendidos ({totalVendidos})</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <div className="mt-2 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50 rounded">
                  {todosBoletosVendidosUnicos.map((boleto, index) => (
                    <div
                      key={index}
                      className="text-center p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700"
                    >
                      {boleto}
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Botón de cierre */}
        <div className="flex justify-end pt-4 border-t mt-4">
          <button
            onClick={onClose}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition duration-200 font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EspecialBoletosDisponiblesModalOnline;