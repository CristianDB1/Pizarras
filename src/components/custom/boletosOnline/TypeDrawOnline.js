"use client";
import { useRouter } from "next/navigation";
import { FaHome } from "react-icons/fa"
import Swal from "sweetalert2";

export default function TypeDrawOnline() {
  const router = useRouter();

  const handleHoy = () => {
    router.push("/ticketBuyOnline");
  };

  const handleEspecialOnline = () => {
    Swal.fire("Pendiente", "La venta especial estará disponible pronto.", "info");
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
