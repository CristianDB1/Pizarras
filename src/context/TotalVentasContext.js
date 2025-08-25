"use client";
import { createContext, useContext, useState } from "react";

const TotalVentaContext = createContext(); //Creamos el contexto de esta manera

//Aqui se crea un provider que es el que va a envolver la app
export const TotalVentaProvider = ({children}) => {  
    const [total, setTotal] = useState(0);

    //Creamos funciones de utilidad
    const addToTotal = (monto) => {
        setTotal((prev) => prev + monto);
    };

    const resetTotal = () => {
        setTotal(0);
    };

    return (
        <TotalVentaContext.Provider value={{total,addToTotal,resetTotal}}>
            {children}
        </TotalVentaContext.Provider>
    );
};

//Creamos un hook personalizado para usar el contecto mas facil
export const useTotalVenta = () => {
    return useContext(TotalVentaContext)
}