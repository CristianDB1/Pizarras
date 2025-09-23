'use client'
import { PiNumberSquareOneFill, PiNumberSquareTwoFill } from "react-icons/pi";
import { BsCalendarDateFill } from "react-icons/bs";
import { useEffect, useState } from "react";
import {
  ErrorPrizes,
  loading,
  ValidateBox,
} from "../alerts/menu/Alerts";
import { useRouter } from "next/navigation";
import { FaHome } from "react-icons/fa";
import Swal from "sweetalert2";
import EspecialPreviewModalOnline from "./EspecialPreviewModalOnline";
import EspecialBoletosDisponiblesModalOnline from "./EspecialBoletosDisponiblesModalOnline";

const TicketBuyEspecialOnline = ({ selectedDate }) => {
  const [prizes, setPrizes] = useState(selectedDate);
  const [ticketNumber, setTicketNumber] = useState("");
  const [foundTope, setFoundTope] = useState(null);
  const [prizebox, setPrizebox] = useState("");
  const [name, setName] = useState("");
  const [prizeboxError, setPrizeboxError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [boletos, setBoletos] = useState([]);
  const router = useRouter();
  const [previewModal, setPreviewModal] = useState(false);
  const [showDisponibles, setShowDisponibles] = useState(false);

  useEffect(() => {
    const ticket = localStorage.getItem("TickectEspecial");
    setPrizes(JSON.parse(ticket));

    fetch("/api/ticketBuy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => setBoletos(data.result));
  }, []);

  if (!prizes) {
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

  const handleTicketNumberChange = (e) => {
    let value = e.target.value;
    if (!/^[0-9]*$/.test(value)) {
      value = value.slice(0, -1);
    }
    setTicketNumber(value);

    const ticket = boletos.find((t) => t.Boleto === Number(value));
    if (ticket && ticket.fecha_sorteo === prizes.Fecha) {
      setFoundTope(true);
    } else {
      setFoundTope(null);
    }
  };

  const handleBlur = (e) => {
    let value = e.target.value;
    value = value.padStart(3, "0");
    setTicketNumber(value);
  };

  const idSorteo = prizes.Idsorteo;
  const tipoSorteo = prizes.Tipo_sorteo;
  const fecha = new Date(
    new Date(prizes.Fecha).getTime() + new Date().getTimezoneOffset() * 60000
  ).toLocaleDateString();

  const enviarDatosNormal = () => {
    if (!prizebox || !name) {
      ValidateBox();
      return;
    }
    if (foundTope !== null) {
      Swal.fire("Este boleto ya no está disponible");
      return;
    }
    if (prizeboxError) {
      ErrorPrizes();
      setPrizebox("");
      return;
    }
    setPreviewModal(true); // Abrir modal para confirmar teléfono y método de pago
  };

  const handlePrizeboxChange = (e) => {
    let value = e.target.value;
    if (!/^[0-9]*$/.test(value)) {
      value = value.slice(0, -1);
    }
    setPrizebox(value);

    if (value % 10 !== 0) {
      setPrizeboxError("El precio debe ser múltiplo de 10");
    } else {
      setPrizeboxError(null);
    }
  };

  if (isLoading) {
    loading();
  }

  const goToMenu = () => {
    router.push("/typeDrawOnline");
  };

  const confirmVenta = async ({ telefono, metodoPago, bancoSeleccionado }) => {
    setIsLoading(true);

    const boletoData = {
      idSorteo,
      ticketNumber,
      prizebox,
      name,
      tipoSorteo,
      fecha: prizes.Fecha,
      primerPremio: prizes.Primerpremio,
      segundoPremio: prizes.Segundopremio,
    };

    try {
      const res = await fetch("/api/boletosOnline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boletos: [boletoData],
          telefono,
          metodo_pago: metodoPago, 
        }),
      });

      const data = await res.json();

      if (data.error) {
        Swal.fire("❌ Error al registrar compra especial online");
      } else {
        // 📅 Formatear fecha (solo YYYY-MM-DD)
        const fechaCorta = new Date(prizes.Fecha).toISOString().split("T")[0];
        // 📲 Construir mensaje de WhatsApp
        const mensaje = encodeURIComponent(
          `\u{1F39F}\uFE0F *Compra Especial Online* \u{1F39F}\uFE0F\n\n` +
            `➡️ Boleto: ${ticketNumber}\n\u{1F4B0} Precio: $${prizebox}\n\u{1F464} Nombre: ${name}` +
            `\n\n\u{1F4C5} Sorteo Especial: ${fechaCorta}` +
            `\n\u{1F4DE} Teléfono: ${telefono}` +
            `\n\u{1F4B3} Método de pago: ${metodoPago}` +
            (metodoPago === "Banco" && bancoSeleccionado
              ? `\n\u{1F3E6} Banco: ${bancoSeleccionado.Banco}\n\u{1F4B3} Cuenta: ${bancoSeleccionado.Cuenta}\n\n⚠️ El siguiente paso es enviar foto del comprobante de pago por aquí.`
              : "")
        );

        const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          window.location.href = `whatsapp://send?phone=${whatsappNumber}&text=${mensaje}`;
        } else {
          window.open(
            `https://wa.me/${whatsappNumber}?text=${mensaje}`,
            "_blank"
          );
        }

        Swal.fire({
          icon: "success",
          title: "Compra registrada 🎉",
          text: "Revisa tu WhatsApp 📲",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("Error confirmVenta Especial Online:", err);
      Swal.fire("⚠️ Error de conexión con el servidor");
    }

    // 🔄 Reset
    setIsLoading(false);
    setPreviewModal(false);
    setTicketNumber("");
    setPrizebox("");
    setName("");
  };

  return (
    <div className="relative min-h-screen">
      <div className="max-w-sm mx-auto w-full bg-[rgb(38,38,38)]">
        <div className="text-2xl text-white flex justify-center items-center pb-4 pt-6">
          Boletos Especiales Online
        </div>
        <div className="w-full flex justify-center items-center flex-col space-y-1 relative">
          <label className="text-white text-xl flex items-center">
            <BsCalendarDateFill className="h-6 w-6 mr-1 text-red-600" /> Sorteo:
            {fecha}
          </label>
          <label className="text-white text-xl flex items-center">
            <PiNumberSquareOneFill className="text-red-600 h-6 w-6 mr-1" />
            Premio: {prizes.Primerpremio}
          </label>
          <label className="text-white text-xl flex items-center">
            <PiNumberSquareTwoFill className="text-red-600 h-6 w-6 mr-1" />
            Premio: {prizes.Segundopremio}
          </label>
        </div>

        {foundTope !== null ? (
          <div className="text-xl text-red-500 text-center pt-6">
            Boleto no disponible
          </div>
        ) : (
          <div className="text-xl text-green-500 text-center pt-6">
            Boleto disponible
          </div>
        )}

        <div className="flex justify-center items-center flex-col space-y-3 pt-6">
          <div className="flex flex-row gap-12">
            <div className="text-white flex items-center text-xl">Boleto</div>
            <input
              className="bg-neutral-300 border rounded w-[140px] outline-none h-9 pl-10"
              value={ticketNumber}
              onChange={handleTicketNumberChange}
              onBlur={handleBlur}
              maxLength={3}
            />
          </div>
          <div className="flex flex-row gap-12">
            <div className="text-white flex items-center text-xl">Precio</div>
            <input
              className="bg-neutral-300 border rounded w-[140px] outline-none h-9 pl-10"
              value={prizebox}
              onChange={handlePrizeboxChange}
              maxLength={4}
            />
          </div>
          <div className="flex flex-row gap-8">
            <div className="text-white flex items-center text-xl">Nombre</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-neutral-300 border rounded w-[140px] outline-none h-9 pl-5"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-3">
          <div className="flex justify-center items-center flex-col px-8">
            <button
              type="button"
              onClick={enviarDatosNormal}
              className="w-full rounded-lg bg-red-700 text-white h-[56px] text-xl"
            >
              Comprar
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-3">
          <div className="flex justify-center items-center flex-col px-8">
            <button
              onClick={() => setShowDisponibles(true)}
              className="w-full rounded-lg bg-red-700 text-white h-[56px] text-xl"
            >
              Boletos disponibles
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={goToMenu}
        className="fixed bottom-4 right-4 bg-red-700 text-3xl text-white flex justify-center items-center h-[56px] w-[56px] rounded-full"
      >
        <FaHome />
      </button>
        {showDisponibles && (
          <EspecialBoletosDisponiblesModalOnline
            tickets={boletos}
            onClose={() => setShowDisponibles(false)}
          />
        )}
      {previewModal && (
        <EspecialPreviewModalOnline
          onClose={() => setPreviewModal(false)}
          onConfirm={confirmVenta}
        />
      )}
    </div>
  );
};

export default TicketBuyEspecialOnline;
