import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pelicula } from '../../models/pelicula';
import { Funcion } from '../../models/funcion';
import { PeliculasService } from '../../services/peliculas.service';
import { FuncionesService } from '../../services/funciones.service';

@Component({
  selector: 'app-funciones-pelicula',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './funciones-pelicula.html',
  styleUrl: './funciones-pelicula.css'
})
export class FuncionesPelicula {
  private ruta = inject(ActivatedRoute);
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  cargando = signal(true);
  mensajeError = signal('');

  private peliculaId = 0;

  // Nos permite descartar una respuesta vieja si cambia la película.
  private numeroCarga = 0;

  constructor() {
    // Leemos el ID de la dirección y escuchamos si cambia.
    // takeUntilDestroyed deja de escuchar cuando salimos del componente.
    this.ruta.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(parametros => {
        this.peliculaId = Number(parametros.get('peliculaId'));
        void this.cargarDatos();
      });
  }

  async cargarDatos(): Promise<void> {
    const cargaActual = ++this.numeroCarga;
    const id = this.peliculaId;

    this.cargando.set(true);
    this.mensajeError.set('');
    this.pelicula.set(null);
    this.funciones.set([]);

    // También validamos el ID si alguien escribe la dirección a mano.
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.mensajeError.set('La dirección de la película no es válida.');
      this.cargando.set(false);
      return;
    }

    try {
      // Reutilizamos el servicio existente para buscar la película.
      const peliculas = await this.peliculasService.obtenerPeliculas();

      if (cargaActual !== this.numeroCarga) {
        return;
      }

      const peliculaEncontrada = peliculas.find(
        pelicula => pelicula.id === id
      );

      if (!peliculaEncontrada) {
        this.mensajeError.set('No encontramos esa película.');
        return;
      }

      // true indica que queremos únicamente funciones futuras.
      const funciones = await this.funcionesService.obtenerFunciones(
        id,
        true
      );

      if (cargaActual !== this.numeroCarga) {
        return;
      }

      this.pelicula.set(peliculaEncontrada);
      this.funciones.set(funciones);
    } catch (error) {
      if (cargaActual === this.numeroCarga) {
        console.error('Error al cargar las funciones:', error);
        this.mensajeError.set(
          'No pudimos cargar los horarios. Intentá nuevamente.'
        );
      }
    } finally {
      if (cargaActual === this.numeroCarga) {
        this.cargando.set(false);
      }
    }
  }

  // Presentamos el importe con separadores y moneda de Argentina.
  mostrarPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS'
    });
  }
}