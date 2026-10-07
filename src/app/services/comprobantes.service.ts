import { Injectable } from '@angular/core';
import { Comprobante } from '../models/compra';

@Injectable({ providedIn: 'root' })
export class ComprobantesService {
  async qr(codigo: string): Promise<string> {
    // El QR guarda el mismo código que puede escribir el empleado a mano.
    const QRCode = await import('qrcode');
    return QRCode.toDataURL(codigo, { width: 240, margin: 2 });
  }

  async descargar(compra: Comprobante): Promise<void> {
    // Cargamos la biblioteca al descargar, sin agrandar la carga inicial.
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF();
    const qr = await this.qr(compra.codigo);
    let y = 20;
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
    pdf.addImage(qr, 'PNG', 20, y, 55, 55);
    y += 65;
    linea('Codigo: ' + compra.codigo);
    linea('El QR sirve para cine y candy. Cada sector se valida una sola vez.');
    linea('Conserva el codigo y el enlace en privado.');
    pdf.save('entrada-' + compra.codigo + '.pdf');
  }
}
