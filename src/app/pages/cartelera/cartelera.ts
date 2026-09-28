import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pelicula } from '../../models/pelicula';
import { PeliculasService } from '../../services/peliculas.service';

@Component({
  // Es el nombre de la etiqueta que usa app.html.
  selector: 'app-cartelera',
  standalone: true,

  // FormsModule permite conectar los campos del HTML con ngModel.
  imports: [FormsModule],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.css'
})
export class Cartelera implements OnInit {
  private peliculasService = inject(PeliculasService);

  // Estos valores cambian al recibir la respuesta de la base.
  // Los signals avisan a Angular para que actualice la pantalla.
  peliculas = signal<Pelicula[]>([]);
  cargando = signal(true);
  mensajeError = signal('');

  // Guardan lo que el usuario elige en los filtros.
  busqueda = '';
  generoSeleccionado = '';

  // Angular llama a este método una vez por cada instancia del componente.
  async ngOnInit(): Promise<void> {
    await this.cargarPeliculas();
  }

  // Se usa tanto al iniciar como al presionar Reintentar.
  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    try {
      const peliculas = await this.peliculasService.obtenerPeliculas();
      this.peliculas.set(peliculas);
    } catch (error) {
      // Dejamos el detalle técnico en consola y un mensaje claro en pantalla.
      console.error('Error al cargar la cartelera:', error);

      this.mensajeError.set(
        'No pudimos cargar las películas. Intentá nuevamente.'
      );
    } finally {
      // Finalizamos la carga tanto si salió bien como si hubo un error.
      this.cargando.set(false);
    }
  }

  // Calcula los géneros que deben aparecer en el desplegable.
  get generosDisponibles(): string[] {
    const generos: string[] = [];

    // peliculas() lee el valor actual del signal.
    for (const pelicula of this.peliculas()) {
      for (const genero of pelicula.generos) {
        // El signo ! significa "no": lo agregamos si todavía no está.
        if (!generos.includes(genero)) {
          generos.push(genero);
        }
      }
    }

    generos.sort();
    return generos;
  }

  // Filtra la lista en memoria; no realiza consultas nuevas a Supabase.
  get peliculasFiltradas(): Pelicula[] {
    const resultado: Pelicula[] = [];

    // Quitamos espacios de los extremos e ignoramos mayúsculas/minúsculas.
    const textoBuscado = this.busqueda.trim().toLowerCase();

    for (const pelicula of this.peliculas()) {
      const nombre = pelicula.nombre.toLowerCase();
      const coincideNombre = nombre.includes(textoBuscado);

      // Si no se selecciona un género, todos pasan este filtro.
      let coincideGenero = true;

      if (this.generoSeleccionado !== '') {
        coincideGenero = pelicula.generos.includes(
          this.generoSeleccionado
        );
      }

      // La película debe cumplir las dos condiciones.
      if (coincideNombre && coincideGenero) {
        resultado.push(pelicula);
      }
    }

    return resultado;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.generoSeleccionado = '';
  }
}

