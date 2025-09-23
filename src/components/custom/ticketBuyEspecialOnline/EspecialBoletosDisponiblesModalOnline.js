import React from "react";

const EspecialBoletosDisponiblesModalOnline = ({ tickets, onClose }) => {
  // Boletos vendidos
  const boletosVendidos = tickets.map((ticket) => ticket.Boleto);

  // Todos los boletos posibles (000 - 999)
  const todosLosBoletos = Array.from({ length: 1000 }, (_, i) => i);

  // Filtrar los disponibles
  const boletosDisponibles = todosLosBoletos.filter(
    (boleto) => !boletosVendidos.includes(boleto)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Boletos Especiales Disponibles</h2>
        <ul className="mb-4 h-64 overflow-y-auto">
          {boletosDisponibles.map((boleto, index) => (
            <li
              key={index}
              className="mb-2 flex justify-between items-center border-b pb-1"
            >
              <div>Boleto: {boleto.toString().padStart(3, "0")}</div>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EspecialBoletosDisponiblesModalOnline;
