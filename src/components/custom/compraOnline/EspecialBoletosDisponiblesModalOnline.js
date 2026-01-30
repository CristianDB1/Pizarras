import React from "react";

const EspecialBoletosDisponiblesModalOnline = ({ tickets, onClose, colegioNombre, cifras = 3 }) => { 
  // Cambio: ahora solo recibimos boletosVendidos desde la tabla boletos
  const boletosVendidos = tickets.boletosVendidos || []; 
  
  // Determinamos el rango total según las cifras (10, 100, 1000, 10000, etc.)
  const totalPosibilidades = Math.pow(10, cifras);

  // NORMALIZAR usando el número de cifras dinámico
  const todosBoletosVendidos = boletosVendidos.map(ticket => 
    ticket.toString().padStart(cifras, '0')
  );

  const vendidosSet = new Set(todosBoletosVendidos);

  // Generar todos los números posibles según las cifras del sorteo
  const boletosDisponibles = [];
  for (let i = 0; i < totalPosibilidades; i++) {
    const numFormateado = i.toString().padStart(cifras, '0');
    if (!vendidosSet.has(numFormateado)) {
      boletosDisponibles.push(numFormateado);
    }
  }

  const totalDisponibles = boletosDisponibles.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header con Nombre Dinámico */}
        <div className="mb-4 border-b pb-4">
          <h2 className="text-2xl font-bold text-purple-800">
            BOLETOS DISPONIBLES
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded">
              {colegioNombre}
            </span>
            <span className="text-gray-400 text-xs">
              • Sorteo de {cifras} cifras
            </span>
          </div>
        </div>

        {/* Lista de boletos - TODOS */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-gray-50 p-3 border border-gray-200 rounded-t-lg flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Números disponibles ({totalDisponibles})
            </span>
            <span className="text-xs text-gray-400">Clic para copiar</span>
          </div>
          
          <div className="flex-1 overflow-y-auto border border-gray-200 border-t-0 rounded-b-lg p-4">
            {totalDisponibles === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-xl mb-2">😔 No hay boletos disponibles</div>
                <p className="text-sm">Todos los boletos han sido vendidos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {boletosDisponibles.map((boleto) => (
                  <button
                    key={boleto}
                    onClick={() => {
                      navigator.clipboard.writeText(boleto);
                      // Feedback visual
                      const button = document.querySelector(`button[key="${boleto}"]`);
                      if (button) {
                        const originalColor = button.className;
                        button.className = "text-center p-3 bg-yellow-100 border border-yellow-300 rounded text-sm font-bold text-yellow-800 transition-all";
                        setTimeout(() => {
                          button.className = originalColor;
                        }, 300);
                      }
                    }}
                    className="text-center p-3 bg-green-50 border border-green-200 rounded text-sm font-bold text-green-700 hover:bg-green-100 transition-all"
                  >
                    {boleto}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botón de cierre */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Fuente:</span> Tabla Boletos (Vendidos)
          </div>
          <button
            onClick={onClose}
            className="bg-purple-600 text-white px-8 py-2 rounded-lg hover:bg-purple-700 transition font-semibold shadow-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EspecialBoletosDisponiblesModalOnline;