"use client"
import { useState } from "react";
import { useTotalVenta } from "@/context/TotalVentasContext";

export default function TotalVentasModal(){
    const {total, resetTotal} = useTotalVenta();
    const [open, setOpen] = useState(false);

    const handlePrint = () => {
        //Voy a dejar aqui el espacio de momento para despues conectarlo con el PDF
        window.print();
    };

    return(
        <div>
            {/*Boton flotante para abrir y cerrar el modal*/}
            <button
                className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700"
                onClick={()=>setOpen(!open)}
            >
                {open ? "Cerrar Total" : "Ver Total"} 
            </button>
            {/*Modal*/}
            {open &&(
                <div className="fixed bottom-20 right-6 bg-white border shadow-lg rounded-lg p-4 w-64">
                    <h2 className="text-lg dont -bold mb-2">Total Venta</h2>
                    <p className="text-xl font-semibold text-green-700">${total}</p>

                    <div className="felx justify-between mt-4">
                        <button
                            onClick={resetTotal}
                            className="bg-red-500 text-white px-3 py-1 rounded hover>bg-red-600"
                        >
                            Limpiar
                        </button>
                        <button
                            onClick={handlePrint}
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