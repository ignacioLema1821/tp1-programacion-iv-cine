// Validación: permite escribir o escanear el código y validar cine o candy por separado.
import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ComprasService } from '../../services/compras.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-empleado',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule],
  templateUrl: './empleado.html',
  styleUrl: './empleado.css',
})
export class Empleado implements OnDestroy {
  // ViewChild busca #video en el HTML. ElementRef permite entregar el elemento real del navegador al lector QR.
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  escaneando = signal(false);
  sector: 'cine' | 'candy' = 'cine';
  private controles: { stop(): void } | null = null;
  private numeroEscaneo = 0;
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private compras = inject(ComprasService);
  codigo = '';
  procesando = signal(false);
  mensaje = signal('');
  error = signal('');

  // Según sector, llama a validar cine o candy. La base comprueba permisos y rechaza reutilizar la misma validación.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async validar(formulario: NgForm): Promise<void> {
    if (this.procesando() || formulario.invalid) return;
    this.procesando.set(true);
    this.mensaje.set('');
    this.error.set('');
    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
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
  // Carga el lector QR y lee el video. El callback copia el código; escanear no valida la compra automáticamente.
  async abrirCamara(): Promise<void> {
    if (this.escaneando() || this.procesando()) return;
    // Este contador distingue cada intento; detenerCamara lo cambia para ignorar lecturas que llegan tarde.
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
  // Invalida lecturas pendientes y usa stop para liberar la cámara.
  detenerCamara(): void {
    this.numeroEscaneo++;
    this.controles?.stop();
    this.controles = null;
    this.escaneando.set(false);
  }
  // Angular llama a ngOnDestroy al retirar el componente: aquí liberamos relojes, suscripciones o cámara para no dejarlos activos.
  ngOnDestroy(): void {
    this.detenerCamara();
  }
}
