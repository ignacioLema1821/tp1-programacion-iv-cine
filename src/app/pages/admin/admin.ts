// Panel de películas: carga el listado y controla los formularios de creación, edición y detalles.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Pelicula } from '../../models/pelicula';
import { Genero } from '../../models/genero';
import { PeliculasService } from '../../services/peliculas.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-admin',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin implements OnInit {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private peliculasService = inject(PeliculasService);

  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  peliculas = signal<Pelicula[]>([]);
  generos = signal<Genero[]>([]);

  cargando = signal(true);
  guardando = signal(false);

  errorCarga = signal('');
  mensajeError = signal('');
  mensajeExito = signal('');

  // number | null: null significa nueva película; un número conserva el ID de la que se está editando.
  peliculaEditandoId: number | null = null;

  datos = {
    nombre: '',
    duracion: 90,
    sinopsis: '',
  };

  generosSeleccionados: number[] = [];
  detalleId: number | null = null;
  detalles = {
    imagen: '',
    edad: 0,
    destacada: false,
    estreno: '',
    dias: 7,
    precio: null as number | null,
  };

  // Angular llama a ngOnInit una vez, después de establecer los inputs iniciales. implements OnInit comprueba el contrato; no llama al método por sí mismo.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  // Pide géneros y películas al servicio; set guarda los resultados para que el HTML los muestre.
  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set('');

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
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

  // Alterna un ID en la selección: includes comprueba si existe y filter crea una lista sin ese género.
  cambiarGenero(generoId: number): void {
    if (this.generosSeleccionados.includes(generoId)) {
      this.generosSeleccionados = this.generosSeleccionados.filter((id) => id !== generoId);
    } else {
      this.generosSeleccionados.push(generoId);
    }
  }

  // Carga una copia de la película en el formulario. resetForm también reinicia el estado de validación.
  editarPelicula(pelicula: Pelicula, formulario: NgForm): void {
    this.peliculaEditandoId = pelicula.id;

    this.datos = {
      nombre: pelicula.nombre,
      duracion: pelicula.duracion,
      sinopsis: pelicula.sinopsis,
    };

    this.generosSeleccionados = [...pelicula.generoIds];

    // NgForm agrupa los campos; resetForm carga estos valores y deja el formulario como no enviado/no tocado.
    formulario.resetForm(this.datos);

    this.mensajeError.set('');
    this.mensajeExito.set('');
  }

  // Vuelve al modo de creación y limpia el formulario; no modifica la película guardada.
  cancelarEdicion(formulario: NgForm): void {
    this.peliculaEditandoId = null;

    this.datos = {
      nombre: '',
      duracion: 90,
      sinopsis: '',
    };

    this.generosSeleccionados = [];
    formulario.resetForm(this.datos);
    this.mensajeError.set('');
  }

  // Valida campos y géneros, espera al servicio y vuelve a cargar los datos confirmados por la base.
  async guardarPelicula(formulario: NgForm): Promise<void> {
    if (this.guardando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (formulario.invalid || !this.datos.nombre.trim() || !this.datos.sinopsis.trim()) {
      this.mensajeError.set('Completá el nombre, la duración y la sinopsis.');
      return;
    }

    if (!Number.isInteger(this.datos.duracion) || this.datos.duracion <= 0) {
      this.mensajeError.set('La duración debe ser un número entero mayor que cero.');
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
        this.generosSeleccionados,
      );

      this.cancelarEdicion(formulario);
      this.mensajeExito.set('La película se guardó correctamente.');

      await this.cargarDatos();
    } catch (error) {
      console.error('Error al guardar la película:', error);

      this.mensajeError.set('No pudimos guardar la película. Revisá los datos y tus permisos.');
    } finally {
      this.guardando.set(false);
    }
  }
  // find busca la primera película cuyo ID coincide y copia sus datos al segundo formulario.
  cargarDetalles(): void {
    const pelicula = this.peliculas().find((p) => p.id === this.detalleId);
    if (!pelicula) return;
    this.detalles = {
      imagen: pelicula.imagen,
      edad: pelicula.edad_minima,
      destacada: pelicula.destacada,
      estreno: pelicula.estreno || '',
      dias: pelicula.dias_preventa,
      precio: pelicula.precio_preventa,
    };
  }
  // Guarda los datos complementarios sin volver a crear la película.
  async guardarDetalles(formulario: NgForm): Promise<void> {
    if (!this.detalleId || formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.mensajeError.set('');
    try {
      await this.peliculasService.guardarDetalles(
        this.detalleId,
        this.detalles.imagen,
        this.detalles.edad,
        this.detalles.destacada,
        this.detalles.estreno,
        this.detalles.dias,
        this.detalles.precio,
      );
      await this.cargarDatos();
      this.mensajeExito.set('Detalles guardados.');
    } catch (error) {
      this.mensajeError.set(
        error instanceof Error ? error.message : 'No pudimos guardar los detalles.',
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
