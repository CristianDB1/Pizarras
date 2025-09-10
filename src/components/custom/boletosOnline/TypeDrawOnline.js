"use client";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function TypeDrawOnline() {
  const router = useRouter();

  const handleHoy = () => {
    // Lleva a la página donde el cliente puede elegir números (público)
    router.push("/ticketBuyOnline");
  };

  const handleEspecial = () => {
    // Por ahora mostramos mensaje (lo activamos luego)
    Swal.fire("Pendiente", "La venta especial estará disponible pronto.", "info");
  };

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
          onClick={handleEspecial}
          className="w-full rounded h-[56px] bg-red-700 text-white text-xl"
        >
          Especial
        </button>
      </div>
    </div>
  );
}
