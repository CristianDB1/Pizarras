"use client"
import { useState } from "react";
import { useTotalVenta } from "@/context/TotalVentasContext";
import { generarPDFTotalVenta } from "../pdf/pdfTotalVenta";
import useSession from "@/hook/useSession";

export default function TotalVentasModal(){
    const {ventas,total,resetVentas} = useTotalVenta();
    const [open, setOpen] = useState(false);
    const { getUserData } = useSession();
    const user = getUserData();

    if (!user) return null;

    return (
    <div>
      <button 
        onClick={() => setOpen(true)} 
        className="fixed bottom-28 right-5 bg-red-600 text-white px-4 py-2 rounded shadow-lg"
      >
        Ver Total
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg w-96 shadow-lg">
            <h2 className="text-lg font-bold mb-2">Detalle de Ventas</h2>
            <div className="max-h-60 overflow-y-auto text-sm">
              {ventas.length > 0 ? (
                ventas.map((v, i) => (
                  <div key={i} className="border-b py-1 flex justify-between">
                    <span>
                      {v.tipo === "boleto" && "🎟️"}
                      {v.tipo === "serie" && "📦"}
                      {v.tipo === "premio" && "💸"}
                      {" "}
                      <strong>{v.descripcion || v.numero}</strong>
                    </span>
                    <span>
                      Cant: {v.cantidad} — ${v.subtotal}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No hay movimientos aún</p>
              )}
            </div>
            <div className="mt-3 text-right">
              <p className="font-bold">
                TOTAL:{" "}
                <span className={total < 0 ? "text-red-600" : "text-green-600"}>
                  ${total}
                </span>
              </p>
            </div>
            <div className="flex justify-between mt-3">
                <button 
                    onClick={()=> generarPDFTotalVenta(total,ventas)}
                    className="px-3 py-1 bg-green-500 text-white rounded">
                    Imprimir
                </button>
                <button 
                    onClick={resetVentas} 
                    className="px-3 py-1 bg-yellow-500 text-white rounded">
                    Limpiar
                </button>
                <button 
                    onClick={() => setOpen(false)} 
                    className="px-3 py-1 bg-gray-300 rounded">
                    Cerrar
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}