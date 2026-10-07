import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ComprasService } from '../../services/compras.service';

@Component({
  selector: 'app-empleado',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './empleado.html',
  styleUrl: './empleado.css',
})
export class Empleado implements OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;
  escaneando = signal(false);
  sector: 'cine' | 'candy' = 'cine';
  private controles: { stop(): void } | null = null;
  private numeroEscaneo = 0;
  private compras = inject(ComprasService);
  codigo = '';
  procesando = signal(false);
  mensaje = signal('');
  error = signal('');

  async validar(formulario: NgForm): Promise<void> {
    if (this.procesando() || formulario.invalid) return;
    this.procesando.set(true);
    this.mensaje.set('');
    this.error.set('');
    try {
      if (this.sector === 'cine') {
        const entrada = await this.compras.validar(this.codigo.trim());
        this.mensaje.set(
          'Entrada validada: ' +
            entrada.pelicula +
            ', ' +
            entrada.sala +
            ', butacas ' +
            entrada.butacas,
        );
      } else {
        const resultado = await this.compras.validarCandy(this.codigo.trim());
        this.mensaje.set(
          'Candy validado: ' +
            resultado.productos.map((p) => p.cantidad + ' × ' + p.nombre).join(', '),
        );
      }
      formulario.resetForm();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos validar la entrada.');
    } finally {
      this.procesando.set(false);
    }
  }
  async abrirCamara(): Promise<void> {
    if (this.escaneando() || this.procesando()) return;
    const escaneo = ++this.numeroEscaneo;
    this.escaneando.set(true);
    this.error.set('');
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (escaneo !== this.numeroEscaneo || !this.video) return;
      const lector = new BrowserQRCodeReader();
      const controles = await lector.decodeFromVideoDevice(
        undefined,
        this.video.nativeElement,
        (resultado, _error, control) => {
          if (resultado && escaneo === this.numeroEscaneo) {
            this.codigo = resultado.getText();
            control.stop();
            this.escaneando.set(false);
            this.mensaje.set('Código leído. Revisá el sector y presioná Validar.');
          }
        },
      );
      if (escaneo !== this.numeroEscaneo || !this.escaneando()) controles.stop();
      else this.controles = controles;
    } catch {
      if (escaneo === this.numeroEscaneo) {
        this.escaneando.set(false);
        this.error.set('No pudimos abrir la cámara. Permití el acceso o ingresá el código a mano.');
      }
    }
  }
  detenerCamara(): void {
    this.numeroEscaneo++;
    this.controles?.stop();
    this.controles = null;
    this.escaneando.set(false);
  }
  ngOnDestroy(): void {
    this.detenerCamara();
  }
}
