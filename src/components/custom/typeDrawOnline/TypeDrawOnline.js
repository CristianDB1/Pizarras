'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaHome } from "react-icons/fa";
import { selectDate } from "../alerts/menu/Alerts";
import Swal from "sweetalert2";

export default function TypeDrawOnline() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(null);

  const handleHoy = () => {
    router.push("/ticketBuyOnline");
  };

  const handleEspecialOnline = () => {
    fetch('/api/ticketBuy', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(response => response.json())
                .then(async data => {
                    const selectedPrize = await selectDate(data.result);
                    localStorage.setItem('TickectEspecial', JSON.stringify(selectedPrize));
    
                    setSelectedDate(selectedPrize);
                    if (selectedPrize) {
                        // Redirigir al usuario a la ruta ticketBuyOnlineEspecial con la fecha seleccionada
                        // Aquí se asume que quieres pasar la fecha seleccionada como un parámetro de consulta
                        router.push(`/ticketBuyEspecialOnline`);
                    } else {
                        // Manejar el caso en que el usuario cancela la selección (si es necesario)
                        console.log('Selección de fecha cancelada');
                    }
                })
  };

  const goToMenuOnline = () => {
    router.push("/menuOnline")
  }

  return (
    <div className="max-w-sm w-full">
      <h1 className="text-center text-2xl text-white mb-6">Tipo de sorteo</h1>
      <div className="space-y-4">
        <button
          onClick={handleHoy}
          className="w-full rounded h-[56px] bg-red-700 text-white text-xl"
        >
          Hoy
        </button>
        <button
          onClick={handleEspecialOnline}
          className="w-full rounded h-[56px] bg-red-700 text-white text-xl"
        >
          Especial
        </button>
      </div>
      <button
        onClick={goToMenuOnline}
        className="fixed bottom-4 right-4 bg-red-700 text-white flex justify-center items-center rounded-full w-[70px] h-[70px] text-3xl">
          <FaHome/>
      </button>
    </div>
  );
}
