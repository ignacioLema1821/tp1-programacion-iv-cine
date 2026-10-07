// Panel de funciones: programa una proyección o un período y pide confirmación antes de eliminar.
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Pelicula } from '../../models/pelicula';
import { Funcion } from '../../models/funcion';
import { PeliculasService } from '../../services/peliculas.service';
import { FuncionesService } from '../../services/funciones.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-admin-funciones',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule, DatePipe],
  templateUrl: './admin-funciones.html',
  styleUrl: './admin-funciones.css',
})
export class AdminFunciones implements OnInit {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private peliculasService = inject(PeliculasService);
  private funcionesService = inject(FuncionesService);

  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  peliculas = signal<Pelicula[]>([]);
  funciones = signal<Funcion[]>([]);

  cargando = signal(true);
  guardando = signal(false);
  eliminando = signal(false);

  errorCarga = signal('');
  mensajeError = signal('');
  mensajeExito = signal('');

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

  // Angular llama a ngOnInit una vez, después de establecer los inputs iniciales. implements OnInit comprueba el contrato; no llama al método por sí mismo.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  // Carga películas para el selector y todas las funciones para la tabla administrativa.
  async cargarDatos(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set('');

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
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

  // Valida el formulario y decide entre una función o un período repetido; la base asigna las salas.
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

    // Une fecha y hora del formulario con UTC-3. toISOString envía el mismo instante en un formato estándar UTC.
    const inicio = new Date(`${this.fecha}T${this.hora}:00-03:00`);

    if (Number.isNaN(inicio.getTime()) || inicio.getTime() <= Date.now()) {
      this.mensajeError.set('Elegí una fecha y hora futuras.');
      return;
    }

    this.guardando.set(true);

    try {
      // La repetición envía días de semana y rango; la programación simple envía un único instante de inicio.
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

  // Compara los milisegundos del inicio con el momento actual para decidir si se ofrece eliminar.
  esFuncionFutura(funcion: Funcion): boolean {
    return new Date(funcion.inicio).getTime() > Date.now();
  }

  // Guarda la función elegida y muestra la confirmación; todavía no ejecuta ningún borrado.
  solicitarEliminacion(funcion: Funcion): void {
    if (this.guardando() || this.eliminando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.funcionAEliminar.set(funcion);
  }

  // Cierra la confirmación sin modificar la base.
  cancelarEliminacion(): void {
    if (!this.eliminando()) {
      this.funcionAEliminar.set(null);
    }
  }

  // Después de confirmar, llama al servicio y actualiza el listado.
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
  // Alterna el día en la lista: los números 1 a 7 representan lunes a domingo, como espera la función SQL.
  cambiarDia(dia: number): void {
    if (this.diasSeleccionados.includes(dia))
      this.diasSeleccionados = this.diasSeleccionados.filter((d) => d !== dia);
    else this.diasSeleccionados.push(dia);
  }
}
