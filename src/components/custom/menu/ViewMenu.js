// src/components/custom/menu/ViewMenu.js (MODIFICADO)
'use client'
import { IoTicketSharp } from "react-icons/io5";
import { ImStatsDots } from "react-icons/im";
import { FaCashRegister} from "react-icons/fa";
import { RiLogoutBoxFill } from "react-icons/ri";
import useSession from "@/hook/useSession";
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react";
import { GiPodiumWinner } from "react-icons/gi";
import { FaLeaf } from "react-icons/fa";

const ViewMenu = () => {
    const router = useRouter();
    const { logout } = useSession();
    const [userData, setUserData] = useState(null);
    const [cerrarSession, setCerrarSession] = useState(false);

    useEffect(() => {
        // Obtener datos del usuario desde localStorage
        if (typeof window !== 'undefined') {
            const data = JSON.parse(localStorage.getItem('userData'));
            setUserData(data);
        }
    }, []);

    const session = () => {
        setCerrarSession(true);
    };

    useEffect(() => {
        if (cerrarSession) {
            logout();
            window.location.href = '/';
        }
    }, [cerrarSession, logout]);

    // Navegación según el componente existente
    const handleTypeDraw = () => {
        router.push('/typeDraw')
    }

    const handleboxCut = () => {
        if (userData && (userData.rol === 'staff' || userData.rol === 'vendedor')) {
            router.push('boxCutLotery');
        } else {
            router.push('/loginAdmin')
        }
    }

    const handleWinnerSraffle = () => {
        router.push('/winnerSraffle');
    }

    const handleWinnigTicket = () => {
        router.push('/winningTicket')
    }

    // Determinar qué mostrar según rol
    const isStaff = userData && userData.rol === 'staff';
    const isVendedor = userData && userData.rol === 'vendedor';

    if (!userData) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="relative w-32 h-32">
                    <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-500"></div>
                    <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
                        <span className="text-white text-sm">Cargando...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full bg-[rgb(38,38,38)]">
            <div className="w-full flex flex-col items-center text-center pt-6 pb-2">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
                    TU SORTEO
                </h1>
                <p className="text-gray-300 text-sm mt-1">Sistema de Gestión</p>
            </div>
            
            <div className="w-full flex justify-center items-center flex-col space-y-1 pb-4">
                <label className="text-white text-xl">Vendedor: {userData.Nombre || userData.nombre}</label>
                <label className="text-white text-xl">
                    {isStaff ? "Rol: Staff" : isVendedor ? "Rol: Vendedor" : "Rol: No definido"}
                </label>
                {userData.colegio_id && (
                    <label className="text-white text-sm">Colegio ID: {userData.colegio_id}</label>
                )}
            </div>

            {userData.mensaje && (
                <div className="flex justify-center items-center px-8 mb-4">
                    <div className="flex justify-center items-center text-lg text-white bg-green-700 p-4 rounded-xl">
                        {userData.mensaje}
                    </div>
                </div>
            )}

            <div className="w-full flex flex-col space-y-6 pt-6 px-10">
                {/* BOTÓN DE BOLETOS - Visible para ambos roles */}
                <div className="relative">
                    <button 
                        className="w-full rounded-lg bg-red-700 text-white text-2xl h-[66px] relative hover:bg-red-800 transition-colors"
                        onClick={handleTypeDraw}
                    >
                        Boletos
                        <IoTicketSharp className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10" />
                    </button>
                </div>

                {/* BOTÓN DE RESULTADOS - Solo para staff */}
                {isStaff && (
                    <div className="relative">
                        <button
                            onClick={handleWinnerSraffle}
                            className="w-full rounded-lg bg-red-700 text-white text-2xl h-[66px] relative hover:bg-red-800 transition-colors"
                        >
                            Resultados
                            <ImStatsDots className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10" />
                        </button>
                    </div>
                )}

                {/* BOTÓN DE CORTE DE CAJA - Visible para ambos roles */}
                <div className="relative">
                    <button
                        onClick={handleboxCut}
                        className="w-full rounded-lg bg-red-700 text-white text-2xl h-[66px] relative hover:bg-red-800 transition-colors"
                    >
                        Corte de caja
                        <FaCashRegister className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10" />
                    </button>
                </div>

                {/* BOTÓN DE BOLETOS GANADORES - Solo para staff */}
                {isStaff && (
                    <div className="relative">
                        <button
                            onClick={handleWinnigTicket}
                            className="w-full rounded-lg bg-red-700 text-white text-2xl h-[66px] relative hover:bg-red-800 transition-colors"
                        >
                            Boletos ganadores
                            <GiPodiumWinner className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10" />
                        </button>
                    </div>
                )}

                {/* BOTÓN DE CERRAR SESIÓN - Visible para ambos roles */}
                <div className="relative">
                    <button 
                        className="w-full rounded-lg bg-red-700 text-white text-2xl h-[66px] relative hover:bg-red-800 transition-colors"
                        onClick={session}
                    >
                        Cerrar sesión
                        <RiLogoutBoxFill className="absolute left-3 top-1/2 transform -translate-y-1/2 h-10" />
                    </button>
                </div>
            </div>

            {/* Puntos - Visible para ambos roles */}
            <div className="fixed bottom-4 right-4 bg-green-700 flex items-center justify-center text-white h-[60px] w-[160px] rounded-full">
                <div className="flex flex-row">
                    Puntos: {userData.Puntos || 0}
                </div>
            </div>
        </div>
    );
}

export default ViewMenu;