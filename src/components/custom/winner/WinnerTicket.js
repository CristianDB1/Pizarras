"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { FaHome, FaMoneyBillWave, FaCamera, FaShare } from "react-icons/fa";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import generateWinnerPDF from "./generateWinnerPDF";
import { useTotalVenta } from "@/context/TotalVentasContext";
import { Html5Qrcode } from "html5-qrcode";

const WinnerTicket = () => {
  const [premiados, setPremiados] = useState([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [currentBoletoId, setCurrentBoletoId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [colegioId, setColegioId] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const { addVenta } = useTotalVenta();

  // Obtener datos del usuario y colegio al cargar
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const localUserData = localStorage.getItem("userData");
        if (localUserData) {
          const parsedData = JSON.parse(localUserData);
          setUserData(parsedData);
          
          const colegioIdFromUser = parsedData.colegio_id || parsedData.ColegioId || null;
          setColegioId(colegioIdFromUser);
        }
      } catch (error) {
        console.error("Error al recuperar datos del usuario:", error);
      }
    }
  }, []);

  // Cargar los boletos premiados filtrados por colegio
  const fetchPremiados = async () => {
    try {
      setIsLoading(true);
      
      let url = "/api/winner";
      if (colegioId) {
        url += `?colegio_id=${colegioId}`;
      }
      
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.premiados) {
        setPremiados(data.premiados);
        console.log(`Cargados ${data.premiados.length} ganadores`, colegioId ? `para colegio ID: ${colegioId}` : 'para todos los colegios');
      } else {
        Swal.fire("Error", "No se pudieron cargar los boletos premiados", "error");
      }
    } catch (error) {
      console.error("Error al obtener boletos premiados:", error);
      Swal.fire("Error", "Ocurrió un error al cargar los boletos premiados", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para comprimir imagen antes de convertir a base64
  const comprimirImagen = (file, maxWidth = 800, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          const imagenComprimida = canvas.toDataURL('image/jpeg', quality);
          resolve(imagenComprimida);
        };
        img.onerror = () => {
          reject(new Error('Error al cargar la imagen para compresión'));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Manejar selección de imagen con compresión
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        console.log("Archivo seleccionado:", file.name);
        
        if (file.size > 10 * 1024 * 1024) {
          Swal.fire("Error", "La imagen es demasiado grande. Máximo 10MB", "error");
          return;
        }
        
        const imagenComprimida = await comprimirImagen(file);
        console.log("Imagen comprimida correctamente");
        
        setSelectedImage(imagenComprimida);
        setPreviewImage(URL.createObjectURL(file));
        
        const previewContainer = document.getElementById("previewContainer");
        const previewImageElement = document.getElementById("previewImage");
        
        if (previewContainer && previewImageElement) {
          previewContainer.style.display = "block";
          previewImageElement.src = URL.createObjectURL(file);
        }
      } catch (error) {
        console.error("Error al procesar imagen:", error);
        Swal.fire("Error", "No se pudo procesar la imagen", "error");
      }
    }
  };

  // Marcar un boleto como pagado
  const marcarComoPagado = async (id, imageData = null) => {
    try {
      let currentUserData = userData;
      
      if (typeof window !== "undefined") {
        if (!currentUserData) {
          try {
            const localUserData = localStorage.getItem("userData");
            if (localUserData) {
              currentUserData = JSON.parse(localUserData);
              setUserData(currentUserData);
            } else {
              Swal.fire("Error", "No se encontró información del usuario", "error");
              return;
            }
          } catch (error) {
            console.error("Error al recuperar datos del usuario:", error);
            Swal.fire("Error", "Error al recuperar datos del usuario", "error");
            return;
          }
        }
      }

      const ineImage = imageData || selectedImage;
      if (!ineImage) {
        Swal.fire("Error", "Debe capturar la identificación del cliente", "error");
        return;
      }
      
      setIsLoading(true);
      
      const response = await fetch("/api/winner", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          id, 
          ine: ineImage, 
          user: currentUserData,
          liquidado: 'si'
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error("Respuesta vacía del servidor");
      }

      const data = JSON.parse(responseText);
      console.log("Respuesta del servidor:", data);
      
      if (data.success) {
        const boletoActualizado = data.boleto;
        setPremiados(prev => 
          prev.map(boleto => 
            boleto.id_ganador === id ? boletoActualizado : boleto
          )
        );
        
        const folio = data.folio || boletoActualizado.folio;
        
        Swal.fire({
          title: "¡Boleto pagado con éxito!",
          html: `
            <p>El boleto ha sido marcado como pagado.</p>
            <p>Folio de pago: <strong>${folio}</strong></p>
            ${boletoActualizado.liquidado === 'si' ? '<p>✅ Liquidado: Sí</p>' : ''}
          `,
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "Imprimir comprobante",
          cancelButtonText: "Cerrar",
        }).then((result) => {
          if (result.isConfirmed) {
            imprimirComprobante(id, folio, boletoActualizado);
          }
        });

        addVenta({
          tipo: "premio",
          descripcion: `Premio boleto ${boletoActualizado.boleto}`, 
          cantidad: 1,
          precio: -Number(boletoActualizado.premio),
          subtotal: -Number(boletoActualizado.premio),
        });

        setSelectedImage(null);
        setPreviewImage(null);
        setCurrentBoletoId(null);
      } else {
        Swal.fire("Error", data.error || "No se pudo marcar el boleto como pagado", "error");
      }
    } catch (error) {
      console.error("Error al marcar como pagado:", error);
      
      let errorMessage = "Ocurrió un error al procesar el pago";
      if (error.message.includes("HTTP")) {
        errorMessage = `Error del servidor: ${error.message}`;
      } else if (error.message.includes("vacía")) {
        errorMessage = "El servidor no respondió correctamente";
      }
      
      Swal.fire("Error", errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ESCÁNER QR - MODIFICADO para manejar formato "N152"
  const startQrScanner = async () => {
    try {
      const readerElement = document.getElementById("reader");
      if (!readerElement) return;

      readerElement.style.display = "block";

      const html5QrCode = new Html5Qrcode("reader");
      const config = { fps: 10, qrbox: 200 };

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        Swal.fire("Error", "No se encontró ninguna cámara disponible", "error");
        readerElement.style.display = "none";
        return;
      }

      const backCamera =
        cameras.find((cam) =>
          cam.label.toLowerCase().includes("back") ||
          cam.label.toLowerCase().includes("trasera")
        ) || cameras[0];

      await html5QrCode.start(
        { deviceId: { exact: backCamera.id } },
        config,
        (decodedText) => {
          // Procesar el QR según el formato
          procesarQR(decodedText);

          // Detener el escáner
          html5QrCode.stop().then(() => {
            readerElement.style.display = "none";
          });
        },
        (error) => {
          // No mostramos errores de lectura continua
        }
      );
    } catch (err) {
      console.error("Error al iniciar el lector QR:", err);
      Swal.fire("Error", "No se pudo acceder a la cámara", "error");
    }
  };

  // Función para procesar el código QR escaneado
  const procesarQR = (decodedText) => {
    let idBoleto = null;
    let mensaje = "";
    
    // Verificar si es el nuevo formato: N152
    if (decodedText.startsWith('N') && !isNaN(parseInt(decodedText.substring(1)))) {
      // Formato nuevo: N152
      idBoleto = decodedText.substring(1); // Extrae "152" de "N152"
      mensaje = `QR detectado (formato N): ${decodedText}`;
      console.log(mensaje, "ID del boleto:", idBoleto);
    } else {
      try {
        // Intentar como JSON (formato antiguo)
        const qrData = JSON.parse(decodedText);
        idBoleto = qrData.id_boleto || qrData.idBoleto;
        mensaje = `QR detectado (formato JSON): ${decodedText}`;
        console.log(mensaje, "ID del boleto:", idBoleto);
      } catch (error) {
        // Si no es JSON válido, usar el texto completo
        idBoleto = decodedText;
        mensaje = `QR detectado (texto plano): ${decodedText}`;
        console.log(mensaje);
      }
    }

    if (idBoleto) {
      buscarBoletoPorId(idBoleto);
    } else {
      Swal.fire("Error", "No se pudo extraer el ID del boleto del QR", "error");
    }
  };

  // Función para buscar boleto por ID en los datos cargados y/o API
const buscarBoletoPorId = async (idBoleto) => {
  try {
    // Primero buscar en los datos ya cargados
    const boletoEncontradoLocal = premiados.find(boleto => {
      return boleto.id_ganador?.toString() === idBoleto.toString();
    });
    
    if (boletoEncontradoLocal) {
      // Usar el folio para la búsqueda en la tabla
      const folio = boletoEncontradoLocal.folio || '';
      if (folio) {
        setSearch(folio);
      }
      
      Swal.fire({
        title: "✅ Boleto encontrado (en datos locales)",
        html: `
          <div style="text-align: left;">
            <p><strong>Folio:</strong> ${folio}</p>
            <p><strong>Número de boleto:</strong> ${boletoEncontradoLocal.boleto || 'N/A'}</p>
            <p><strong>Cliente:</strong> ${boletoEncontradoLocal.cliente || 'N/A'}</p>
            <p><strong>Premio:</strong> $${boletoEncontradoLocal.premio || '0'}</p>
            <p><strong>Estado:</strong> ${boletoEncontradoLocal.estatus || 'pendiente'}</p>
          </div>
        `,
        icon: "success",
        showConfirmButton: true,
        confirmButtonText: "Ver en tabla",
      });
      return;
    }
    
    // Si no está en los datos locales, buscar en la API
    setIsLoading(true);
    
    let url = `/api/winner?id_boleto=${idBoleto}`;
    if (colegioId) {
      url += `&colegio_id=${colegioId}`;
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      if (data.ganadorEncontrado) {
        // Recargar datos para incluir el nuevo ganador
        await fetchPremiados();
        
        // Buscar el folio para la búsqueda
        const folio = data.ganador?.folio || '';
        if (folio) {
          setSearch(folio);
          
          Swal.fire({
            title: "✅ Boleto encontrado",
            html: `
              <div style="text-align: left;">
                <p><strong>Folio:</strong> ${folio}</p>
                <p><strong>Número de boleto:</strong> ${data.ganador.boleto || 'N/A'}</p>
                <p><strong>Cliente:</strong> ${data.ganador.cliente || 'N/A'}</p>
                <p><strong>Premio:</strong> $${data.ganador.premio || '0'}</p>
                <p><strong>Estado:</strong> ${data.ganador.estatus || 'pendiente'}</p>
              </div>
            `,
            icon: "success",
            showConfirmButton: true,
            confirmButtonText: "Ver en tabla",
          });
        }
      } else if (data.boletoEncontrado) {
        Swal.fire({
          title: "⚠️ Boleto no ganador",
          html: `
            <p>El boleto <strong>${data.numeroBoleto}</strong> existe pero no está registrado como ganador.</p>
            <p class="text-sm mt-2">El usuario debe verificar si realmente ganó un premio.</p>
          `,
          icon: "warning",
          showConfirmButton: true,
          confirmButtonText: "Entendido",
        });
      } else {
        Swal.fire({
          title: "❌ Boleto no encontrado",
          text: `No existe un boleto con ID: ${idBoleto}`,
          icon: "error",
          showConfirmButton: true,
        });
      }
    } else {
      Swal.fire({
        title: "❌ Error en la búsqueda",
        text: data.error || "Ocurrió un error al buscar el boleto",
        icon: "error",
        showConfirmButton: true,
      });
    }
    
  } catch (error) {
    console.error("Error al buscar boleto:", error);
    Swal.fire("Error", "Ocurrió un error al buscar el boleto", "error");
  } finally {
    setIsLoading(false);
  }
};

  // Imprimir comprobante de pago
  const imprimirComprobante = (id, folio, boletoActualizado = null) => {
    const boleto = boletoActualizado || premiados.find(b => b.id_ganador === id);
  
    if (!boleto) {
      console.error("No se encontró el boleto con ID:", id);
      Swal.fire("Error", "No se pudo generar el comprobante", "error");
      return;
    }
    
    const boletoCompatible = {
      ...boleto,
      Id_ganador: boleto.id_ganador,
      Folio: boleto.folio,
      Boleto: boleto.boleto,
      Cliente: boleto.cliente,
      Premio: boleto.premio,
      Fecha_sorteo: boleto.fecha_sorteo,
      Vendedor: boleto.vendedor,
      Estatus: boleto.estatus
    };
    
    generateWinnerPDF(boletoCompatible, folio);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    const regex = /(\d{4})-(\d{2})-(\d{2})/;
    const match = dateString.match(regex);
    if (match) {
      const year = match[1];
      const month = match[2];
      const day = match[3];
      return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  // Confirmar antes de marcar como pagado
  const confirmarPago = (id) => {
    const boleto = premiados.find(b => b.id_ganador === id);
    if (!boleto) {
      Swal.fire("Error", "No se encontró el boleto", "error");
      return;
    }
    
    setCurrentBoletoId(id);

    Swal.fire({
      title: `Capturar identificación para boleto #${boleto.boleto}`,
      html: `
        <div style="text-align: center; margin-bottom: 15px;">
          <p>Seleccione cómo desea capturar la identificación:</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button id="openCameraButton" class="swal2-confirm swal2-styled" style="background-color: #28a745;">
            📷 Usar cámara (trasera)
          </button>
          <button id="selectFileButton" class="swal2-confirm swal2-styled" style="background-color: #007bff;">
            🖼️ Seleccionar de galería
          </button>
        </div>
        <div id="cameraContainer" style="display: none; margin-top: 15px; text-align: center;">
          <video id="cameraPreview" autoplay playsinline style="width: 100%; max-height: 250px; border-radius: 8px;"></video>
          <div style="margin-top: 10px;">
            <button id="takePhotoButton" class="swal2-confirm swal2-styled" style="background-color: #28a745; margin-right: 5px;">
              📸 Tomar foto
            </button>
            <button id="closeCameraButton" class="swal2-cancel swal2-styled" style="background-color: #dc3545;">
              ❌ Cerrar cámara
            </button>
          </div>
        </div>
        <div id="previewContainer" style="margin-top: 15px; text-align: center; display: none;">
          <img id="previewImage" style="max-width: 100%; max-height: 200px; border-radius: 8px;" />
          <p style="margin-top: 10px; font-size: 12px;">Identificación capturada - Lista para confirmar pago</p>
        </div>
        <input type="file" id="fileInput" accept="image/*" style="display: none;" />
      `,
      showCancelButton: true,
      confirmButtonText: "Confirmar pago",
      cancelButtonText: "Cancelar",
      didOpen: async () => {
        const openCameraButton = document.getElementById("openCameraButton");
        const selectFileButton = document.getElementById("selectFileButton");
        const cameraContainer = document.getElementById("cameraContainer");
        const cameraPreview = document.getElementById("cameraPreview");
        const takePhotoButton = document.getElementById("takePhotoButton");
        const closeCameraButton = document.getElementById("closeCameraButton");
        const fileInput = document.getElementById("fileInput");
        const previewContainer = document.getElementById("previewContainer");
        const previewImage = document.getElementById("previewImage");

        let stream = null;
        let capturedImage = null;

        openCameraButton.addEventListener("click", async () => {
          try {
            const cameras = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: { exact: "environment" } } 
            }).catch(async () => {
              return await navigator.mediaDevices.getUserMedia({ video: true });
            });

            stream = cameras;
            cameraPreview.srcObject = stream;
            cameraContainer.style.display = "block";
            
            openCameraButton.style.display = "none";
            selectFileButton.style.display = "none";
            
          } catch (error) {
            console.error("No se pudo acceder a la cámara:", error);
            Swal.showValidationMessage("No se pudo acceder a la cámara. Use la opción de galería.");
          }
        });

        selectFileButton.addEventListener("click", () => {
          fileInput.click();
        });

        fileInput.addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (file) {
            try {
              const imagenComprimida = await comprimirImagen(file);
              capturedImage = imagenComprimida;
              
              previewImage.src = imagenComprimida;
              previewContainer.style.display = "block";
              
              openCameraButton.style.display = "none";
              selectFileButton.style.display = "none";
              
            } catch (error) {
              console.error("Error al procesar imagen:", error);
              Swal.showValidationMessage("Error al procesar la imagen");
            }
          }
        });

        takePhotoButton.addEventListener("click", async () => {
          const canvas = document.createElement("canvas");
          canvas.width = cameraPreview.videoWidth;
          canvas.height = cameraPreview.videoHeight;
          canvas.getContext("2d").drawImage(cameraPreview, 0, 0);
          
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
          const file = new File([blob], 'foto-identificacion.jpg', { type: 'image/jpeg' });
          const imagenComprimida = await comprimirImagen(file);
          
          capturedImage = imagenComprimida;
          previewImage.src = imagenComprimida;
          previewContainer.style.display = "block";

          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            cameraContainer.style.display = "none";
          }
        });

        closeCameraButton.addEventListener("click", () => {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
          }
          cameraContainer.style.display = "none";
          
          openCameraButton.style.display = "block";
          selectFileButton.style.display = "block";
        });
      },
      preConfirm: () => {
        const previewContainer = document.getElementById("previewContainer");
        if (!previewContainer || previewContainer.style.display === "none") {
          Swal.showValidationMessage("Debe capturar o seleccionar la identificación primero");
          return false;
        }
        return true;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const previewImage = document.getElementById("previewImage");
        if (previewImage && previewImage.src) {
          marcarComoPagado(id, previewImage.src);
        }
      } else {
        setSelectedImage(null);
        setPreviewImage(null);
        setCurrentBoletoId(null);
      }
    });
  };

  // Observar cambios en la previsualización
  useEffect(() => {
    if (previewImage && currentBoletoId) {
      const previewContainer = document.getElementById("previewContainer");
      const previewImageElement = document.getElementById("previewImage");
      
      if (previewContainer && previewImageElement) {
        previewContainer.style.display = "block";
        previewImageElement.src = previewImage;
      }
    }
  }, [previewImage, currentBoletoId]);

  // Volver al menú principal
  const goToMenu = () => {
    router.push('/menu');
  };

  // Filtrar boletos según la búsqueda
  const filteredPremiados = useMemo(() => {
    if (!search || search.length < 5) return [];
    
    try {
      const regex = new RegExp(search, 'i');
      
      return premiados.filter(boleto => 
        boleto.folio && regex.test(boleto.folio.toString())
      );
    } catch (error) {
      console.error("Error en expresión regular:", error);
      return premiados.filter(boleto => 
        boleto.folio && boleto.folio.toString().toLowerCase().includes(search.toLowerCase())
      );
    }
  }, [premiados, search]);

  // Cargar datos cuando cambie colegioId
  useEffect(() => {
    if (colegioId !== null) {
      fetchPremiados();
    }
  }, [colegioId]);

  // Cargar datos al montar el componente
  useEffect(() => {
    return () => {
      const readerElement = document.getElementById("reader");
      if (readerElement) readerElement.style.display = "none";
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl text-white font-bold mb-4 text-center">Boletos Premiados</h1>
      
      {/* Mostrar colegio actual */}
      {colegioId && (
        <div className="bg-blue-900 p-3 rounded-md mb-4 text-white text-center">
          <p className="font-semibold">Mostrando ganadores del Colegio</p>
          <p className="text-sm mt-1">Formato QR: <span className="font-bold">N + ID del boleto</span> (Ej: N152)</p>
        </div>
      )}
      
      {/* Estadísticas */}
      <div className="flex flex-col md:flex-row justify-between mb-4 text-white">
        <div className="bg-gray-800 p-3 rounded-md mb-2 md:mb-0 md:mr-2 flex-1">
          <p className="font-semibold">Total de boletos premiados: {premiados.length}</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-md mb-2 md:mb-0 md:mx-2 flex-1">
          <p className="font-semibold">Pagados: {premiados.filter(b => b.estatus === "pagado").length}</p>
        </div>
        <div className="bg-gray-800 p-3 rounded-md md:ml-2 flex-1">
          <p className="font-semibold">Pendientes: {premiados.filter(b => b.estatus === "pendiente").length}</p>
        </div>
      </div>
      
      {/* Buscador */}
      <div className="mb-4 flex gap-2 items-center">
        <input
          type="search"
          className="flex-1 p-4 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 
          focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 
          dark:placeholder-gray-400 dark:text-white"
          placeholder="Buscar por número de folio o escanear QR..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          type="button"
          onClick={() => startQrScanner()}
          className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-800 flex items-center justify-center"
          title="Escanear QR"
        >
          <FaCamera className="text-lg" />
        </button>
      </div>

      {/* Contenedor del lector QR */}
      <div
        id="reader"
        style={{
          width: "100%",
          maxWidth: "300px",
          margin: "0 auto 20px",
          display: "none",
          border: "2px solid #444",
          borderRadius: "10px",
        }}
      ></div>

      {/* Input oculto para seleccionar archivo */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleImageChange}
      />
      
      {/* Tabla de boletos premiados */}
      {search !== "" && (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">Folio</th>
                <th scope="col" className="px-6 py-3">Boleto</th>
                <th scope="col" className="px-6 py-3">Cliente</th>
                <th scope="col" className="px-6 py-3">Premio</th>
                <th scope="col" className="px-6 py-3">Fecha Sorteo</th>
                <th scope="col" className="px-6 py-3">Estado</th>
                <th scope="col" className="px-6 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredPremiados.length > 0 ? (
                filteredPremiados.map((boleto) => (
                  <tr key={boleto.id_ganador} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {boleto.folio}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                      {boleto.boleto ? boleto.boleto.toString().replace(/\.\d{2}$/, "") : ''}
                    </td>
                    <td className="px-6 py-4">
                      {boleto.cliente}
                    </td>
                    <td className="px-6 py-4">
                      ${boleto.premio}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(boleto.fecha_sorteo)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${boleto.estatus === "pagado" ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {boleto.estatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {boleto.estatus === "pendiente" ? (
                        <button
                          onClick={() => confirmarPago(boleto.id_ganador)}
                          className="text-blue-600 dark:text-blue-500 hover:text-blue-800 text-xl"
                          disabled={isLoading}
                        >
                          <FaMoneyBillWave title="Marcar como pagado" />
                        </button>
                      ) : (
                        <div className="flex space-x-3">
                          <span className="text-green-500">✓</span>
                          <button
                            onClick={() => imprimirComprobante(boleto.id_ganador, boleto.folio)}
                            className="text-blue-600 dark:text-blue-500 hover:text-blue-800"
                            title="Imprimir comprobante"
                          >
                            <FaShare />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    {isLoading ? "Cargando..." : "No hay boletos premiados que coincidan con la búsqueda"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Mensaje cuando no hay búsqueda */}
      {search.length > 0 && search.length < 5 && (
        <div className="text-center text-white mt-8 mb-8">
          <p className="text-lg">Ingrese al menos 5 caracteres para buscar</p>
        </div>
      )}
      
      {/* Botón para volver al menú */}
      <button
        onClick={goToMenu}
        className="fixed bottom-4 right-4 bg-red-700 text-white flex justify-center items-center p-2 rounded-full h-[40px] w-[40px]"
      >
        <FaHome />
      </button>
      
      {/* Overlay de carga */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
        </div>
      )}
    </div>
  );
};

export default WinnerTicket;