import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula';
import { PeliculasService } from '../../services/peliculas.service';

@Component({
  selector: 'app-cartelera',
  standalone: true,
  // FormsModule permite usar ngModel y RouterLink permite navegar.
  imports: [FormsModule, RouterLink],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.css',
})
export class Cartelera implements OnInit {
  private peliculasService = inject(PeliculasService);

  // Los signals actualizan la pantalla cuando cambia su valor.
  peliculas = signal<Pelicula[]>([]);
  cargando = signal(true);
  mensajeError = signal('');

  fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  busqueda = '';
  generoSeleccionado = '';
  seccion = 'todas';

  async ngOnInit(): Promise<void> {
    await this.cargarPeliculas();
  }

  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const peliculas = await this.peliculasService.obtenerPeliculas();
      this.peliculas.set(peliculas);
    } catch (error) {
      console.error('Error al cargar la cartelera:', error);
      this.mensajeError.set('No pudimos cargar las películas. Intentá nuevamente.');
    } finally {
      this.cargando.set(false);
    }
  }

  // Reunimos los géneros sin repetirlos.
  get generosDisponibles(): string[] {
    const generos: string[] = [];

    for (const pelicula of this.peliculas()) {
      for (const genero of pelicula.generos) {
        if (!generos.includes(genero)) {
          generos.push(genero);
        }
      }
    }

    generos.sort();
    return generos;
  }

  // Los filtros trabajan sobre las películas que ya cargamos.
  get peliculasFiltradas(): Pelicula[] {
    const resultado: Pelicula[] = [];
    const textoBuscado = this.busqueda.trim().toLowerCase();

    for (const pelicula of this.peliculas()) {
      const nombre = pelicula.nombre.toLowerCase();
      const coincideNombre = nombre.includes(textoBuscado);

      let coincideGenero = true;

      if (this.generoSeleccionado !== '') {
        coincideGenero = pelicula.generos.includes(this.generoSeleccionado);
      }

      const proximoEstreno = !!pelicula.estreno && pelicula.estreno > this.fechaHoy;
      const coincideSeccion =
        this.seccion === 'todas' ||
        (this.seccion === 'proximamente' && proximoEstreno) ||
        (this.seccion === 'actuales' && !proximoEstreno);

      if (coincideNombre && coincideGenero && coincideSeccion) {
        resultado.push(pelicula);
      }
    }

    return resultado;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.generoSeleccionado = '';
    this.seccion = 'todas';
  }
}
