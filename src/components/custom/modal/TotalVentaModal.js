"use client"
import { useState } from "react";
import { useTotalVenta } from "@/context/TotalVentasContext";
import { generarPDFTotalVenta } from "../pdf/pdfTotalVenta";

export default function TotalVentasModal(){
    const {ventas,total,resetVentas} = useTotalVenta();
    const [open, setOpen] = useState(false);
    return(
        <div>
            {/*Boton flotante para abrir y cerrar el modal*/}
            <button
                className="fixed bottom-24 right-6 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700"
                onClick={()=>setOpen(!open)}
            >
                {open ? "Cerrar Total" : "Ver Total"} 
            </button>
            {/*Modal*/}
            {open &&(
                <div className="fixed bottom-32 right-6 bg-white border shadow-lg rounded-lg p-4 w-64">
                    <h2 className="text-lg font-bold mb-2">Resumen de Venta</h2>
                    
                    <div className="max-h-40 overflow-y-auto text-sm">
                        {Array.isArray(ventas) && ventas.length > 0 ?(
                            ventas.map((v,i) => (
                                <div key={i} className="border-b py-1">
                                    <p>
                                     <strong>{v.numero}</strong> - Cant: {v.cantidad} -Precio: {v.precio} - Subtotal: ${v.subtotal}
                                    </p>
                                </div>
                            ))
                        ):(
                            <p className="text-gray-500">No hay boletos aun</p>
                        )}
                    </div>

                    <p className="text-xl font-semibold text-green-700 mt-2">
                        Total: ${total}
                    </p>

                    <div className="felx justify-between mt-4">
                        <button
                            onClick={resetVentas}
                            className="bg-red-500 text-white px-3 py-1 rounded hover>bg-red-600"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={()=> generarPDFTotalVenta(total,ventas)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                            Imprimir
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}