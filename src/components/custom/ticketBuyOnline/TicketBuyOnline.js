"use client"
import { PiNumberSquareOneFill } from "react-icons/pi";
import { PiNumberSquareTwoFill } from "react-icons/pi";
import { BsCalendarDateFill } from "react-icons/bs";
import { useEffect, useState } from "react";
import {
  ErrorPrizes,
  loading,
  ErrorTope,
  ValidateBox,
} from "../alerts/menu/Alerts";
import { useRouter } from "next/navigation";
import { FaHome, FaDice, FaForward } from "react-icons/fa";
import Swal from "sweetalert2";
import { TbSquarePlus } from "react-icons/tb";
import TicketPreviewModalOnline from "./TicketPreviewModalOnline";

const TicketBuyOnline = () => {
  const [prizes, setPrizes] = useState(null);
  const [topePermitido, setTopePermitido] = useState(0);
  const [ticketNumber, setTicketNumber] = useState("");
  const [foundTope, setFoundTope] = useState(null);
  const [prizebox, setPrizebox] = useState("");
  const [name, setName] = useState("");
  const [prizeboxError, setPrizeboxError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();
  const [cantidad, setCantidad] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [numberTop, setNumberTop] = useState(0);
  const [topes, setTopes] = useState({});
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);
  const [sorteos, setSorteos] = useState([]);
  const [selectedSorteo, setSelectedSorteo] = useState(null);
  const [avanceIndex, setAvanceIndex] = useState(0); 
  const [originalSorteo, setOriginalSorteo] = useState(null);
  const [tipoCompra, setTipoCompra] = useState("normal");
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;


  useEffect(() => {
    Promise.all([
      fetch("/api/ticketBuy")
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => setPrizes(data.result[0])),
    ]).catch((error) => console.error("Error:", error));
  }, []);

  // Obtener sorteos activos para avance
  useEffect(() => {
    fetch("/api/nextLotteries")
      .then((res) => res.json())
      .then((data) => {
        setSorteos(data.result || []);
        setSelectedSorteo((data.result && data.result[0]) || null);
        setOriginalSorteo((data.result && data.result[0]) || null);
      });
  }, []);

  const currentHour = new Date().getHours();

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

  const handleTicketNumberChange = async (e) => {
    let value = e.target.value;
    if (!/^[0-9]*$/.test(value)) {
      value = value.slice(0, -1);
    }
    setTicketNumber(value);

    //Asegurar de que el valor tenga una longitud de 3 caracteres
    value = value.padStart(3, "0");
  };

  //Usar selectedSorteo para la fecha y formattedFecha
  const fecha = selectedSorteo
    ? new Date(
        new Date(selectedSorteo.Fecha).getTime() +
          new Date().getTimezoneOffset() * 60000
      ).toLocaleDateString()
    : "";
  const [day, month, year] = fecha.split("/").map((num) => num.padStart(2, "0"));
  const formattedFecha = `${day}/${month}/${year}`;

  //Función para obtener un número aleatorio disponible
  const getRandomNumber = async () => {
    try {
      setIsGeneratingRandom(true);

      const response = await fetch("/api/topes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fecha: formattedFecha }),
      });

      const data = await response.json();

      if (data.success) {
        //Formatear el número para que tenga 3 dígitos con ceros a la izquierda
        const numeroFormateado = data.numero.toString().padStart(3, "0");
        setTicketNumber(numeroFormateado);

        //Establecer valores predeterminados
        setPrizebox("10");
        setName("Trébol de la Suerte");

        //Limpiar errores de validación del precio
        setPrizeboxError(null);

        //Simular evento de blur para cargar la información del tope
        const event = { target: { value: numeroFormateado } };
        handleBlur(event);

        //Mostrar mensaje de éxito
        Swal.fire({
          icon: "success",
          title: "Número aleatorio generado",
          text: `Número: ${numeroFormateado}\nDisponibles: ${data.disponibles} de ${data.tope}`,
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message || "No se pudo generar un número aleatorio",
        });
      }
    } catch (error) {
      console.error("Error al obtener número aleatorio:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al conectar con el servidor",
      });
    } finally {
      setIsGeneratingRandom(false);
    }
  };

  const handleBlur = async (e) => {
    let value = e.target.value;
    value = value.padStart(3, "0");
    setTicketNumber(value);

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ticketNumber: value, fecha: formattedFecha }),
    };

    try {
      const response = await fetch("/api/topes", options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data.tope)) {
        const matchingTope = data.tope.find(
          (tope) => tope.Numero === Number(value)
        );

        if (matchingTope) {
          setFoundTope(matchingTope.Tope); // Guarda el tope encontrado en el estado
          setCantidad(matchingTope.Cantidad);
          setNumberTop(matchingTope.Numero);
          setTopes((prevTopes) => ({
            ...prevTopes,
            [matchingTope.Numero]: matchingTope.Cantidad,
          }));
        } else {
          setFoundTope(null); // Si no se encuentra un tope, establece el estado a null
        }
      } else {
        setFoundTope(null);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  const idVendedor = userData.Idvendedor;
  const idSorteo = selectedSorteo?.Idsorteo;

  const Validate = () => {
    if (foundTope == 0) {
      if (cantidad >= foundTope) {
        Swal.fire(`No se pueden vender más boletos de este número`);
        setTicketNumber("");
        setPrizebox("");
        return false;
      }
    }

    if (prizeboxError) {
      ErrorPrizes();
      setPrizebox("");
      return false;
    }
    return true;
  };

  const enviarDatosNormal = async (e) => {
    e.preventDefault();
    if (tickets.length === 0 && (!prizebox || !name)) {
      ValidateBox();
      return;
    }

    if (!Validate()) {
      return;
    }

    if (!addTicketToList()) {
      return;
    }

    //Definimos tipoCompra como "normal"
    setTipoCompra("normal");
    setShowPreview(true);
  };

  const confirmVenta = async ({ telefono, metodoPago, bancoSeleccionado }) => {
    setIsLoading(true);

    try {
      let boletosPayload = [];

      if (tipoCompra === "serie") {
        // Compra en serie
        const numTickets = 10;
        const ticketNumbers = Array.from({ length: numTickets }, (_, i) => {
          let ticket = Number(ticketNumber) + 100 * i;
          if (ticket >= 1000) {
            ticket = ticket - 1000;
          }
          return ticket.toString().padStart(3, "0");
        });

        boletosPayload = ticketNumbers.map((tn) => ({
          idSorteo: selectedSorteo?.Idsorteo,
          ticketNumber: tn,
          prizebox: prizebox / 10, // precio unitario en serie
          name,
          tipoSorteo: selectedSorteo?.Tipo_sorteo,
          fecha: selectedSorteo?.Fecha,
          primerPremio: selectedSorteo?.Primerpremio,
          segundoPremio: selectedSorteo?.Segundopremio,
        }));
      } else {
        // Compra normal
        boletosPayload = tickets.map((t) => ({
          idSorteo: selectedSorteo?.Idsorteo,
          ticketNumber: t.numero,
          prizebox: t.precio,
          name: t.comprador,
          tipoSorteo: selectedSorteo?.Tipo_sorteo,
          fecha: selectedSorteo?.Fecha,
          primerPremio: selectedSorteo?.Primerpremio,
          segundoPremio: selectedSorteo?.Segundopremio,
        }));
      }

      const res = await fetch("/api/boletosOnline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boletos: boletosPayload,
          telefono,
          metodo_pago: metodoPago,
        }),
      });

      const data = await res.json();

      // Formatear la fecha (sin hora)
      const fechaFormateada = selectedSorteo?.Fecha
        ? new Date(selectedSorteo.Fecha).toISOString().split("T")[0]
        : "";

      if (res.ok && data.success) {
        const mensaje = encodeURIComponent(
          tipoCompra === "serie"
            ? `\u{1F39F}\uFE0F *Compra de Serie* \u{1F39F}\uFE0F\n\n` +
                `➡️ Serie: ${boletosPayload[0].ticketNumber} - ${
                  boletosPayload[boletosPayload.length - 1].ticketNumber
                }\n\u{1F4E6} Cantidad: ${boletosPayload.length} boletos\n\u{1F4B0} Total: $${prizebox}\n\u{1F464} Nombre: ${name}` +
                `\n\n\u{1F4C5} Sorteo: ${selectedSorteo?.Tipo_sorteo} - ${fechaFormateada}\n\u{1F4DE} Teléfono: ${telefono}\n\u{1F4B3} Método de pago: ${metodoPago}` +
                (metodoPago === "Banco" && bancoSeleccionado
                  ? `\n\u{1F3E6} Banco: ${bancoSeleccionado.Banco}\n\u{1F4B3} Cuenta: ${bancoSeleccionado.Cuenta}`
                  : "") +
                `\n\n\u{26A0}\uFE0F El siguiente paso es enviar foto del comprobante de pago por aquí.`
            : `\u{1F39F}\uFE0F *Compra de boletos online* \u{1F39F}\uFE0F\n\n` +
                boletosPayload
                  .map(
                    (b) =>
                      `➡️ Boleto: ${b.ticketNumber}\n\u{1F4B0} Precio: $${b.prizebox}\n\u{1F464} Nombre: ${b.name}`
                  )
                  .join("\n\n") +
                `\n\n\u{1F4C5} Sorteo: ${selectedSorteo?.Tipo_sorteo} - ${fechaFormateada}\n\u{1F4DE} Teléfono: ${telefono}\n\u{1F4B3} Método de pago: ${metodoPago}` +
                (metodoPago === "Banco" && bancoSeleccionado
                  ? `\n\u{1F3E6} Banco: ${bancoSeleccionado.Banco}\n\u{1F4B3} Cuenta: ${bancoSeleccionado.Cuenta}`
                  : "") +
                `\n\n\u{26A0}\uFE0F El siguiente paso es enviar foto del comprobante de pago por aquí.`
        );

        if (!whatsappNumber) {
          Swal.fire("⚠️ No se ha configurado el número de WhatsApp");
          return;
        }

        if (!mensaje) {
          Swal.fire("⚠️ No se pudo generar el mensaje");
          return;
        }

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          // En telefono abre la app de WhatsApp
          window.location.href = `whatsapp://send?phone=${whatsappNumber}&text=${mensaje}`;
        } else {
          // En PC abre WhatsApp Web
          window.open(`https://wa.me/${whatsappNumber}?text=${mensaje}`, "_blank");
        }

        Swal.fire({
          icon: "success",
          title: "Compra registrada",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        console.error("Respuesta backend:", data);
        Swal.fire("Error al guardar la compra online");
      }
    } catch (err) {
      console.error("Error confirmVenta:", err);
      Swal.fire("Error de conexión con el servidor");
    }

    // Reset
    setIsLoading(false);
    setTickets([]);
    setShowPreview(false);
    setTicketNumber("");
    setPrizebox("");
    setName("");
  };


  const enviarDatosSerie = async (e) => {
    e.preventDefault();
    if (!prizebox || !name) {
      ValidateBox();
      return;
    }

    if (parseInt(prizebox) < 100 || parseInt(prizebox) % 100 !== 0) {
      Swal.fire({
        icon: "error",
        title: "Monto inválido",
        text:
          "Para series, el monto debe ser mínimo 100 pesos y múltiplo de 100 (100, 200, ...900)",
      });
      return;
    }

    if (!Validate()) {
      return;
    }

    //Definimos tipoCompra como "serie"
    setTipoCompra("serie");
    setShowPreview(true);
  };

  const handlePrizeboxChange = (e) => {
    let value = e.target.value;
    setPrizebox(value);
    // Verifica si el valor es un múltiplo de 10
    if (value % 10 !== 0) {
      setPrizeboxError("El precio debe ser un múltiplo de 10");
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

  const addTicketToList = () => {
    if (!Validate()) {
      return false;
    }

    //Filtrar boletos con el mismo número de tope
    const boletosConMismoTope = tickets.filter((ticket) => {
      return parseInt(ticket.numero) === numberTop;
    });

    //Calcular la cantidad acumulada de boletos en la lista
    const totalAcumulado = boletosConMismoTope.reduce((acc, ticket) => {
      return acc + parseInt(ticket.precio);
    }, 0);
    const nuevaCantidad = totalAcumulado + cantidad + parseInt(prizebox);

    if (foundTope > 0) {
      if (nuevaCantidad > foundTope) {
        Swal.fire(
          `La cantidad permitida es ${(totalAcumulado + cantidad - foundTope) * -1
          }. Te estás pasando en ${nuevaCantidad - foundTope} pesos.`
        );
        setPrizebox("");
        return false;
      }
    } else if (foundTope === 0) {
      ErrorTope();
      setTicketNumber("");
      return false;
    }

    //Agregar el boleto actual a la lista de boletos acumulados
    if (ticketNumber && prizebox && name) {
      const precio = parseInt(prizebox);
      const nuevoTicket = {
        numero: ticketNumber,
        precio: precio,
        cantidad: 1,
        subtotal: precio,
        comprador: name,
      };

      //Actualizo la lista local
      setTickets((prevTickets) => [...prevTickets, nuevoTicket]);

      //Limpiar los inputs
      setTicketNumber("");
      setPrizebox("");
      return true;
    }
  };
  const handlePlusTicket = () => {
    if (addTicketToList()) {
      //console.log(tickets);
    }
  };
  const handleDeleteTicket = (index) => {
    setTickets((prevTickets) => prevTickets.filter((_, i) => i !== index));
  };

  const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  //Cambia el sorteo activo según el índice
  const handleSelectSorteoAvance = async () => {
    if (!sorteos.length) return;
    const inputOptions = sorteos.reduce((opts, s, idx) => {
      let label = s.Fecha;
      try {
        const fechaObj = new Date(s.Fecha);
        label = fechaObj.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } catch (e) {
        label = s.Fecha;
      }
      opts[idx] = label;
      return opts;
    }, {});

    let showRevert = avanceIndex !== 0;
    let html = showRevert
      ? '<button id="revertSorteo" class="swal2-confirm swal2-styled" style="margin-bottom:10px;background:#4b5563;">Revertir a sorteo original</button><br/>'
      : "";
    const { value: idx } = await Swal.fire({
      title: "Sorteo en avance",
      html: html + "<div id='selectSorteoAvance'></div>",
      input: "select",
      inputOptions,
      inputPlaceholder: "Selecciona el sorteo",
      showCancelButton: true,
      cancelButtonText: "Cancelar",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        if (showRevert) {
          document.getElementById("revertSorteo").onclick = () => {
            setSelectedSorteo(originalSorteo);
            setAvanceIndex(0);
            Swal.close();
            Swal.fire({ icon: "success", title: "Sorteo original restaurado", timer: 1200, showConfirmButton: false });
          };
        }
      },
    });
    if (idx !== undefined && idx !== null && idx !== "") {
      setSelectedSorteo(sorteos[idx]);
      setAvanceIndex(Number(idx));
      Swal.fire({ icon: "success", title: "Sorteo cambiado", timer: 1200, showConfirmButton: false });
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="max-w-sm mx-auto w-full bg-[rgb(38,38,38)]">
        <div className="text-2xl text-white flex justify-center items-center pb-4 pt-6 ">
          Boletos Online
        </div>
        <div className="w-full flex justify-center items-center flex-col space-y-1  relative">
          <label className="text-white text-xl flex justify-center items-center realative pr-8 ">
            <BsCalendarDateFill className="inline-block h-6 w-6 mr-1 text-red-600 " />{" "}
            Sorteo:{fecha}
          </label>
          <label className="text-white text-xl flex justify-center items-center relative">
            <PiNumberSquareOneFill className="text-red-600 inline-block h-6 w-6 mr-1" />
            Premio:{selectedSorteo?.Primerpremio}
          </label>
          <label className="text-white text-xl flex justify-center items-center  realative">
            <PiNumberSquareTwoFill className="inline-block h-6 w-6 mr-1 text-red-600" />{" "}
            Premio:{selectedSorteo?.Segundopremio}
          </label>
        </div>

        {foundTope !== null ? (
          <div className="text-xl text-red-500 text-center pt-6">
            Tope permitido: {foundTope - cantidad}
          </div>
        ) : (
          <div className="text-xl text-red-500 text-center pt-6"></div>
        )}

        <div className="flex mx-8 flex-col space-y-3 pt-6">
          {/* Fila de Boleto */}
          <div className="flex flex-row gap-12 relative">
            <div className="text-white flex justify-center items-center text-2xl w-[80px]">
              Boleto
            </div>
            <input
              className="bg-neutral-300 border rounded w-[150px] outline-none h-[40px] pl-10"
              value={ticketNumber}
              onChange={handleTicketNumberChange}
              onBlur={handleBlur}
              maxLength={3}
            />
            <button
              onClick={handlePlusTicket}
              className="absolute right-0 bg-green-700 text-white flex justify-center items-center rounded-lg h-[40px] w-[40px] text-4xl"
            >
              <TbSquarePlus />
            </button>
          </div>

          {/* Fila de Precio */}
          <div className="flex flex-row gap-12 relative">
            <div className="text-white flex justify-center items-center text-2xl w-[80px]">
              Precio
            </div>
            <input
              className="bg-neutral-300 border rounded w-[150px] outline-none h-[40px] pl-10"
              value={prizebox}
              onChange={(event) => {
                const value = event.target.value;
                if (!/^[0-9]*$/.test(value)) {
                  event.target.value = value.slice(0, -1);
                }
                handlePrizeboxChange(event);
              }}
              maxLength={4}
            />
          </div>

          {/* Fila de Nombre */}
          <div className="flex flex-row gap-12 relative">
            <div className="text-white flex justify-center items-center text-2xl w-[80px]">
              Nombre
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-neutral-300 border rounded w-[150px] outline-none h-[40px] pl-3"
            />
          </div>

          {/* Fila de botones Azar y Avance */}
          <div className="flex flex-row gap-4 justify-center items-center pt-2">
            <button
              onClick={getRandomNumber}
              disabled={isGeneratingRandom}
              className={`bg-blue-700 text-white flex flex-col justify-center items-center rounded-lg h-[56px] w-[56px] text-xl ${isGeneratingRandom ? "opacity-50 cursor-not-allowed" : ""}`}
              title="Generar número aleatorio"
            >
              <FaDice className={`${isGeneratingRandom ? "animate-spin" : ""} text-2xl`} />
              <span className="text-xs font-semibold mt-1">Azar</span>
            </button>
            <button
              onClick={handleSelectSorteoAvance}
              className="bg-gray-700 text-white flex flex-col justify-center items-center rounded-lg h-[56px] w-[56px] text-xl"
              title="Sorteo en avance"
            >
              <FaForward className="text-2xl" />
              <span className="text-xs font-semibold mt-1">Avance</span>
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center flex-col space-y-2 pt-4 px-8">
          <button
            type="button"
            onClick={enviarDatosNormal}
            className="w-full rounded-lg bg-red-700 text-white h-[60px] text-xl"
          >
            Normal
          </button>
          <button
            type="button"
            onClick={enviarDatosSerie}
            className="w-full rounded-lg bg-red-700 text-white h-[60px] text-xl"
          >
            Serie
          </button>
        </div>

      </div>
      <button
        onClick={goToMenu}
        className="fixed bottom-4 right-4 bg-red-700 text-white flex justify-center items-center rounded-full w-[60px] h-[60px] text-3xl"
      >
        <FaHome />
      </button>

      {showPreview && (
        <TicketPreviewModalOnline
          tickets={tickets}
          onClose={() => setShowPreview(false)}
          onConfirm={confirmVenta}
          onDelete={handleDeleteTicket}
        />
      )}
    </div>
  );
};

export default TicketBuyOnline;
