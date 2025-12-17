import jsPDF from "jspdf";
import Swal from "sweetalert2";
import { imageUrlToBase64 } from "@/utils/imageToBase64";
import QRCode from "qrcode";

// Función auxiliar para formatear fechas
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    
    // Si es una fecha válida
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    // Si ya está en formato dd/mm/yyyy
    return dateString;
  } catch (error) {
    console.warn('⚠️ Error formateando fecha:', dateString);
    return dateString;
  }
};

// Función para generar QR Code como base64
const generateQRCode = async (data) => {
  try {
    if (!data) return null;
    
    const qrData = JSON.stringify(data);
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('❌ Error generando QR:', error);
    return null;
  }
};

// Función para usar la API de compartir nativa
const shareTicket = async (pdfBlob, fileName, ticketData) => {
  try {
    // Crear archivo para compartir
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    // Verificar si la API de compartir está disponible
    if (navigator.share && navigator.canShare) {
      try {
        // Para móviles: usar Web Share API
        await navigator.share({
          files: [file],
          title: `Ticket de Sorteo - ${ticketData.colegioNombre}`,
          text: `Ticket para el sorteo ${ticketData.sorteoNum} del ${formatDate(ticketData.fechaSorteo)}. Total: $${ticketData.totalVenta.toFixed(2)}`
        });
        return true;
      } catch (shareError) {
        if (shareError.name !== 'AbortError') {
          console.log('Web Share API no funcionó, usando método alternativo');
          // Continuar con el método alternativo
        }
      }
    }
    
    // Método alternativo: crear URL y abrir en nueva pestaña
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, '_blank');
    
    return false;
  } catch (error) {
    console.error('Error compartiendo:', error);
    return false;
  }
};

