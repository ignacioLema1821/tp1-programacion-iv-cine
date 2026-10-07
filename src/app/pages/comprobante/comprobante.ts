import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Comprobante as DatosComprobante } from '../../models/compra';
import { ComprasService } from '../../services/compras.service';
import { ComprobantesService } from '../../services/comprobantes.service';

@Component({
  selector: 'app-comprobante',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './comprobante.html',
  styleUrl: './comprobante.css',
})
export class Comprobante {
  private ruta = inject(ActivatedRoute);
  private compras = inject(ComprasService);
  private archivos = inject(ComprobantesService);
  compra = signal<DatosComprobante | null>(null);
  imagenQr = signal('');
  error = signal('');
  descargando = signal(false);
  private numeroCarga = 0;

  constructor() {
    this.ruta.paramMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      void this.cargar(parametros.get('codigo') || '');
    });
  }

  async cargar(codigo: string): Promise<void> {
    const carga = ++this.numeroCarga;
    this.compra.set(null);
    this.imagenQr.set('');
    this.error.set('');
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
