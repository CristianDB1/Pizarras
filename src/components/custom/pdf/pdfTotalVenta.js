import jsPDF from "jspdf";

export const generarPDFTotalVenta = (total,ventas) => {
    const doc = new jsPDF();

    //Titulo
    doc.setFontSize(18);
    doc.text("Resumen de venta", 20,20);

    //Fecha
    doc.setFontSize(12);
    const fecha = new Date().toLocaleString();
    doc.text(`Fecha: ${fecha}`,20, 30);

    //Total
    let y = 40;
    ventas.forEach((v,i) => {
        doc.setFontSize(12);
        doc.text(
            `${i+1}. Boleto: ${v.numero} | Cant: ${v.cantidad} | $${v.subtotal}`,
            20,
            y
        );
        y+=10;
    });

    doc.setFontSize(16);
    doc.text(`Total: $${total}`,20, y+10);

    //Final
    doc.setFontSize(10);
    doc.text("Sistema Sorteo Treboll", 20, 280);

    //Para abrir o descargar el PDF
    doc.save("total_venta.pdf");
};