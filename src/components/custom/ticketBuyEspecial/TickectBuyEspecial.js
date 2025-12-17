"use client";
import { PiNumberSquareOneFill } from "react-icons/pi";
import { PiNumberSquareTwoFill } from "react-icons/pi";
import { BsCalendarDateFill } from "react-icons/bs";
import { useEffect, useState, useCallback } from "react";
import generatePDF from "../tickectBuy/pdf";
import {
  ErrorPrizes,
  loading,
  ValidateBox,
  Especial,
} from "../alerts/menu/Alerts";
import { useRouter } from "next/navigation";
import { FaHome, FaDice, FaSchool } from "react-icons/fa";
import EspecialPreviewModal from "./EspecialPreviewModal";
import VailidationEstatus from "@/hook/validationEstatus";
import updateInfo from "../validation/updateInfo";
import Swal from "sweetalert2";
import { useTotalVenta } from "@/context/TotalVentasContext";

const TickectBuyEspecial = () => {
  const [prizes, setPrizes] = useState(null);
  const [ticketNumber, setTicketNumber] = useState("");
  const [foundTope, setFoundTope] = useState(null);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [boletosVendidos, setBoletosVendidos] = useState([]);
  const router = useRouter();
  const [previewModal, setPreviewModal] = useState(false);
  const [precioFijo, setPrecioFijo] = useState("");
  const {addVenta} = useTotalVenta();
  const [sorteoData, setSorteoData] = useState(null);
  const [colegioId, setColegioId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [colegioInfo, setColegioInfo] = useState(null);
  const [loadingColegio, setLoadingColegio] = useState(false);

  useEffect(() => {
    //console.log('🎯 TickectBuyEspecial montado');
    
    // Obtener datos del sorteo desde localStorage
    const ticket = localStorage.getItem("TickectEspecial");
    
    if (!ticket) {
      console.error('❌ No hay datos en localStorage');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se encontró información del sorteo. Vuelve a seleccionar un sorteo.'
      }).then(() => {
        router.push('/typedraw');
      });
      return;
    }

    try {
      const parsedTicket = JSON.parse(ticket);
      //console.log('✅ Datos del sorteo cargados:', parsedTicket);
      
      // Verificar que el sorteo esté activo
      if (parsedTicket.estatus !== 'activo') {
        Swal.fire({
          icon: 'warning',
          title: 'Sorteo no disponible',
          text: 'Este sorteo no está activo para venta'
        }).then(() => {
          router.push('/typedraw');
        });
        return;
      }
      
      setPrizes(parsedTicket);
      setSorteoData(parsedTicket);
      
      // Obtener datos del usuario
      const storedUserData = JSON.parse(localStorage.getItem("userData"));
      //console.log('👤 Datos de usuario:', storedUserData);
      setUserData(storedUserData);
      
      if (storedUserData && storedUserData.colegio_id) {
        setColegioId(storedUserData.colegio_id);
        
        // Cargar información del colegio
        cargarInformacionColegio(storedUserData.colegio_id);
      }

      // Establecer precio fijo desde datos del sorteo
      if (parsedTicket.precio_boleto) {
        //console.log('💰 Precio del boleto:', parsedTicket.precio_boleto);
        setPrecioFijo(parsedTicket.precio_boleto);
      } else {
        //console.log('⚠️ No hay precio, cargando desde API alternativa');
        fetch(`/api/leyenda3?t=${Date.now()}`)
          .then((res) => res.json())
          .then((data) => {
            console.log('💰 Precio desde API:', data.precioBoleto);
            setPrecioFijo(data.precioBoleto);
          })
          .catch(error => {
            console.error("Error cargando precio fijo:", error);
          });
      }

      // Cargar boletos vendidos
      const sorteoId = parsedTicket.Idsorteo || parsedTicket.id_sorteo;
      if (sorteoId) {
        //console.log('📥 Cargando boletos vendidos para sorteo:', sorteoId);
        fetchBoletosVendidos(sorteoId);
      }
      
    } catch (error) {
      console.error('❌ Error parsing sorteo data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar datos del sorteo'
      }).then(() => {
        router.push('/typedraw');
      });
    }
  }, [router]);

  // Función para cargar información del colegio
  const cargarInformacionColegio = async (colegioId) => {
    try {
      setLoadingColegio(true);
      //console.log('🏫 Cargando información del colegio ID:', colegioId);
      
      const response = await fetch(`/api/colegios/${colegioId}`);
      
      if (!response.ok) {
        console.error(`❌ Error ${response.status} cargando colegio`);
        return;
      }
      
      const data = await response.json();
      //console.log('🏫 Datos del colegio cargados:', data);
      
      if (data && !data.error) {
        setColegioInfo(data);
      }
    } catch (error) {
      console.error('❌ Error cargando información del colegio:', error);
    } finally {
      setLoadingColegio(false);
    }
  };

  // Agrega al principio del useEffect o en un useEffect separado
  useEffect(() => {
      /*console.log('🔍 DEBUG - localStorage completo:');
      console.log('🔍 TickectEspecial:', localStorage.getItem("TickectEspecial"));*/
      
      const userDataStr = localStorage.getItem("userData");
      //console.log('🔍 userData raw:', userDataStr);
      
      if (userDataStr) {
          try {
              const userDataParsed = JSON.parse(userDataStr);
              /*console.log('🔍 userData parsed:', userDataParsed);
              console.log('🔍 Todas las claves de userData:', Object.keys(userDataParsed));
              console.log('🔍 Valores importantes:', {
                  Idvendedor: userDataParsed.Idvendedor,
                  idVendedor: userDataParsed.idVendedor,
                  IdVendedor: userDataParsed.IdVendedor,
                  id_vendedor: userDataParsed.id_vendedor,
                  colegio_id: userDataParsed.colegio_id,
                  colegioId: userDataParsed.colegioId
              });*/
          } catch (e) {
              console.error('❌ Error parseando userData:', e);
          }
      }
  }, []);

  // Función para obtener boletos vendidos desde la nueva API - CORREGIDA
  const fetchBoletosVendidos = useCallback(async (sorteoId) => {
    try {
      const user = userData || JSON.parse(localStorage.getItem("userData"));
      const colegioIdParam = colegioId || user?.colegio_id;
      
      // ✅ CORRECCIÓN: Usar la ruta correcta /api/boletos/sorteo/[id]
      const url = colegioIdParam 
        ? `/api/boletos/sorteo/${sorteoId}?colegio_id=${colegioIdParam}`
        : `/api/boletos/sorteo/${sorteoId}`;
      
      //console.log('📤 Fetching boletos vendidos from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`❌ Error ${response.status} al obtener boletos`);
        return;
      }
      
      const data = await response.json();
      //console.log('📥 Respuesta de boletos vendidos:', data);
      
      if (data.success) {
        // Mapear datos a formato compatible
        const mappedBoletos = data.datos.map(boleto => ({
          Boleto: boleto.numero_boleto,
          fecha_sorteo: prizes?.Fecha || sorteoData?.Fecha,
        }));
        setBoletosVendidos(mappedBoletos);
        //console.log(`✅ ${mappedBoletos.length} boletos vendidos cargados`);
      }
    } catch (error) {
      console.error("❌ Error al obtener boletos vendidos:", error);
    }
  }, [colegioId, userData, prizes?.Fecha, sorteoData?.Fecha]);

  // Función para obtener un número aleatorio disponible para boletos especiales - MODIFICADA
  const getRandomNumberEspecial = async () => {
    try {
      setIsLoading(true);

      if (!sorteoData) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar información del sorteo'
        });
        return;
      }

      // Si no tenemos información del colegio, intentar cargarla
      if (!colegioInfo && userData?.colegio_id) {
        await cargarInformacionColegio(userData.colegio_id);
      }

      //console.log('🎲 Generando número aleatorio...');
      
      // Generar números hasta encontrar uno disponible
      let numeroAleatorio;
      let intentos = 0;
      const maxIntentos = 1000;
      
      // Obtener boletos ya vendidos
      const boletosVendidosNumeros = boletosVendidos.map(b => b.Boleto);
      //console.log(`🎯 Boletos ya vendidos: ${boletosVendidosNumeros.length} números`);

      do {
        // Generar número con la cantidad de dígitos correcta
        const maxNumber = Math.pow(10, sorteoData.digitos_boleto) - 1;
        const randomNum = Math.floor(Math.random() * (maxNumber + 1));
        numeroAleatorio = randomNum.toString().padStart(sorteoData.digitos_boleto, '0');
        intentos++;
        
        if (intentos % 100 === 0) {
          console.log(`🔄 Intento ${intentos}: ${numeroAleatorio}`);
        }
      } while (boletosVendidosNumeros.includes(parseInt(numeroAleatorio)) && intentos < maxIntentos);

      if (intentos >= maxIntentos) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se encontraron números disponibles'
        });
        return;
      }

      // Establecer el número encontrado
      setTicketNumber(numeroAleatorio);
      
      // MODIFICACIÓN: Establecer nombre por defecto como el nombre del colegio
      // SOLO si tenemos información del colegio
      if (colegioInfo && colegioInfo.nombre) {
        setName(colegioInfo.nombre);
        //console.log(`✅ Nombre por defecto (colegio): ${colegioInfo.nombre}`);
      } else {
        // Si no hay información del colegio, usar un valor por defecto genérico
        setName("Comprador");
        //console.log('⚠️ Usando nombre por defecto genérico');
      }

      // Limpiar validación de tope
      setFoundTope(null);

      //console.log(`✅ Número generado: ${numeroAleatorio} (en ${intentos} intentos)`);
      
      Swal.fire({
        icon: 'success',
        title: 'Número aleatorio generado',
        text: `Número: ${numeroAleatorio}`,
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("❌ Error al obtener número aleatorio:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al conectar con el servidor'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketNumberChange = (e) => {
    let value = e.target.value;
    if (!/^[0-9]*$/.test(value)) {
      value = value.slice(0, -1);
    }
    setTicketNumber(value);

    if (sorteoData) {
      const boletoExistente = boletosVendidos.find(
        ticket => ticket.Boleto === Number(value)
      );

      if (boletoExistente) {
        //console.log(`❌ Boleto ${value} ya está vendido`);
        setFoundTope(true);
      } else {
        //console.log(`✅ Boleto ${value} disponible`);
        setFoundTope(null);
      }
    }
  };

  const handleBlur = (e) => {
    let value = e.target.value;
    if (sorteoData) {
      value = value.padStart(sorteoData.digitos_boleto, "0");
    } else {
      value = value.padStart(3, "0");
    }
    setTicketNumber(value);
  };

  const enviarDatosNormal = async () => {
    //console.log('🔄 Iniciando venta de boleto...');
    
    let user;
    try {
        const userDataStr = localStorage.getItem("userData");
        //console.log('🔍 userData de localStorage:', userDataStr);
        
        if (!userDataStr) {
            Swal.fire({
                icon: 'error',
                title: 'Sesión expirada',
                text: 'Vuelve a iniciar sesión'
            }).then(() => {
                router.push('/login');
            });
            return;
        }
        
        user = JSON.parse(userDataStr);
        //console.log('👤 Usuario parseado:', user);
        
        // BUSCAR id_vendedor en TODOS los campos posibles
        const posiblesIds = ['Idvendedor', 'idVendedor', 'IdVendedor', 'id_vendedor', 'vendedor_id', 'vendedorId'];
        let idVendedor;
        
        for (const key of posiblesIds) {
            if (user[key] !== undefined) {
                idVendedor = user[key];
                console.log(`✅ Encontrado ${key}:`, idVendedor);
                break;
            }
        }
        
        if (!idVendedor) {
            console.error('❌ NO SE ENCONTRÓ id_vendedor. Campos disponibles:', Object.keys(user));
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo identificar al vendedor. Contacta al administrador.'
            });
            return;
        }
        
    } catch (error) {
        console.error('❌ Error obteniendo datos del usuario:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al obtener datos de la sesión'
        });
        return;
    }
    
    // 2. Validaciones básicas
    VailidationEstatus();

    if (!precioFijo || !name || !ticketNumber) {
        console.error('❌ Faltan datos:', { precioFijo, name, ticketNumber });
        ValidateBox();
        return;
    }

    if (foundTope !== null) {
        console.error('❌ Boleto no disponible:', ticketNumber);
        Especial();
        return;
    }

    if (!sorteoData) {
        console.error('❌ No hay datos del sorteo');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar información del sorteo'
        });
        return;
    }

    const idVendedor = user.Idvendedor;

    // 3. Obtener colegio_id
    const colegioIdParam = colegioId || user.colegio_id || user.colegioId || sorteoData.colegio_id;
    //console.log('🏫 Colegio ID:', colegioIdParam);
    
    if (!colegioIdParam) {
        console.error('❌ No hay colegio_id');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo identificar el colegio'
        });
        return;
    }

    /*console.log('📤 Datos para venta:', {
      idVendedor,
      colegioIdParam,
      sorteoId: sorteoData.id_sorteo || sorteoData.Idsorteo,
      ticketNumber,
      name
    });*/

    setIsLoading(true);

    try {
      // 4. Preparar datos para la API
      const boletoData = {
          id_sorteo: sorteoData.id_sorteo || sorteoData.Idsorteo,
          id_vendedor: user.Idvendedor || user.idVendedor || user.IdVendedor || user.id_vendedor,
          numero_boleto: ticketNumber,
          comprador: name,
          colegio_id: colegioIdParam
      };

      //console.log('📤 Enviando datos de boleto:', boletoData);

      // CORRECCIÓN: Usar la ruta correcta /api/boletos/crear
      const response = await fetch('/api/boletos/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(boletoData),
        });
      /*console.log('📥 Status:', response.status);
      console.log('📥 Headers:', Object.fromEntries(response.headers.entries()));*/
        
      const result = await response.json();
      //console.log('📥 Respuesta completa:', result);

      if (result.success) {
        //console.log('✅ Éxito:', result.message);
        const boletoVendido = result.boleto;
        
        // Registrar en el contexto de ventas
        addVenta({
          tipo: "especial", 
          numero: boletoVendido.boleto || ticketNumber,
          cantidad: 1,
          precio: Number(boletoVendido.precio || boletoVendido.precio_boleto || sorteoData.precio_boleto || precioFijo) || 0,
          subtotal: (Number(boletoVendido.precio || boletoVendido.precio_boleto || sorteoData.precio_boleto || precioFijo) || 0) * 1,
          comprador: boletoVendido.comprador || name,
          comision: result.comision_vendedor || 0
      });
          
        // Preparar datos para PDF
        try {
                const pdfData = [{
              ...boletoVendido,
              // Asegurar campos necesarios
              Costo: boletoVendido.precio || boletoVendido.precio_boleto || sorteoData.precio_boleto || precioFijo,
              Tipo_sorteo: 'especial',
              Primerpremio: boletoVendido.primer_premio || sorteoData.primer_premio,
              Segundopremio: boletoVendido.segundo_premio || sorteoData.segundo_premio,
              Boleto: boletoVendido.boleto || ticketNumber,
              nombreSorteo: boletoVendido.nombreSorteo || sorteoData.nombre,
              numero_sorteo: boletoVendido.numero_sorteo || sorteoData.numero_sorteo,
              nombreVendedor: boletoVendido.nombreVendedor,
              colegio_id: boletoVendido.colegio_id || colegioIdParam,
              leyenda1: boletoVendido.leyenda1 || '',
              leyenda2: boletoVendido.leyenda2 || ''
          }];
                
                const fecha = new Date(
                    new Date(sorteoData.fecha || sorteoData.Fecha).getTime() + 
                    new Date().getTimezoneOffset() * 60000
                ).toLocaleDateString();
                
                generatePDF(pdfData, fecha);
                //console.log('✅ PDF generado');
            } catch (pdfError) {
                console.warn('⚠️ Error al generar PDF (continuando):', pdfError);
            }
        
        // Actualizar lista de boletos
        //console.log('🔄 Actualizando lista de boletos...');
        fetchBoletosVendidos(sorteoData.id_sorteo || sorteoData.Idsorteo)
                .catch(err => console.warn('⚠️ Error actualizando boletos:', err));
        
        // 4. Mostrar mensaje de éxito (ESPERAR a que se cierre)
            await Swal.fire({
                icon: 'success',
                title: '¡Venta Exitosa!',
                html: `
                    <div style="text-align: center;">
                        <p>${result.message || 'Boleto vendido exitosamente'}</p>
                        <p><strong>Boleto:</strong> ${boletoVendido.boleto || ticketNumber}</p>
                        <p><strong>Comprador:</strong> ${boletoVendido.comprador || name}</p>
                        <p><strong>Precio:</strong> $${sorteoData.precio_boleto || precioFijo}</p>
                    </div>
                `,
                confirmButtonText: 'Continuar',
                confirmButtonColor: '#3085d6',
                showCancelButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false
            });
            
            //console.log('✅ Venta completada exitosamente');

      } else {
        console.error('❌ Error en la respuesta:', result.error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: result.error || 'Error al vender el boleto'
        });
      }
    } catch (error) {
      console.error("❌ Error en la compra:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al procesar la compra'
      });
    } finally {
      setIsLoading(false);
      setTicketNumber("");
      // LIMPIA el campo nombre después de la venta
      setName("");
    }
  };

  const goToMenu = () => {
    const user = userData || JSON.parse(localStorage.getItem("userData"));
    if (user && user.Idvendedor) {
      updateInfo(user.Idvendedor).then(() => {
        router.push("/menu");
      });
    } else {
      router.push("/menu");
    }
  };

  const hanlePreviewModal = () => {
    VailidationEstatus();
    setPreviewModal(true);
  };

  if (!prizes || !sorteoData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[rgb(38,38,38)]">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute top-0 left-0 animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-red-500"></div>
            <div className="absolute top-0 left-0 flex items-center justify-center h-32 w-32">
              <span className="text-white text-sm">Cargando...</span>
            </div>
          </div>
          <p className="text-white mt-4">Cargando información del sorteo</p>
        </div>
      </div>
    );
  }

  const fechaSorteo = new Date(sorteoData.fecha || sorteoData.Fecha).toLocaleDateString();

  return (
    <div className="relative min-h-screen bg-[rgb(38,38,38)]">
      <div className="max-w-sm mx-auto w-full">
        <div className="text-2xl text-white flex justify-center items-center pb-4 pt-6">
          Venta de Boletos
        </div>
        
        <div className="w-full flex justify-center items-center flex-col space-y-1 relative">
          <label className="text-white text-xl flex justify-center items-center relative pr-8">
            <BsCalendarDateFill className="inline-block h-6 w-6 mr-1 text-red-600" /> 
            Sorteo: {fechaSorteo}
          </label>
          <label className="text-white text-xl flex justify-center items-center relative">
            <PiNumberSquareOneFill className="text-red-600 inline-block h-6 w-6 mr-1" />
            Premio: {sorteoData.primer_premio || sorteoData.Primerpremio}
          </label>
          <label className="text-white text-xl flex justify-center items-center relative">
            <PiNumberSquareTwoFill className="inline-block h-6 w-6 mr-1 text-red-600" /> 
            Premio: {sorteoData.segundo_premio || sorteoData.Segundopremio}
          </label>
          <label className="text-white text-sm flex justify-center items-center relative">
            Dígitos: {sorteoData.digitos_boleto} | Precio: ${sorteoData.precio_boleto}
          </label>
          
          {/* Información del colegio - solo para referencia */}
          {colegioInfo && colegioInfo.nombre && (
            <div className="flex items-center gap-2 mt-2 px-4 py-2 bg-gray-800 rounded-lg">
              <FaSchool className="text-yellow-400" />
              <span className="text-white text-sm">
                Colegio: <span className="font-medium">{colegioInfo.nombre}</span>
              </span>
            </div>
          )}
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
            <div className="text-white flex justify-center items-center text-xl">
              Boleto
            </div>
            <input
              className="bg-neutral-300 border rounded w-[140px] outline-none h-9 pl-10"
              value={ticketNumber}
              onChange={handleTicketNumberChange}
              onBlur={handleBlur}
              maxLength={sorteoData.digitos_boleto}
              placeholder={`${sorteoData.digitos_boleto} dígitos`}
            />
          </div>
          <div className="flex flex-row gap-12">
            <div className="text-white flex justify-center items-center text-xl">
              Precio
            </div>
            <input
              className="bg-neutral-300 border rounded w-[140px] outline-none h-9 pl-10"
              value={`$${sorteoData.precio_boleto}`}
              readOnly
              disabled
            />
          </div>
          <div className="flex flex-row gap-8">
            <div className="text-white flex justify-center items-center text-xl">
              Nombre
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-neutral-300 border rounded w-[140px] outline-none h-9 pl-5"
              placeholder="Ingrese nombre"
            />
          </div>
          {/* Fila de botones Azar */}
          <div className="flex flex-row gap-4 justify-center items-center pt-2">
            <button
              onClick={getRandomNumberEspecial}
              disabled={isLoading || loadingColegio}
              className={`bg-blue-700 text-white flex flex-col justify-center items-center rounded-lg h-[56px] w-[56px] text-xl ${isLoading || loadingColegio ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={loadingColegio ? "Cargando información del colegio..." : "Generar número aleatorio con nombre del colegio"}
            >
              <FaDice className={`${isLoading ? 'animate-spin' : ''} text-2xl`} />
              <span className="text-xs font-semibold mt-1">Azar</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-3">
          <div className="flex justify-center items-center flex-col px-8">
            <button
              onClick={enviarDatosNormal}
              disabled={isLoading}
              className={`w-full rounded-lg ${isLoading ? 'bg-gray-500' : 'bg-red-700'} text-white h-[56px] text-xl`}
            >
              {isLoading ? 'Procesando...' : 'Vender'}
            </button>
          </div>

          <div className="flex justify-center items-center flex-col px-8">
            <button
              onClick={() => router.push("/viewTickects")}
              className="w-full rounded-lg bg-red-700 text-white h-[56px] text-xl"
            >
              Revisar Boletos
            </button>
          </div>
          <div className="flex justify-center items-center flex-col px-8">
            <button
              onClick={hanlePreviewModal}
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

      {previewModal && (
        <EspecialPreviewModal
          tickets={boletosVendidos}
          digitosBoleto={sorteoData.digitos_boleto}
          onClose={() => setPreviewModal(false)}
        />
      )}
    </div>
  );
};

export default TickectBuyEspecial;