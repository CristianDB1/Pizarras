// components/custom/compraOnline/CompraOnlineEspecial.js
'use client'
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaHome, FaDice } from "react-icons/fa";
import Swal from "sweetalert2";
import { ErrorPrizes, loading, ValidateBox } from "../alerts/menu/Alerts";
import EspecialPreviewModalOnline from "./EspecialPreviewModalOnline";
import EspecialBoletosDisponiblesModalOnline from "./EspecialBoletosDisponiblesModalOnline";

const CompraOnlineEspecial = ({ colegioId }) => {
  const [prizes, setPrizes] = useState(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [foundTope, setFoundTope] = useState(null);
  const [precioFijo, setPrecioFijo] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [boletosNormales, setBoletosNormales] = useState([]);
  const [boletosOnline, setBoletosOnline] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true); 
  const [previewModal, setPreviewModal] = useState(false);
  const [showDisponibles, setShowDisponibles] = useState(false);
  const router = useRouter();

  // Cargar datos del sorteo desde localStorage
   useEffect(() => {
    const cargarSorteo = () => {
      try {
        const sorteoGuardado = localStorage.getItem('sorteoSeleccionado');
        if (sorteoGuardado) {
          const sorteo = JSON.parse(sorteoGuardado);
          console.log("📦 Sorteo cargado:", sorteo.Idsorteo || sorteo.id_sorteo);
          setPrizes(sorteo);
          setPrecioFijo(sorteo.precio_boleto || sorteo.PrecioBoleto || sorteo.precio || "");
        } else {
          console.warn("⚠️ No hay sorteo en localStorage");
          Swal.fire("Error", "No se encontró el sorteo seleccionado", "error");
          router.push(colegioId ? `/online?colegio=${colegioId}` : "/online");
        }
      } catch (error) {
        console.error("Error cargando sorteo:", error);
        Swal.fire("Error", "Error al cargar el sorteo", "error");
      }
    };

    cargarSorteo();
  }, []);

  // 2. CARGAR BOLETOS CUANDO TENEMOS EL SORTEO
  const cargarBoletos = useCallback(async () => {
    if (!prizes) {
      console.log("⏳ Esperando sorteo...");
      return;
    }

    try {
      setCargandoDatos(true);
      const sorteoId = prizes.Idsorteo || prizes.id_sorteo;
      console.log("📡 Cargando boletos para sorteo:", sorteoId);

      // Cargar boletos NORMALES
      let urlBoletosNormales = `/api/boletos/sorteo/${sorteoId}`;
      if (colegioId) {
        urlBoletosNormales += `?colegio_id=${colegioId}`;
      }
      
      console.log("🔗 URL boletos normales:", urlBoletosNormales);
      const responseBoletos = await fetch(urlBoletosNormales);
      const dataBoletos = await responseBoletos.json();
      
      if (dataBoletos.success) {
        const numerosVendidos = dataBoletos.datos?.map(b => b.numero_boleto) || [];
        setBoletosNormales(numerosVendidos);
        console.log(`✅ ${numerosVendidos.length} boletos normales cargados`);
      } else {
        console.error("❌ Error boletos normales:", dataBoletos.error);
      }

      // Cargar boletos ONLINE
      let urlBoletosOnline = `/api/boletosOnline?id_sorteo=${sorteoId}`;
      if (colegioId) {
        urlBoletosOnline += `&colegio=${colegioId}`;
      }
      
      console.log("🔗 URL boletos online:", urlBoletosOnline);
      const responseOnline = await fetch(urlBoletosOnline);
      const dataOnline = await responseOnline.json();
      
      if (dataOnline.success) {
        const numerosOnline = dataOnline.boletos?.map(b => b.numero_boleto) || [];
        setBoletosOnline(numerosOnline);
        console.log(`✅ ${numerosOnline.length} boletos online cargados`);
      } else {
        console.error("❌ Error boletos online:", dataOnline.error);
      }

    } catch (error) {
      console.error("💥 Error cargando boletos:", error);
      Swal.fire("Error", "Error al cargar los boletos", "error");
    } finally {
      setCargandoDatos(false);
    }
  }, [prizes, colegioId]);

  // 3. Ejecutar carga de boletos cuando prizes esté listo
  useEffect(() => {
    if (prizes) {
      console.log("🎯 Iniciando carga de boletos...");
      cargarBoletos();
    }
  }, [prizes, cargarBoletos]);

  // Función para obtener un número aleatorio disponible
  const getRandomNumberEspecialOnline = async () => {
    try {
      setIsLoading(true);

      if (!prizes) {
        Swal.fire("Error", "No hay sorteo cargado", "error");
        return;
      }

      const sorteoId = prizes.Idsorteo || prizes.id_sorteo;
      
      // Obtener AMBAS listas
      let urlBoletosNormales = `/api/boletos/sorteo/${sorteoId}`;
      if (colegioId) {
        urlBoletosNormales += `?colegio_id=${colegioId}`;
      }
      
      let urlBoletosOnline = `/api/boletosOnline?id_sorteo=${sorteoId}`;
      if (colegioId) {
        urlBoletosOnline += `&colegio=${colegioId}`;
      }
      
      const [responseBoletos, responseOnline] = await Promise.all([
        fetch(urlBoletosNormales),
        fetch(urlBoletosOnline)
      ]);
      
      const dataBoletos = await responseBoletos.json();
      const dataOnline = await responseOnline.json();

      if (dataBoletos.success && dataOnline.success) {
        // Convertir a strings formateados a 3 dígitos
        const boletosNormalesVendidos = dataBoletos.datos?.map(b => 
          b.numero_boleto.toString().padStart(3, '0')
        ) || [];
        
        const boletosOnlineVendidos = dataOnline.boletos?.map(b => 
          b.numero_boleto.toString().padStart(3, '0')
        ) || [];
        
        const todosLosBoletosVendidos = [...boletosNormalesVendidos, ...boletosOnlineVendidos];
        
        console.log("🎲 Buscando número aleatorio. Vendidos total:", todosLosBoletosVendidos);

        // Generar número aleatorio formateado
        let numeroAleatorio;
        let intentos = 0;
        const maxIntentos = 1000;

        do {
          const num = Math.floor(Math.random() * 1000);
          numeroAleatorio = num.toString().padStart(3, '0');
          intentos++;
        } while (todosLosBoletosVendidos.includes(numeroAleatorio) && intentos < maxIntentos);

        if (intentos >= maxIntentos) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se encontraron números disponibles'
          });
          return;
        }

        setTicketNumber(numeroAleatorio);
        setName("Trébol de la Suerte");
        setFoundTope(null);

        Swal.fire({
          icon: 'success',
          title: 'Número aleatorio generado',
          text: `Número: ${numeroAleatorio}`,
          timer: 1500,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error("Error al obtener número aleatorio online:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al conectar con el servidor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Validar disponibilidad del boleto (chequear AMBAS tablas)
  // Modificar la función handleTicketNumberChange
const handleTicketNumberChange = (e) => {
  let value = e.target.value;
  
  // Solo números, máximo 3 dígitos
  if (!/^[0-9]*$/.test(value)) {
    value = value.slice(0, -1);
  }
  
  // Limitar a 3 dígitos
  if (value.length > 3) {
    value = value.substring(0, 3);
  }
  
  setTicketNumber(value);

  if (!value || value.length < 3) {
    setFoundTope(null);
    return;
  }

  // Formatear el boleto buscado a 3 dígitos (con ceros a la izquierda)
  const boletoBuscado = value.padStart(3, '0');
  
  // Convertir las listas de boletos a strings formateados a 3 dígitos
  const boletosNormalesFormateados = boletosNormales.map(num => 
    num.toString().padStart(3, '0')
  );
  
  const boletosOnlineFormateados = boletosOnline.map(num => 
    num.toString().padStart(3, '0')
  );
  
  console.log("🔍 Validando boleto:", {
    boletoBuscado,
    enNormales: boletosNormalesFormateados.includes(boletoBuscado),
    enOnline: boletosOnlineFormateados.includes(boletoBuscado),
    listaNormales: boletosNormalesFormateados,
    listaOnline: boletosOnlineFormateados
  });
  
  const enNormales = boletosNormalesFormateados.includes(boletoBuscado);
  const enOnline = boletosOnlineFormateados.includes(boletoBuscado);
  
  if (enNormales || enOnline) {
    console.log(`❌ Boleto ${boletoBuscado} NO disponible`);
    setFoundTope(true);
  } else {
    console.log(`✅ Boleto ${boletoBuscado} DISPONIBLE`);
    setFoundTope(null);
  }
};

  const handleBlur = (e) => {
  let value = e.target.value;
  // Siempre formatear a 3 dígitos
  value = value.padStart(3, "0");
  setTicketNumber(value);
  
  // Re-evaluar disponibilidad después de formatear
  if (value.length === 3) {
    const boletoBuscado = value;
    const boletosNormalesFormateados = boletosNormales.map(num => 
      num.toString().padStart(3, '0')
    );
    const boletosOnlineFormateados = boletosOnline.map(num => 
      num.toString().padStart(3, '0')
    );
    
    const enNormales = boletosNormalesFormateados.includes(boletoBuscado);
    const enOnline = boletosOnlineFormateados.includes(boletoBuscado);
    
    setFoundTope(enNormales || enOnline ? true : null);
  }
};
  const enviarDatosNormal = () => {
    if (!precioFijo) {
      Swal.fire("Error", "No se pudo obtener el precio del boleto", "error");
      return;
    }
    
    if (!name || name.trim() === "") {
      ValidateBox();
      return;
    }
    
    if (foundTope !== null) {
      Swal.fire("Este boleto ya no está disponible");
      return;
    }
    
    setPreviewModal(true);
  };

  const confirmVenta = async ({ telefono, metodoPago, bancoSeleccionado }) => {
    setIsLoading(true);

    const boletoData = {
      idSorteo: prizes.Idsorteo || prizes.id_sorteo,
      ticketNumber,
      precio: precioFijo, 
      nombre: name,
      fecha: prizes.Fecha || prizes.fecha,
      primerPremio: prizes.Primerpremio || prizes.primer_premio,
      segundoPremio: prizes.Segundopremio || prizes.segundo_premio,
      colegioId: colegioId || null,
      numeroSorteo: prizes.numero_sorteo
    };

    try {
      const res = await fetch("/api/boletosOnline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boletos: [boletoData],
          telefono,
          metodo_pago: metodoPago,
          colegioId: colegioId || null
        }),
      });

      const data = await res.json();

      if (data.error) {
        Swal.fire("❌ Error", "Error al registrar la compra", "error");
      } else {
        // Mensaje de WhatsApp
        const fechaCorta = new Date(prizes.Fecha || prizes.fecha).toISOString().split("T")[0];
        const mensaje = encodeURIComponent(
            `\u{1F39F}\uFE0F *Compra Boleto Online* \u{1F39F}\uFE0F\n\n` +
            `➡️ Boleto: ${ticketNumber}\n\u{1F4B0} Precio: $${precioFijo}\n\u{1F464} Nombre: ${name}` +
            `\n\n\u{1F4C5} Sorteo: ${fechaCorta}` +
            `\n\u{1F4DE} Teléfono: ${telefono}` +
            `\n\u{1F4B3} Método de pago: ${metodoPago}` +
            (metodoPago === "Banco" && bancoSeleccionado
                ? `\n\u{1F3E6} Banco: ${bancoSeleccionado.Banco}\n\u{1F4B3} Cuenta: ${bancoSeleccionado.Cuenta}`
                : "") +
            `\n\n\u{26A0}\uFE0F El siguiente paso es enviar foto del comprobante de pago por aquí.`
        );

        const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          window.location.href = `whatsapp://send?phone=${whatsappNumber}&text=${mensaje}`;
        } else {
          window.open(`https://wa.me/${whatsappNumber}?text=${mensaje}`, "_blank");
        }

        // Recargar listas de boletos después de la compra
        try {
          // Recargar boletos normales
          let urlBoletosNormales = `/api/boletos/sorteo/${prizes.Idsorteo || prizes.id_sorteo}`;
          if (colegioId) {
            urlBoletosNormales += `?colegio_id=${colegioId}`;
          }
          
          const responseBoletos = await fetch(urlBoletosNormales);
          const dataBoletos = await responseBoletos.json();
          
          if (dataBoletos.success) {
            const boletosVendidos = dataBoletos.datos?.map(b => b.numero_boleto) || [];
            setBoletosNormales(boletosVendidos);
          }

          // Recargar boletos online
          const fechaFormateada = (prizes.Fecha || prizes.fecha).split('T')[0];
          let urlBoletosOnline = `/api/boletosOnline?fecha=${fechaFormateada}`;
          if (colegioId) {
            urlBoletosOnline += `&colegio=${colegioId}`;
          }
          
          const responseOnline = await fetch(urlBoletosOnline);
          const dataOnline = await responseOnline.json();
          
          if (dataOnline.success) {
            const boletosOnlineVendidos = dataOnline.boletos?.map(b => b.numero_boleto) || [];
            setBoletosOnline(boletosOnlineVendidos);
          }
        } catch (error) {
          console.error("Error recargando datos:", error);
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
      Swal.fire("⚠️ Error", "Error de conexión con el servidor", "error");
    }

    setIsLoading(false);
    setPreviewModal(false);
    setTicketNumber("");
    setName("");
  };

  const goToMenu = () => {
    if (colegioId) {
      router.push(`/online?colegio=${colegioId}`);
    } else {
      router.push("/online");
    }
  };

  // Loading state
  if (!prizes || cargandoDatos) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="relative w-32 h-32 mb-4">
          <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-600"></div>
          <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
            <span className="text-purple-600 font-semibold">Cargando...</span>
          </div>
        </div>
        <p className="text-gray-600">
          {!prizes ? "Cargando sorteo..." : "Cargando boletos disponibles..."}
        </p>
        {prizes && (
          <p className="text-sm text-gray-500 mt-2">
            Sorteo: {prizes.Idsorteo || prizes.id_sorteo}
          </p>
        )}
      </div>
    );
  }

  // Formatear fecha para mostrar
  const fechaFormateada = prizes
    ? new Date(prizes.Fecha || prizes.fecha).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : "";

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-purple-800">Compra de Boletos Online</h1>
            <div className="flex items-center gap-4 mt-2">
              {colegioId && (
                <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
                  Colegio ID: {colegioId}
                </span>
              )}
              <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full">
                Sorteo: {prizes.Idsorteo || prizes.id_sorteo}
              </span>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full">
                Boletos cargados: {boletosNormales.length + boletosOnline.length}
              </span>
            </div>
          </div>
          <button
            onClick={goToMenu}
            className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition duration-200"
            title="Volver al menú"
          >
            <FaHome size={24} />
          </button>
        </div>
        
        {/* Información del sorteo */}
        {prizes && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="font-semibold text-purple-700">SORTEO</div>
              <div className="text-lg font-bold">{fechaFormateada}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="font-semibold text-green-700">1er PREMIO</div>
              <div className="text-lg font-bold">${prizes.Primerpremio || prizes.primer_premio}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="font-semibold text-orange-700">2do PREMIO</div>
              <div className="text-lg font-bold">${prizes.Segundopremio || prizes.segundo_premio}</div>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de compra */}
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 text-center text-purple-700">
          Seleccionar Boleto
        </h2>
        
        {/* Estado de disponibilidad */}
        <div className="mb-6 text-center">
          {foundTope !== null ? (
            <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
              ⚠️ Boleto no disponible
            </div>
          ) : ticketNumber ? (
            <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded-lg">
              ✅ Boleto disponible
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded-lg">
              🔍 Ingresa un número de boleto
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          {/* Número de boleto */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número del Boleto (3 dígitos)
            </label>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={ticketNumber}
                  onChange={handleTicketNumberChange}
                  onBlur={handleBlur}
                  maxLength={3}
                  className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg text-center text-xl sm:text-2xl font-bold focus:border-blue-500 focus:outline-none"
                  placeholder="000"
                  // Añadir patrón para mejor experiencia móvil
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              
              <div className="hidden sm:flex gap-2">
                <button
                  onClick={getRandomNumberEspecialOnline}
                  disabled={isLoading}
                  className={`bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition duration-200 flex flex-col items-center justify-center ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title="Generar número aleatorio"
                >
                  <FaDice className={`${isLoading ? "animate-spin" : ""} text-xl`} />
                  <span className="text-xs mt-1">Azar</span>
                </button>
              </div>
            </div>

            <div className="sm:hidden flex justify-center">
              <button
                onClick={getRandomNumberEspecialOnline}
                disabled={isLoading}
                className={`bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition duration-200 flex items-center gap-2 ${
                  isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <FaDice className={`${isLoading ? "animate-spin" : ""}`} />
                <span>Generar Número Aleatorio</span>
              </button>
            </div>
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio ($)
            </label>
            <input
              type="text"
              value={precioFijo ? `$${precioFijo}` : "Cargando..."}
              readOnly
              disabled
              className="w-full p-4 border border-gray-300 rounded-lg bg-gray-100 text-center font-bold focus:outline-none"
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del jugador
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              placeholder="Ingresa tu nombre completo"
            />
          </div>

          {/* Botones */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => setShowDisponibles(true)}
              className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold"
            >
              Ver Disponibles
            </button>
            <button
              onClick={enviarDatosNormal}
              disabled={!ticketNumber || !name || foundTope}
              className={`bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition duration-200 font-semibold ${
                (!ticketNumber || !name || foundTope) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Comprar Boleto
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showDisponibles && (
        <EspecialBoletosDisponiblesModalOnline
          tickets={{
            boletosNormal: boletosNormales, 
            boletosOnline: boletosOnline     
          }}
          colegioId={colegioId} 
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

export default CompraOnlineEspecial;