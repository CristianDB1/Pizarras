import jsPDF from "jspdf";
import Swal from "sweetalert2";

const generateWinnerPDF = async (boleto, folio) => {
  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Intentar diferentes formatos de fecha
    try {
      const date = new Date(dateString);
      
      // Verificar si es una fecha válida
      if (isNaN(date.getTime())) {
        return dateString; // Retorna la cadena original si no es una fecha válida
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      // Intentar con regex para formato YYYY-MM-DD
      const regex = /(\d{4})-(\d{2})-(\d{2})/;
      const match = dateString.match(regex);
      if (match) {
        const year = match[1];
        const month = match[2];
        const day = match[3];
        return `${day}/${month}/${year}`;
      }
      return dateString; // Retorna la cadena original si no coincide con el formato
    }
  };

  // Crear un nuevo documento PDF
  var doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 140],
  });

  // URL de la imagen
  const imageURL = "/noSencillo.jpg";

  // Agregar la imagen al PDF
  doc.addImage(imageURL, "JPEG", 0, 0, 80, 30);

  // Agregar contenido al PDF
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 0, 0);
  doc.setFontSize(9);
  let leyenda = "¡FELICIDADES POR TU BOLETO GANADOR!";
  var leyendaText = doc.splitTextToSize(leyenda, 70);
  doc.text(leyendaText, 5, 35);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text(`Comprobante de Pago`, 5, 45);

  // Mostrar detalles del boleto premiado - USANDO NUEVOS NOMBRES DE CAMPOS
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  // Usar folio del parámetro o del objeto
  const folioFinal = folio || boleto.folio || boleto.Folio || 'N/A';
  doc.text(`Folio: ${folioFinal}`, 5, 55);
  
  // Usar boleto del objeto (nuevo nombre)
  const numeroBoleto = boleto.boleto || boleto.Boleto || 'N/A';
  doc.text(`Boleto: ${numeroBoleto}`, 5, 65);
  
  // Usar cliente del objeto (nuevo nombre)
  const cliente = boleto.cliente || boleto.Cliente || 'N/A';
  doc.text(`Cliente: ${cliente}`, 5, 75);
  
  // Formatear el premio como moneda (nuevo nombre)
  const premioValor = boleto.premio || boleto.Premio;
  const premio = premioValor ? `$${Number(premioValor).toLocaleString('es-MX')}` : 'N/A';
  doc.text(`Premio: ${premio}`, 5, 85);
  
  // Formatear las fechas (nuevos nombres)
  const fechaSorteo = boleto.fecha_sorteo || boleto.Fecha_sorteo;
  const fechaSorteoFormateada = formatDate(fechaSorteo);
  doc.text(`Fecha sorteo: ${fechaSorteoFormateada}`, 5, 95);
  
  const fechaPago = boleto.fecha_pago || boleto.Fecha_pago;
  const fechaPagoFormateada = formatDate(fechaPago);
  doc.text(`Fecha pago: ${fechaPagoFormateada}`, 5, 105);
  
  // Usar vendedor del objeto (nuevo nombre)
  const vendedor = boleto.vendedor || boleto.Vendedor || 'N/A';
  doc.text(`Vendedor: ${vendedor}`, 5, 113);

  // Agregar estado y liquidación si están disponibles
  if (boleto.estatus || boleto.Estatus) {
    const estatus = boleto.estatus || boleto.Estatus;
    doc.text(`Estado: ${estatus === 'pagado' ? 'Pagado' : 'Pendiente'}`, 5, 121);
  }
  
  if (boleto.liquidado) {
    const liquidado = boleto.liquidado === 'si' ? 'Sí' : 'No';
    doc.text(`Liquidado: ${liquidado}`, 45, 121);
  }

  // Agregar leyenda final
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  let leyendaFinal = "¡GRACIAS POR SU PREFERENCIA! EL TREBOL DE LA SUERTE.";
  var text = doc.splitTextToSize(leyendaFinal, 70);
  doc.text(text, 5, 130);

  // Imprimir automáticamente
  doc.autoPrint();
  
  // Obtener una representación de datos del documento y abrir en nueva ventana
  var blob = doc.output("blob");

  const file = new File([blob], "comprobante_premio.pdf", {
    type: "application/pdf",
  });

  var url = URL.createObjectURL(blob);

  // Mostrar una alerta con opciones para compartir o cancelar
  const result = await Swal.fire({
    title: "Operación exitosa",
    text: "El comprobante se ha generado correctamente",
    icon: "success",
    showCancelButton: true,
    allowOutsideClick: false,
    confirmButtonText: "Compartir",
    cancelButtonText: "Cancelar",
  });

  if (result.isConfirmed) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Comprobante de Premio",
          text: `Hola, aquí tienes el comprobante del premio para el boleto ${numeroBoleto}. ¡Felicidades!`,
          files: [file],
        });
        console.log("Compartido exitosamente");
      } catch (error) {
        console.error("Error al compartir:", error);
        
        // Si el usuario cancela el share, no hacer nada
        if (error.name !== 'AbortError') {
          // Abrir la URL en una nueva ventana si hay error de share
          window.open(url, '_blank');
        }
      }
    } else {
      // Si no hay API de share disponible, abrir en nueva ventana
      window.open(url, '_blank');
    }
  } else {
    // Si el usuario cancela, también abrir el PDF
    window.open(url, '_blank');
  }
};

export default generateWinnerPDF;