"use client";
import { useState } from "react";
import Swal from "sweetalert2";

export default function TicketBuyOnline() {
  const [ticketNumber, setTicketNumber] = useState("");
  const [precio, setPrecio] = useState("");
  const [nombre, setNombre] = useState("");
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  //El numero solo de 3 cifras
  const handleTicketChange = (v) => {
    const s = v.replace(/\D/g, "").slice(0, 3);
    setTicketNumber(s);
  };

  const addTicket = () => {
    if (!ticketNumber || !precio || !nombre) {
      Swal.fire("Faltan datos", "Completa número, precio y nombre", "warning");
      return;
    }
    const t = {
      ticketNumber: ticketNumber.padStart(3, "0"),
      prizebox: Number(precio),
      name: nombre,
    };
    setTickets((p) => [...p, t]);
    setTicketNumber("");
    setPrecio("");
  };

  const removeTicket = (i) => {
    setTickets((p) => p.filter((_, idx) => idx !== i));
  };

  const confirmCompra = async () => {
    if (tickets.length === 0) {
      Swal.fire("Sin boletos", "Agrega al menos un boleto", "info");
      return;
    }
    setIsLoading(true);
    try {
      //Como es la primera version vamos a utilizar idsorteo 1, solo de momento
      const fecha = new Date().toISOString();
      const payload = {
        boletos: tickets.map((t) => ({
          ticketNumber: t.ticketNumber,
          prizebox: t.prizebox,
          name: t.name,
          idSorteo: 1,
          tipoSorteo: "normal",
          fecha,
          primerPremio: "",
          segundoPremio: ""
        }))
      };

      const res = await fetch("/api/boletosOnline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al guardar la compra");
      }

      //Generar mensaje de WhatsApp
      const phone = (process?.env?.NEXT_PUBLIC_WHATSAPP_NUMBER || "521234567890").replace(/\D/g, "");
      let mensaje = `Compra de boletos\nCliente: ${nombre}\n\n`;
      tickets.forEach((t, i) => {
        mensaje += `${i + 1}. Boleto: ${t.ticketNumber} — $${t.prizebox}\n`;
      });
      const total = tickets.reduce((s, x) => s + Number(x.prizebox || 0), 0);
      mensaje += `\nTotal: $${total}\n\nMétodos de pago:\n- Transferencia\n- Tarjeta\n\nGracias por tu compra.`;

      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;

      await Swal.fire({
        icon: "success",
        title: "Compra registrada",
        text: "Se abrirá WhatsApp para completar el pago",
        confirmButtonText: "Abrir WhatsApp"
      });

      window.open(waUrl, "_blank");
      setTickets([]);
      setNombre("");
    } catch (err) {
      console.error("Error confirmCompra:", err);
      Swal.fire("Error", err.message || "Ocurrió un error", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-sm w-full bg-[rgb(38,38,38)] p-6 rounded">
      <h2 className="text-xl font-bold text-white mb-4 text-center">Comprar boletos (público)</h2>

      <div className="space-y-3">
        <input
          value={ticketNumber}
          onChange={(e) => handleTicketChange(e.target.value)}
          placeholder="Número (3 cifras)"
          className="w-full p-2 rounded"
        />
        <input
          value={precio}
          onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
          placeholder="Precio"
          className="w-full p-2 rounded"
        />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
          className="w-full p-2 rounded"
        />

        <div className="flex gap-2">
          <button onClick={addTicket} className="flex-1 bg-green-600 text-white p-2 rounded">
            Añadir
          </button>
          <button onClick={() => { setTickets([]); setTicketNumber(""); setPrecio(""); }} className="flex-1 bg-gray-500 text-white p-2 rounded">
            Limpiar
          </button>
        </div>
      </div>

      {tickets.length > 0 && (
        <div className="mt-4 bg-white rounded p-3 text-black">
          <h3 className="font-semibold mb-2">Boletos seleccionados</h3>
          <ul className="space-y-1 text-sm">
            {tickets.map((t, i) => (
              <li key={i} className="flex justify-between items-center">
                <span>{t.ticketNumber} — ${t.prizebox}</span>
                <button onClick={() => removeTicket(i)} className="text-red-600">Eliminar</button>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <button onClick={confirmCompra} disabled={isLoading} className="w-full bg-blue-600 text-white p-2 rounded">
              {isLoading ? "Procesando..." : "Confirmar compra"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
