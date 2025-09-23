import React, { useState } from "react";

const EspecialPreviewModalOnline = ({ onClose, onConfirm }) => {
  const [telefono, setTelefono] = useState("");
  const [metodoPago, setMetodoPago] = useState("");

  const handleConfirm = () => {
    if (!telefono || !metodoPago) {
      alert("Por favor ingresa tu número de teléfono y selecciona un método de pago");
      return;
    }
    onConfirm({ telefono, metodoPago });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">Confirmar compra especial</h2>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Número de Teléfono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="Ej: 3001234567"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold mb-1">Método de Pago</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">-- Selecciona --</option>
            <option value="Nequi">Nequi</option>
            <option value="Bancolombia">Bancolombia</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-red-700 text-white px-4 py-2 rounded"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EspecialPreviewModalOnline;
