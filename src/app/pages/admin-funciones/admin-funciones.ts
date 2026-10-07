import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Pelicula } from '../../models/pelicula';
import { Funcion } from '../../models/funcion';
import { PeliculasService } from '../../services/peliculas.service';
import { FuncionesService } from '../../services/funciones.service';

@Component({
  selector: 'app-admin-funciones',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-funciones.html',
  styleUrl: './admin-funciones.css',
})
export class AdminFunciones implements OnInit {
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);

  peliculas = signal<Pelicula[]>([]);
  funciones = signal<Funcion[]>([]);

  cargando = signal(true);
  guardando = signal(false);
  eliminando = signal(false);

  errorCarga = signal('');
  mensajeError = signal('');
  mensajeExito = signal('');

  // Guarda la función elegida mientras esperamos la confirmación.
  funcionAEliminar = signal<Funcion | null>(null);

  peliculaId: number | null = null;
  repetir = false;
  fechaHasta = '';
  diasSeleccionados: number[] = [];
  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  fecha = '';
  hora = '';
  formato = '2D';
  idioma = 'castellano';
  precio: number | null = null;

  formatos = ['2D', '3D', '4D', '5D'];

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set('');

    try {
      const peliculas = await this.peliculasService.obtenerPeliculas();
      const funciones = await this.funcionesService.obtenerFunciones();

      this.peliculas.set(peliculas);
      this.funciones.set(funciones);
    } catch (error) {
      console.error('Error al cargar funciones:', error);
      this.errorCarga.set('No pudimos cargar los datos de esta pantalla.');
    } finally {
      this.cargando.set(false);
    }
  }

  async programarFuncion(formulario: NgForm): Promise<void> {
    if (this.guardando() || this.eliminando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.funcionAEliminar.set(null);

    if (formulario.invalid || this.peliculaId === null || this.precio === null) {
      this.mensajeError.set('Completá todos los campos correctamente.');
      return;
    }

    if (!Number.isFinite(this.precio) || this.precio <= 0 || this.precio > 99999999.99) {
      this.mensajeError.set('Ingresá un precio válido mayor que cero.');
      return;
    }

    const inicio = new Date(`${this.fecha}T${this.hora}:00-03:00`);

    if (Number.isNaN(inicio.getTime()) || inicio.getTime() <= Date.now()) {
      this.mensajeError.set('Elegí una fecha y hora futuras.');
      return;
    }

    this.guardando.set(true);

    try {
      if (this.repetir) {
        const cantidad = await this.funcionesService.programarPeriodo(
          this.peliculaId,
          this.fecha,
          this.fechaHasta,
          this.hora,
          this.diasSeleccionados,
          this.formato,
          this.idioma,
          this.precio,
        );
        await this.cargarDatos();
        this.mensajeExito.set('Se programaron ' + cantidad + ' funciones.');
        return;
      }
      const funcionId = await this.funcionesService.programarFuncion(
        this.peliculaId,
        inicio.toISOString(),
        this.formato,
        this.idioma,
        this.precio,
      );

      formulario.resetForm({
        peliculaId: null,
        fecha: '',
        hora: '',
        formato: '2D',
        idioma: 'castellano',
        precio: null,
      });

      this.mensajeExito.set('La función se programó correctamente.');

      await this.cargarDatos();

      const funcionCreada = this.funciones().find((funcion) => funcion.id === funcionId);

      if (funcionCreada && funcionCreada.sala) {
        this.mensajeExito.set(`Función programada correctamente en ${funcionCreada.sala.nombre}.`);
      }
    } catch (error) {
      console.error('Error al programar la función:', error);

      const mensajesConocidos = [
        'No hay salas disponibles para ese horario.',
        'La fecha y hora deben ser futuras.',
        'La película seleccionada no existe.',
        'Solo el administrador puede programar funciones.',
        'El formato no es válido.',
        'El idioma no es válido.',
        'El precio debe ser un número mayor que cero.',
      ];

      if (error instanceof Error && mensajesConocidos.includes(error.message)) {
        this.mensajeError.set(error.message);
      } else {
        this.mensajeError.set(
          'No pudimos programar la función. Revisá los datos e intentá nuevamente.',
        );
      }
    } finally {
      this.guardando.set(false);
    }
  }

  esFuncionFutura(funcion: Funcion): boolean {
    return new Date(funcion.inicio).getTime() > Date.now();
  }

  solicitarEliminacion(funcion: Funcion): void {
    if (this.guardando() || this.eliminando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    // Todavía no borramos nada: mostramos qué se va a eliminar.
    this.funcionAEliminar.set(funcion);
  }

  cancelarEliminacion(): void {
    if (!this.eliminando()) {
      this.funcionAEliminar.set(null);
    }
  }

  async confirmarEliminacion(): Promise<void> {
    const funcion = this.funcionAEliminar();

    if (!funcion || this.eliminando() || this.guardando()) {
      return;
    }

    this.eliminando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    try {
      await this.funcionesService.eliminarFuncion(funcion.id);

      this.funcionAEliminar.set(null);
      this.mensajeExito.set('La función se eliminó correctamente.');

      await this.cargarDatos();
    } catch (error) {
      console.error('Error al eliminar la función:', error);

      const mensajesConocidos = [
        'Solo el administrador puede eliminar funciones.',
        'La función no existe o ya comenzó.',
      ];

      if (error instanceof Error && mensajesConocidos.includes(error.message)) {
        this.mensajeError.set(error.message);
      } else {
        this.mensajeError.set('No pudimos eliminar la función. Intentá nuevamente.');
      }
    } finally {
      this.eliminando.set(false);
    }
  }
  cambiarDia(dia: number): void {
    if (this.diasSeleccionados.includes(dia))
      this.diasSeleccionados = this.diasSeleccionados.filter((d) => d !== dia);
    else this.diasSeleccionados.push(dia);
  }
}
