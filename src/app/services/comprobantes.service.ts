// Servicio de archivos: convierte el código de una compra en QR y genera su PDF.
import { Injectable } from '@angular/core';
import { Comprobante } from '../models/compra';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({ providedIn: 'root' })
export class ComprobantesService {
  // Genera una imagen PNG como texto data URL, que puede usarse directamente como src de una imagen.
  async qr(codigo: string): Promise<string> {
    // default contiene el objeto principal de esta biblioteca al cargarla con import().
    const { default: QRCode } = await import('qrcode');
    return QRCode.toDataURL(codigo, { width: 240, margin: 2 });
  }

  // Arma el PDF con los datos confirmados de la compra. import() carga la biblioteca solamente cuando se necesita.
  async descargar(compra: Comprobante): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const qr = await this.qr(compra.codigo);
    let y = 20;
    // Función flecha local: usa pdf e y de este método para partir texto largo y avanzar la posición vertical.
    const linea = (texto: string) => {
      const lineas = pdf.splitTextToSize(texto, 170) as string[];
      for (const textoLinea of lineas) {
        if (y > 275) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(textoLinea, 20, y);
        y += 8;
      }
    };
    pdf.setFontSize(12);
    linea('CineApp - Entrada');
    linea(compra.pelicula_nombre + ' - ' + compra.sala_nombre);
    linea(
      new Date(compra.inicio).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
      }),
    );
    linea('Estado: ' + compra.estado + ' - Pago simulado');
    if (compra.edad_minima > 0)
      linea('Edad minima: ' + compra.edad_minima + '. Debe asistir un adulto.');
    for (const entrada of compra.entradas)
      linea(
        'Butaca ' +
          entrada.fila +
          entrada.numero +
          ' - ' +
          entrada.tipo +
          ' - ARS ' +
          entrada.precio.toFixed(2),
      );
    linea('Candy');
    for (const producto of compra.candy) linea(producto.cantidad + ' x ' + producto.nombre);
    linea('Descuento total: ARS ' + compra.descuento.toFixed(2));
    linea('Total: ARS ' + compra.total.toFixed(2));
    linea(
      'Credito: ARS ' +
        compra.credito_usado.toFixed(2) +
        ' - Pago simulado: ARS ' +
        compra.pago_simulado.toFixed(2),
    );
    if (y > 185) {
      pdf.addPage();
      y = 20;
    }
    // Agrega al PDF la misma imagen QR que identifica la compra; cada sector controla su uso en la base.
    pdf.addImage(qr, 'PNG', 20, y, 55, 55);
    y += 65;
    linea('Codigo: ' + compra.codigo);
    linea('El QR sirve para cine y candy. Cada sector se valida una sola vez.');
    linea('Conserva el codigo y el enlace en privado.');
    pdf.save('entrada-' + compra.codigo + '.pdf');
  }
}
