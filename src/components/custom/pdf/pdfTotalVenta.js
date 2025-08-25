import jsPDF from "jspdf";

export const generarPDFTotalVenta = (total) => {
    const doc = new jsPDF();

    //Titulo
    doc.setFontSize(18);
    doc.text("Resumen de venta", 20,20);

    //Fecha
    doc.setFontSize(12);
    const fecha = new Date().toLocaleString();
    doc.text(`Fecha: ${fecha}`,20, 30);

    //Total
    doc.setFontSize(16);
    doc.text(`Total de Venta: $${total}`,20, 50);

    //Final
    doc.setFontSize(10);
    doc.text("Sistema Sorteo Treboll", 20, 280);

    //Para abrir o descargar el PDF
    doc.save("total_venta.pdf");
};