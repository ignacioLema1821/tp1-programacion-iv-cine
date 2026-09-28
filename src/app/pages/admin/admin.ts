import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Pelicula } from '../../models/pelicula';
import { Genero } from '../../models/genero';
import { PeliculasService } from '../../services/peliculas.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  private peliculasService = inject(PeliculasService);

  peliculas = signal<Pelicula[]>([]);
  generos = signal<Genero[]>([]);

  cargando = signal(true);
  guardando = signal(false);

  errorCarga = signal('');
  mensajeError = signal('');
  mensajeExito = signal('');

  // Si es null, creamos una película. Si tiene un ID, la editamos.
  peliculaEditandoId: number | null = null;

  datos = {
    nombre: '',
    duracion: 90,
    sinopsis: ''
  };

  generosSeleccionados: number[] = [];

  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set('');

    try {
      const generos = await this.peliculasService.obtenerGeneros();
      const peliculas = await this.peliculasService.obtenerPeliculas();

      this.generos.set(generos);
      this.peliculas.set(peliculas);
    } catch (error) {
      console.error('Error al cargar administración:', error);
      this.errorCarga.set('No pudimos cargar los datos del panel.');
    } finally {
      this.cargando.set(false);
    }
  }

  cambiarGenero(generoId: number): void {
    if (this.generosSeleccionados.includes(generoId)) {
      // Si ya estaba seleccionado, lo quitamos.
      this.generosSeleccionados = this.generosSeleccionados.filter(
        id => id !== generoId
      );
    } else {
      this.generosSeleccionados.push(generoId);
    }
  }

  editarPelicula(pelicula: Pelicula, formulario: NgForm): void {
    this.peliculaEditandoId = pelicula.id;

    this.datos = {
      nombre: pelicula.nombre,
      duracion: pelicula.duracion,
      sinopsis: pelicula.sinopsis
    };

    // Copiamos los IDs para no modificar la lista original al editar.
    this.generosSeleccionados = [...pelicula.generoIds];

    formulario.resetForm(this.datos);

    this.mensajeError.set('');
    this.mensajeExito.set('');
  }

  cancelarEdicion(formulario: NgForm): void {
    this.peliculaEditandoId = null;

    this.datos = {
      nombre: '',
      duracion: 90,
      sinopsis: ''
    };

    this.generosSeleccionados = [];
    formulario.resetForm(this.datos);
    this.mensajeError.set('');
  }

  async guardarPelicula(formulario: NgForm): Promise<void> {
    if (this.guardando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (
      formulario.invalid ||
      !this.datos.nombre.trim() ||
      !this.datos.sinopsis.trim()
    ) {
      this.mensajeError.set(
        'Completá el nombre, la duración y la sinopsis.'
      );
      return;
    }

    if (
      !Number.isInteger(this.datos.duracion) ||
      this.datos.duracion <= 0
    ) {
      this.mensajeError.set(
        'La duración debe ser un número entero mayor que cero.'
      );
      return;
    }

    if (this.generosSeleccionados.length === 0) {
      this.mensajeError.set('Seleccioná al menos un género.');
      return;
    }

    this.guardando.set(true);

    try {
      await this.peliculasService.guardarPelicula(
        this.peliculaEditandoId,
        this.datos.nombre,
        this.datos.duracion,
        this.datos.sinopsis,
        this.generosSeleccionados
      );

      this.cancelarEdicion(formulario);
      this.mensajeExito.set('La película se guardó correctamente.');

      // Volvemos a consultar para mostrar los datos confirmados por la base.
      await this.cargarDatos();
    } catch (error) {
      console.error('Error al guardar la película:', error);

      this.mensajeError.set(
        'No pudimos guardar la película. Revisá los datos y tus permisos.'
      );
    } finally {
      this.guardando.set(false);
    }
  }
}