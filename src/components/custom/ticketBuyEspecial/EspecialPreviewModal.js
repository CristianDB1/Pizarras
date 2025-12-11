import React from "react";

const EspecialPreviewModal = ({ tickets, digitosBoleto = 3, onClose }) => {
    // Obtener los boletos vendidos
    const boletosVendidos = tickets.map(ticket => ticket.Boleto);

    // Generar una lista de todos los boletos posibles según dígitos
    const maxBoletos = Math.pow(10, digitosBoleto);
    const todosLosBoletos = Array.from({ length: maxBoletos }, (_, i) => i);

    // Filtrar los boletos que ya están vendidos
    const boletosDisponibles = todosLosBoletos.filter(boleto => !boletosVendidos.includes(boleto));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh]">
                <h2 className="text-xl font-bold mb-4">Boletos Disponibles</h2>
                <div className="mb-2 text-sm text-gray-600">
                    Total: {boletosDisponibles.length} de {maxBoletos} disponibles
                </div>
                <ul className="mb-4 h-64 overflow-y-auto">
                    {boletosDisponibles.length === 0 ? (
                        <li className="text-center text-gray-500 py-4">
                            No hay boletos disponibles
                        </li>
                    ) : (
                        boletosDisponibles.map((boleto, index) => (
                            <li key={index} className="mb-2 flex justify-between items-center p-2 hover:bg-gray-100 rounded">
                                <div className="font-medium">
                                    Boleto: <span className="text-blue-600">{boleto.toString().padStart(digitosBoleto, '0')}</span>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
                <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-gray-500">
                        Dígitos: {digitosBoleto}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default EspecialPreviewModal;