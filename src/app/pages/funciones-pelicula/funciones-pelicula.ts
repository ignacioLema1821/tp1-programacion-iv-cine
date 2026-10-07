// Horarios de una película: lee el ID de la URL y muestra funciones, preventa y reseñas.
import { Resenas } from '../resenas/resenas';
import { CatalogoService } from '../../services/catalogo.service';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pelicula } from '../../models/pelicula';
import { Funcion } from '../../models/funcion';
import { PeliculasService } from '../../services/peliculas.service';
import { FuncionesService } from '../../services/funciones.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-funciones-pelicula',
  standalone: true,
  // imports habilita en este HTML las directivas, pipes o componentes indicados; no crea por sí solo servicios ni datos.
  imports: [RouterLink, DatePipe, Resenas],
  templateUrl: './funciones-pelicula.html',
  styleUrl: './funciones-pelicula.css',
})
export class FuncionesPelicula {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private ruta = inject(ActivatedRoute);
  private catalogo = inject(CatalogoService);
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  aviso = signal('');
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);

  pelicula = signal<Pelicula | null>(null);
  funciones = signal<Funcion[]>([]);
  cargando = signal(true);
  mensajeError = signal('');

  private peliculaId = 0;

  private numeroCarga = 0;

  // ActivatedRoute da los parámetros de esta dirección; paramMap es un observable que avisa si cambia peliculaId.
  constructor() {
    this.ruta.paramMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      this.peliculaId = Number(parametros.get('peliculaId'));
      void this.cargarDatos();
    });
  }

  // Busca la película y sus funciones futuras. numeroCarga evita sobrescribir la pantalla con una respuesta anterior.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async cargarDatos(): Promise<void> {
    const cargaActual = ++this.numeroCarga;
    const id = this.peliculaId;

    this.cargando.set(true);
    this.mensajeError.set('');
    this.pelicula.set(null);
    this.funciones.set([]);

    if (!Number.isSafeInteger(id) || id <= 0) {
      this.mensajeError.set('La dirección de la película no es válida.');
      this.cargando.set(false);
      return;
    }

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      const peliculas = await this.peliculasService.obtenerPeliculas();

      if (cargaActual !== this.numeroCarga) {
        return;
      }

      const peliculaEncontrada = peliculas.find((pelicula) => pelicula.id === id);

      if (!peliculaEncontrada) {
        this.mensajeError.set('No encontramos esa película.');
        return;
      }

      const funciones = await this.funcionesService.obtenerFunciones(id, true);

      if (cargaActual !== this.numeroCarga) {
        return;
      }

      this.pelicula.set(peliculaEncontrada);
      this.funciones.set(funciones);
    } catch (error) {
      if (cargaActual === this.numeroCarga) {
        console.error('Error al cargar las funciones:', error);
        this.mensajeError.set('No pudimos cargar los horarios. Intentá nuevamente.');
      }
    } finally {
      if (cargaActual === this.numeroCarga) {
        this.cargando.set(false);
      }
    }
  }

  // Formatea pesos argentinos con separadores y símbolo de moneda.
  mostrarPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    });
  }
  // Resta dias_preventa al estreno y compara con ahora. La base vuelve a controlar la apertura al confirmar una compra.
  ventaAbierta(): boolean {
    const pelicula = this.pelicula();
    if (!pelicula?.estreno) return true;
    const apertura = new Date(pelicula.estreno + 'T00:00:00-03:00');
    apertura.setDate(apertura.getDate() - pelicula.dias_preventa);
    return Date.now() >= apertura.getTime();
  }
  // Guarda una alerta del usuario para avisarle dentro de la aplicación cuando abra la venta.
  async activarAlerta(): Promise<void> {
    const pelicula = this.pelicula();
    if (!pelicula) return;
    try {
      await this.catalogo.activarAlerta(pelicula.id);
      this.aviso.set('Alerta activada. Vas a verla en tu perfil cuando abra la venta.');
    } catch (error) {
      this.aviso.set(error instanceof Error ? error.message : 'No pudimos activar la alerta.');
    }
  }
}
