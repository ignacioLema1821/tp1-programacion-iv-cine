import {
  Component,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Butaca,
  FilaButacas,
  FuncionConRecargo
} from '../../models/butaca';
import { ButacasService } from '../../services/butacas.service';

@Component({
  selector: 'app-butacas',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './butacas.html',
  styleUrl: './butacas.css'
})
export class Butacas implements OnDestroy {
  private ruta = inject(ActivatedRoute);
  private butacasService = inject(ButacasService);

  private funcionId = 0;
  private numeroCarga = 0;

  funcion = signal<FuncionConRecargo | null>(null);
  filas = signal<FilaButacas[]>([]);
  seleccionadas = signal<Butaca[]>([]);
  cargando = signal(true);
  mensajeError = signal('');
  funcionComenzada = signal(false);

  // computed recalcula el total cuando cambia la selección o la función.
  total = computed(() => {
    let centavos = 0;

    for (const butaca of this.seleccionadas()) {
      centavos += this.precioEnCentavos(butaca);
    }

    return centavos / 100;
  });

  // Si la pantalla queda abierta, comprobamos si ya comenzó la función.
  private reloj = setInterval(() => this.comprobarHorario(), 1000);

  constructor() {
    // Leemos el ID de la función desde la dirección.
    // Dejamos de escuchar los cambios cuando se destruye el componente.
    this.ruta.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(parametros => {
        this.funcionId = Number(parametros.get('funcionId'));
        void this.cargarDatos();
      });
  }

  // Al salir, detenemos el reloj e invalidamos las consultas pendientes.
  ngOnDestroy(): void {
    clearInterval(this.reloj);
    this.numeroCarga++;
  }

  async cargarDatos(): Promise<void> {
    const cargaActual = ++this.numeroCarga;
    const id = this.funcionId;

    this.cargando.set(true);
    this.mensajeError.set('');
    this.funcion.set(null);
    this.filas.set([]);
    this.seleccionadas.set([]);
    this.funcionComenzada.set(false);

    if (!Number.isSafeInteger(id) || id <= 0) {
      this.mensajeError.set('La dirección de la función no es válida.');
      this.cargando.set(false);
      return;
    }

    try {
      const funcion = await this.butacasService.obtenerFuncion(id);

      // Ignoramos la respuesta si el usuario ya cambió de función.
      if (cargaActual !== this.numeroCarga) {
        return;
      }

      if (!funcion) {
        this.mensajeError.set('La función no existe o fue eliminada.');
        return;
      }

      if (!funcion.sala || !funcion.pelicula) {
        throw new Error('Faltan los datos de la sala o la película.');
      }

      this.funcion.set(funcion);
      this.comprobarHorario();

      if (this.funcionComenzada()) {
        return;
      }

      const butacas = await this.butacasService.obtenerButacas(
        funcion.sala_id
      );

      if (cargaActual !== this.numeroCarga) {
        return;
      }

      if (butacas.length === 0) {
        this.mensajeError.set(
          'Esta sala todavía no tiene un plano cargado.'
        );
        return;
      }

      this.filas.set(this.agruparPorFila(butacas));
      this.comprobarHorario();
    } catch (error) {
      if (cargaActual === this.numeroCarga) {
        console.error('Error al cargar las butacas:', error);
        this.mensajeError.set(
          'No pudimos cargar el plano. Intentá nuevamente.'
        );
      }
    } finally {
      if (cargaActual === this.numeroCarga) {
        this.cargando.set(false);
      }
    }
  }

  // Transformamos la lista de la base en filas con tres bloques.
  private agruparPorFila(butacas: Butaca[]): FilaButacas[] {
    const filas: FilaButacas[] = [];

    for (const butaca of butacas) {
      let fila = filas.find(fila => fila.letra === butaca.fila);

      if (!fila) {
        fila = {
          letra: butaca.fila,
          accesible: butaca.tipo === 'accesible',
          bloques: [
            { numero: 1, butacas: [] },
            { numero: 2, butacas: [] },
            { numero: 3, butacas: [] }
          ]
        };

        filas.push(fila);
      }

      const bloque = fila.bloques.find(
        bloque => bloque.numero === butaca.bloque
      );

      if (bloque) {
        bloque.butacas.push(butaca);
      }
    }

    return filas;
  }

  estaSeleccionada(butaca: Butaca): boolean {
    return this.seleccionadas().some(
      elegida => elegida.id === butaca.id
    );
  }

  alternarButaca(butaca: Butaca): void {
    this.comprobarHorario();

    if (
      this.cargando() ||
      this.funcionComenzada() ||
      !this.funcion()
    ) {
      return;
    }

    if (this.estaSeleccionada(butaca)) {
      // Conservamos todas excepto la que volvieron a tocar.
      this.seleccionadas.set(
        this.seleccionadas().filter(
          elegida => elegida.id !== butaca.id
        )
      );
    } else {
      // Copiamos las seleccionadas y agregamos la nueva butaca.
      const nuevas = [...this.seleccionadas(), butaca];
      this.seleccionadas.set(nuevas);
    }
  }

  limpiarSeleccion(): void {
    this.seleccionadas.set([]);
  }

  private comprobarHorario(): void {
    const funcion = this.funcion();

    if (!funcion || this.funcionComenzada()) {
      return;
    }

    if (new Date(funcion.inicio).getTime() <= Date.now()) {
      this.funcionComenzada.set(true);
      this.seleccionadas.set([]);
    }
  }

  // Redondeamos cada entrada a centavos antes de sumar los importes.
  private precioEnCentavos(butaca: Butaca): number {
    const funcion = this.funcion();

    if (!funcion || !funcion.sala) {
      return 0;
    }

    const base = Math.round(funcion.precio_base * 100);

    if (butaca.tipo === 'vip') {
      return Math.round(
        base * (1 + funcion.sala.recargo_vip / 100)
      );
    }

    return base;
  }

  precioButaca(butaca: Butaca): number {
    return this.precioEnCentavos(butaca) / 100;
  }

  nombreTipo(butaca: Butaca): string {
    if (butaca.tipo === 'vip') {
      return 'VIP';
    }

    if (butaca.tipo === 'accesible') {
      return 'Accesible';
    }

    return 'Común';
  }

  // La letra permite reconocer el tipo sin depender solo del color.
  marcaButaca(butaca: Butaca): string {
    if (this.estaSeleccionada(butaca)) {
      return '✓';
    }

    if (butaca.tipo === 'vip') {
      return 'V';
    }

    if (butaca.tipo === 'accesible') {
      return 'A';
    }

    return 'C';
  }

  mostrarPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS'
    });
  }
}
