// Comprobante: toma el código de la URL, consulta la compra y permite descargar su PDF.
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// as cambia el nombre de la importación para distinguir el modelo de la clase de este componente.
import { Comprobante as DatosComprobante } from '../../models/compra';
import { ComprasService } from '../../services/compras.service';
import { ComprobantesService } from '../../services/comprobantes.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-comprobante',
  standalone: true,
  // imports habilita en este HTML las directivas, pipes o componentes indicados; no crea por sí solo servicios ni datos.
  imports: [DatePipe, RouterLink],
  templateUrl: './comprobante.html',
  styleUrl: './comprobante.css',
})
export class Comprobante {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private ruta = inject(ActivatedRoute);
  private compras = inject(ComprasService);
  private archivos = inject(ComprobantesService);
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  compra = signal<DatosComprobante | null>(null);
  imagenQr = signal('');
  error = signal('');
  descargando = signal(false);
  private numeroCarga = 0;

  // Escucha codigo en la URL; takeUntilDestroyed cancela esa escucha cuando Angular retira el componente.
  constructor() {
    this.ruta.paramMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      void this.cargar(parametros.get('codigo') || '');
    });
  }

  // Pide la compra y genera el QR. numeroCarga impide mezclar datos si cambió el código mientras esperaba.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async cargar(codigo: string): Promise<void> {
    const carga = ++this.numeroCarga;
    this.compra.set(null);
    this.imagenQr.set('');
    this.error.set('');
    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      const compra = await this.compras.comprobante(codigo);
      const qr = await this.archivos.qr(codigo);
      if (carga === this.numeroCarga) {
        this.compra.set(compra);
        this.imagenQr.set(qr);
      }
    } catch (error) {
      if (carga === this.numeroCarga)
        this.error.set(error instanceof Error ? error.message : 'No pudimos abrir el comprobante.');
    }
  }

  // Usa la compra confirmada para generar el PDF y evita iniciar dos descargas a la vez.
  async descargar(): Promise<void> {
    const compra = this.compra();
    if (!compra || this.descargando()) return;
    this.descargando.set(true);
    try {
      await this.archivos.descargar(compra);
    } catch {
      this.error.set('No pudimos generar el PDF. Intentá nuevamente.');
    } finally {
      this.descargando.set(false);
    }
  }
}
