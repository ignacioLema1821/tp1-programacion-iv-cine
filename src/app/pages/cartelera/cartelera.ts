// Cartelera: carga películas mediante PeliculasService y las filtra en memoria para mostrarlas.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pelicula } from '../../models/pelicula';
import { PeliculasService } from '../../services/peliculas.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-cartelera',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule, RouterLink],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.css',
})
export class Cartelera implements OnInit {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private peliculasService = inject(PeliculasService);

  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  peliculas = signal<Pelicula[]>([]);
  cargando = signal(true);
  mensajeError = signal('');

  fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  busqueda = '';
  generoSeleccionado = '';
  seccion = 'todas';

  // Angular llama a ngOnInit una vez, después de establecer los inputs iniciales. implements OnInit comprueba el contrato; no llama al método por sí mismo.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async ngOnInit(): Promise<void> {
    // this busca cargarPeliculas en este componente. await espera al servicio; la interfaz OnInit no realiza la consulta por sí sola.
    await this.cargarPeliculas();
  }

  // Obtiene películas del servicio y las guarda en la señal. cargando solo controla el aviso mientras espera.
  async cargarPeliculas(): Promise<void> {
    this.cargando.set(true);
    this.mensajeError.set('');

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
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

  // Un getter se lee como una propiedad (sin paréntesis). Recorre géneros y usa includes para no repetirlos.
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

  // Devuelve una lista nueva según nombre, género y sección. resultado es una variable local de este getter.
  get peliculasFiltradas(): Pelicula[] {
    const resultado: Pelicula[] = [];
    // trim quita espacios de los extremos y toLowerCase permite buscar sin distinguir mayúsculas.
    const textoBuscado = this.busqueda.trim().toLowerCase();

    for (const pelicula of this.peliculas()) {
      const nombre = pelicula.nombre.toLowerCase();
      const coincideNombre = nombre.includes(textoBuscado);

      let coincideGenero = true;

      if (this.generoSeleccionado !== '') {
        coincideGenero = pelicula.generos.includes(this.generoSeleccionado);
      }

      // !! convierte la presencia de estreno a booleano. Fechas AAAA-MM-DD se pueden comparar en este formato.
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

  // Restaura los filtros; el getter vuelve a mostrar las películas ya cargadas, sin consultar la base otra vez.
  limpiarFiltros(): void {
    this.busqueda = '';
    this.generoSeleccionado = '';
    this.seccion = 'todas';
  }
}