// Función principal mejorada
const generatePDF = async (tickets, fechaSorteo, esCopia = false) => {
  try {
    console.log("📄 Iniciando generación de PDF mejorado");
    console.log("🎫 Tickets recibidos:", tickets);
    console.log("📅 Fecha sorteo:", fechaSorteo);

    // Verificación de datos
    if (!tickets || tickets.length === 0) {
      throw new Error("No hay datos de boletos para generar el PDF");
    }

    const firstTicket = tickets[0];
    if (!firstTicket) {
      throw new Error("Datos incompletos en el boleto");
    }

    // ========== OBTENER DATOS DEL COLEGIO ==========
    let colegioData = null;
    let logoBase64 = null;
    const colegioId = firstTicket.colegio_id || firstTicket.colegioId;

    if (colegioId) {
      try {
        console.log(`🏫 Obteniendo datos del colegio ID: ${colegioId}`);
        const response = await fetch(`/api/colegios/${colegioId}`);
        
        if (response.ok) {
          colegioData = await response.json();
          console.log('✅ Datos del colegio:', colegioData);
          
          // Convertir logo a base64 si existe
          if (colegioData.logo_url) {
            console.log('🖼️ Convirtiendo logo a base64...');
            logoBase64 = await imageUrlToBase64(colegioData.logo_url);
          }
        }
      } catch (error) {
        console.warn('⚠️ Error obteniendo datos del colegio:', error);
      }
    }

    // ========== OBTENER DIGITOS DEL SORTEO ==========
    // IMPORTANTE: Obtener el número de dígitos desde los datos del sorteo
    let digitosBoleto = 3; // Valor por defecto
    
    // Buscar dígitos en varias posibles ubicaciones
    if (firstTicket.digitos_boleto) {
      digitosBoleto = parseInt(firstTicket.digitos_boleto);
    } else if (firstTicket.digitos) {
      digitosBoleto = parseInt(firstTicket.digitos);
    } else if (colegioData?.configuracion) {
      try {
        const config = JSON.parse(colegioData.configuracion);
        if (config.cifras_sorteo) {
          digitosBoleto = parseInt(config.cifras_sorteo);
        }
      } catch (e) {
        console.warn('⚠️ Error parseando configuración:', e);
      }
    }
    
    console.log(`🔢 Dígitos del boleto: ${digitosBoleto}`);

    // ========== GENERAR QR CODES PARA CADA BOLETO ==========
    console.log('🔳 Generando códigos QR para los boletos...');
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket) => {
        // Datos para el QR
        const qrData = {
          colegioId: colegioId,
          colegioNombre: colegioData?.nombre,
          sorteoId: firstTicket.numero_sorteo || firstTicket.Idsorteo,
          sorteoFecha: fechaSorteo,
          boletoId: ticket.id_boleto || ticket.id,
          boletoNumero: ticket.Boleto || ticket.boleto,
          comprador: ticket.comprador,
          vendedor: ticket.nombreVendedor,
          precio: ticket.Costo || ticket.precio,
          fechaVenta: ticket.fecha_venta || ticket.created_at,
          timestamp: new Date().toISOString()
        };
        
        // Generar QR
        const qrCode = await generateQRCode(qrData);
        
        return {
          ...ticket,
          qr_code: qrCode,
          qr_data: qrData
        };
      })
    );

    // ========== CALCULAR DIMENSIONES DEL PDF ==========
    const ticketsCount = ticketsWithQR.length;
    const baseHeight = 150;
    const ticketHeight = 70; // Aumentado para incluir QR
    const totalHeight = baseHeight + (ticketsCount * ticketHeight);
    
    // Asegurar altura mínima
    const docHeight = Math.max(totalHeight, 200);
    
    // Crear documento
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, docHeight],
      hotfixes: ["px_scaling"]
    });

    // ========== ENCABEZADO MEJORADO ==========
    let yPosition = 5;

    // 1. NOMBRE DEL COLEGIO ENCIMA DEL LOGO
    const colegioNombre = colegioData?.nombre || "SORTEO COLEGIO COLOMBIANO";
    
    // Nombre del colegio centrado y arriba
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(colegioNombre.toUpperCase(), 40, yPosition + 5, { align: 'center' });
    
    yPosition += 12;

    // 2. Logo del colegio (si existe)
    if (logoBase64) {
      try {
        // Logo centrado
        doc.addImage(logoBase64, 'PNG', 30, yPosition, 20, 20);
        console.log('✅ Logo agregado al PDF');
        yPosition += 25;
      } catch (error) {
        console.warn('⚠️ Error cargando logo en PDF:', error);
        yPosition += 10;
      }
    } else {
      yPosition += 10;
    }

    // Línea separadora
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 8;

    // ========== INFORMACIÓN DEL SORTEO ==========
    // Título principal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 0, 0);
    doc.text("TICKET DE SORTEO", 40, yPosition, { align: 'center' });
    yPosition += 7;

    // Número de sorteo
    if (firstTicket.numero_sorteo || firstTicket.Idsorteo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 150);
      const numSorteo = firstTicket.numero_sorteo || firstTicket.Idsorteo;
      doc.text(`SORTEO #${numSorteo}`, 40, yPosition, { align: 'center' });
      yPosition += 6;
    }

    // Línea separadora fina
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(20, yPosition, 60, yPosition);
    yPosition += 8;

    // Fecha del sorteo
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Fecha del sorteo: ${formatDate(fechaSorteo)}`, 40, yPosition, { align: 'center' });
    yPosition += 6;

    // Premios
    if (firstTicket.primer_premio || firstTicket.segundo_premio) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(0, 100, 0);
      
      if (firstTicket.primer_premio) {
        doc.text(`1º Premio: $${firstTicket.primer_premio}`, 40, yPosition, { align: 'center' });
        yPosition += 5;
      }
      
      if (firstTicket.segundo_premio) {
        doc.text(`2º Premio: $${firstTicket.segundo_premio}`, 40, yPosition, { align: 'center' });
        yPosition += 5;
      }
    }

    // Línea separadora
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 8;

    // ========== INFORMACIÓN DE VENTA ==========
    if (esCopia) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 0, 0);
      doc.text("COPIA DE RESPALDO", 40, yPosition, { align: 'center' });
      yPosition += 6;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    // Fecha de venta
    const fechaVenta = firstTicket.fecha_venta || firstTicket.created_at || new Date().toISOString();
    doc.text(`Fecha venta: ${formatDate(fechaVenta)}`, 40, yPosition, { align: 'center' });
    yPosition += 5;

    // Comprador
    const comprador = firstTicket.comprador || "Consumidor final";
    const compradorLines = doc.splitTextToSize(`Comprador: ${comprador}`, 70);
    compradorLines.forEach((line, i) => {
      doc.text(line, 40, yPosition + (i * 4), { align: 'center' });
    });
    yPosition += (compradorLines.length * 4) + 2;

    // Vendedor
    if (firstTicket.nombreVendedor) {
      doc.text(`Vendedor: ${firstTicket.nombreVendedor}`, 40, yPosition, { align: 'center' });
      yPosition += 5;
    }

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 10;

    // ========== DETALLE DE BOLETOS CON QR ==========
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("DETALLE DE BOLETOS", 40, yPosition, { align: 'center' });
    yPosition += 8;

    // Contenedor para detalles
    const boletoDetailX = 10;
    const boletoDetailWidth = 60;
    
    let totalVenta = 0;

    ticketsWithQR.forEach((ticket, index) => {
      // Fondo alternado
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(boletoDetailX - 5, yPosition - 4, boletoDetailWidth + 10, 62, 'F');
      }

      // Encabezado del boleto
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 150);
      
      // CORRECCIÓN: Usar el número correcto de dígitos
      // IMPORTANTE: Usar el valor de digitosBoleto que obtuvimos antes
      const boletoNum = ticket.Boleto?.toString().padStart(digitosBoleto, '0') || 
                       ticket.boleto?.toString().padStart(digitosBoleto, '0') || 
                       '0'.repeat(digitosBoleto);
      
      doc.text(`BOLETO ${boletoNum}`, 40, yPosition + 5, { align: 'center' });

      // Detalles del boleto
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      // Precio
      const precio = ticket.Costo || ticket.precio || 0;
      totalVenta += parseFloat(precio);
      doc.text(`Precio: $${parseFloat(precio).toFixed(2)}`, 40, yPosition + 12, { align: 'center' });


      // ========== QR CODE OBLIGATORIO ==========
      if (ticket.qr_code) {
        try {
          // Texto sobre el QR
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text("Escanee para verificar", 40, yPosition + 23, { align: 'center' });
          
          // Tamaño del QR
          const qrSize = 22;
          const qrX = 40 - (qrSize / 2);
          const qrY = yPosition + 25;
          
          // Agregar QR al PDF
          doc.addImage(ticket.qr_code, 'PNG', qrX, qrY, qrSize, qrSize);
          console.log(`✅ QR agregado para boleto ${boletoNum}`);
          
          yPosition += qrSize + 30;
        } catch (error) {
          console.warn('⚠️ Error cargando QR en PDF:', error);
          yPosition += 30;
        }
      } else {
        // Espacio para QR (aunque no se generó)
        doc.setFontSize(7);
        doc.setTextColor(255, 0, 0);
        doc.text("QR NO DISPONIBLE", 40, yPosition + 25, { align: 'center' });
        yPosition += 30;
      }

      // Línea separadora entre boletos
      if (index < ticketsWithQR.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.line(boletoDetailX, yPosition - 4, boletoDetailX + boletoDetailWidth, yPosition - 4);
        yPosition += 2;
      }
    });

    // ========== TOTAL - CORREGIDO ==========
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 8; // Aumentar espacio antes del total
    
    // Total con mejor separación
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    // "TOTAL:" más a la izquierda
    doc.text("TOTAL:", 15, yPosition + 3);
    
    // Valor del total más a la derecha, con buen espacio
    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0);
    doc.text(`$${totalVenta.toFixed(2)}`, 65, yPosition + 3, { align: 'right' });
    
    yPosition += 10;

    // Línea separadora final
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(5, yPosition, 75, yPosition);
    yPosition += 5;

    // ========== CÓDIGO DE VERIFICACIÓN ==========
    const now = new Date();
    const verificationCode = `V-${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}-${firstTicket.id_boleto || '0000'}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 150);
    doc.text("CÓDIGO DE VERIFICACIÓN:", 40, yPosition, { align: 'center' });
    yPosition += 4;
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(verificationCode, 40, yPosition, { align: 'center' });
    yPosition += 6;

    // ========== INFORMACIÓN ADICIONAL ==========
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    
    // Información sobre dígitos del sorteo
    const infoDigitos = `Este sorteo utiliza boletos de ${digitosBoleto} dígitos (${'0'.repeat(digitosBoleto)} al ${'9'.repeat(digitosBoleto)})`;
    doc.text(infoDigitos, 40, yPosition, { align: 'center' });
    yPosition += 4;
    
    // Leyenda obligatoria para sorteo
    const leyendaSorteo = "PRESENTE ESTE TICKET PARA RECLAMAR PREMIOS. VÁLIDO CON IDENTIFICACIÓN DEL COMPRADOR.";
    const leyendaLines = doc.splitTextToSize(leyendaSorteo, 70);
    leyendaLines.forEach((line, i) => {
      doc.text(line, 40, yPosition + (i * 2.5), { align: 'center' });
    });
    yPosition += (leyendaLines.length * 2.5) + 3;

    // ========== GENERAR Y MOSTRAR PDF ==========
    // Configurar para impresión automática
    doc.autoPrint({ variant: 'non-conform' });

    // Crear blob para compartir
    const blob = doc.output('blob');
    
    // Nombre del archivo
    const compradorNombre = (firstTicket.comprador || "boleto").replace(/[^a-z0-9]/gi, '_');
    const fileName = `Ticket_${colegioNombre.substring(0,10)}_${compradorNombre}_${new Date().toISOString().slice(0,10)}.pdf`;
    const url = URL.createObjectURL(blob);

    // Datos para compartir
    const ticketData = {
      colegioNombre,
      sorteoNum: firstTicket.numero_sorteo || firstTicket.Idsorteo,
      fechaSorteo,
      totalVenta,
      verificationCode,
      digitosBoleto // Agregar dígitos a los datos del ticket
    };

    // ========== MOSTRAR SWEETALERT CON OPCIONES ==========
    // MODIFICACIÓN: Mejorar la visualización del total en el modal
    const result = await Swal.fire({
      title: '🎫 Ticket Listo',
      html: `
        <div style="text-align: center; padding: 10px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 16px; font-weight: bold;">${colegioNombre}</p>
            <p style="margin: 5px 0; font-size: 12px;">Sorteo #${firstTicket.numero_sorteo || firstTicket.Idsorteo || '000'}</p>
            <p style="margin: 5px 0; font-size: 10px; opacity: 0.9;">Boletos de ${digitosBoleto} dígitos</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: left; margin: 10px 0;">
            <p style="margin: 8px 0;"><strong>👤 Comprador:</strong> ${firstTicket.comprador || 'Consumidor final'}</p>
            <p style="margin: 8px 0;"><strong>📅 Fecha sorteo:</strong> ${formatDate(fechaSorteo)}</p>
            <p style="margin: 8px 0;"><strong>🎫 Boletos adquiridos:</strong> ${ticketsWithQR.length}</p>
            
            <!-- CORRECCIÓN: Mejor separación para el total -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0; padding: 12px; background: #fff3f3; border-radius: 6px; border-left: 4px solid #e74c3c;">
              <div style="font-weight: bold; font-size: 14px; color: #333;">💰 Total pagado:</div>
              <div style="font-weight: bold; font-size: 18px; color: #e74c3c;">$${totalVenta.toFixed(2)}</div>
            </div>
          </div>
          
          <div style="margin-top: 15px; padding: 10px; background: #e8f4f8; border-radius: 5px;">
            <p style="margin: 5px 0; font-size: 11px; color: #2c3e50;">
              <strong>📱 CADA BOLETO INCLUYE QR PARA VERIFICACIÓN</strong>
            </p>
            <p style="margin: 5px 0; font-size: 10px; color: #666;">
              ⚠️ Verifique que los boletos tengan ${digitosBoleto} dígitos
            </p>
          </div>
        </div>
      `,
      icon: 'success',
      showCancelButton: true,
      showConfirmButton: true,
      showDenyButton: true,
      confirmButtonText: '<i class="fas fa-download"></i> Descargar',
      denyButtonText: '<i class="fas fa-share-alt"></i> Compartir',
      cancelButtonText: '<i class="fas fa-times"></i> Cerrar',
      customClass: {
        popup: 'swal-ticket-popup',
        confirmButton: 'btn-download',
        denyButton: 'btn-share',
        cancelButton: 'btn-close'
      },
      buttonsStyling: true,
      reverseButtons: false,
      allowOutsideClick: false,
      focusCancel: false,
      width: 420 // Un poco más ancho para mejor visualización
    });

    // Manejar la opción seleccionada
    if (result.isConfirmed) {
      // DESCARGAR PDF
      console.log('📥 Descargando PDF...');
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mensaje de confirmación
      Swal.fire({
        title: '✅ Descargado',
        text: 'El ticket se ha descargado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
    } else if (result.isDenied) {
      // COMPARTIR - Usar API nativa de compartir
      console.log('📤 Intentando compartir...');
      try {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          // API de compartir disponible
          await navigator.share({
            files: [file],
            title: `Ticket de Sorteo - ${colegioNombre}`,
            text: `Ticket para el sorteo #${firstTicket.numero_sorteo || firstTicket.Idsorteo} del ${formatDate(fechaSorteo)}`
          });
          
          // Mensaje de éxito
          Swal.fire({
            title: '✅ Compartido',
            text: 'El ticket se ha compartido correctamente',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          
        } else {
          // Si no hay API de compartir, mostrar opciones
          Swal.fire({
            title: '📤 Compartir Ticket',
            html: `
              <div style="text-align: center; padding: 15px;">
                <p style="margin-bottom: 20px;">Selecciona cómo quieres compartir el ticket:</p>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0;">
                  <button id="open-pdf" style="background: #3498db; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-external-link-alt"></i> Abrir PDF
                  </button>
                  <button id="download-again" style="background: #2ecc71; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-download"></i> Descargar
                  </button>
                  <button id="copy-link" style="background: #9b59b6; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-copy"></i> Copiar enlace
                  </button>
                  <button id="whatsapp-share" style="background: #25D366; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                  </button>
                </div>
                
                <p style="font-size: 12px; color: #666; margin-top: 15px;">
                  ⚠️ <strong>Nota:</strong> El PDF contiene códigos QR para verificación
                </p>
                <p style="font-size: 11px; color: #666;">
                  Boletos de ${digitosBoleto} dígitos
                </p>
              </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            willOpen: () => {
              // Agregar event listeners a los botones personalizados
              document.getElementById('open-pdf')?.addEventListener('click', () => {
                window.open(url, '_blank');
                Swal.close();
              });
              
              document.getElementById('download-again')?.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                Swal.close();
                
                Swal.fire({
                  title: '✅ Descargado',
                  text: 'El ticket se ha descargado',
                  icon: 'success',
                  timer: 1500,
                  showConfirmButton: false
                });
              });
              
              document.getElementById('copy-link')?.addEventListener('click', async () => {
                try {
                  // Crear un enlace temporal
                  const tempLink = document.createElement('a');
                  tempLink.href = url;
                  await navigator.clipboard.writeText(tempLink.href);
                  
                  Swal.fire({
                    title: '✅ Copiado',
                    text: 'Enlace copiado al portapapeles',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                  }).then(() => {
                    Swal.close();
                  });
                } catch (copyError) {
                  console.error('Error al copiar:', copyError);
                  Swal.fire({
                    title: '❌ Error',
                    text: 'No se pudo copiar el enlace',
                    icon: 'error',
                    timer: 1500
                  });
                }
              });
              
              document.getElementById('whatsapp-share')?.addEventListener('click', () => {
                const message = `Ticket de Sorteo\nColegio: ${colegioNombre}\nSorteo: #${firstTicket.numero_sorteo || firstTicket.Idsorteo}\nFecha: ${formatDate(fechaSorteo)}\nTotal: $${totalVenta.toFixed(2)}\n\nDescarga el ticket aquí: ${url}`;
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
                Swal.close();
              });
            }
          });
        }
      } catch (shareError) {
        console.error('Error al compartir:', shareError);
        
        // Fallback: descargar PDF
        Swal.fire({
          title: '⚠️ Error al compartir',
          html: `
            <div style="text-align: center; padding: 10px;">
              <p>No se pudo compartir directamente.</p>
              <p style="margin-top: 15px;">Se ha descargado el PDF para que lo puedas compartir manualmente.</p>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        
        // Descargar automáticamente como fallback
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // CERRAR - No hacer nada, solo cerrar el modal
      console.log('🚪 Cerrando modal sin acción adicional');
    }

    // Agregar CSS para los botones
    const style = document.createElement('style');
    style.textContent = `
      .swal-ticket-popup {
        border-radius: 15px;
        max-width: 420px;
      }
      .btn-download {
        background-color: #2ecc71 !important;
        color: white !important;
        border: none !important;
        padding: 10px 24px !important;
        border-radius: 8px !important;
        font-weight: bold !important;
        font-size: 14px !important;
      }
      .btn-share {
        background-color: #3498db !important;
        color: white !important;
        border: none !important;
        padding: 10px 24px !important;
        border-radius: 8px !important;
        font-weight: bold !important;
        font-size: 14px !important;
      }
      .btn-close {
        background-color: #e74c3c !important;
        color: white !important;
        border: none !important;
        padding: 10px 24px !important;
        border-radius: 8px !important;
        font-weight: bold !important;
        font-size: 14px !important;
      }
      .swal-ticket-popup .swal2-actions {
        margin-top: 20px;
        gap: 10px;
      }
      .swal-ticket-popup .swal2-cancel {
        margin-left: 0 !important;
      }
    `;
    document.head.appendChild(style);

    // Liberar memoria después de 1 minuto
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.head.removeChild(style);
      console.log('🗑️ Recursos liberados');
    }, 60000);

  } catch (error) {
    console.error('❌ Error crítico al generar PDF:', error);
    
    Swal.fire({
      title: 'Error al generar PDF',
      text: 'Hubo un problema técnico. Contacta al administrador.',
      icon: 'error',
      confirmButtonText: 'Entendido'
    });
  }
};

export default generatePDF;