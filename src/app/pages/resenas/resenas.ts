// Componente de reseñas: recibe la película desde su padre y muestra o guarda calificaciones.
import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CatalogoService } from '../../services/catalogo.service';
// as distingue el modelo de datos de la clase Resenas que representa este componente.
import { Resenas as DatosResenas } from '../../models/catalogo';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-resenas',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule, DatePipe],
  templateUrl: './resenas.html',
  styleUrl: './resenas.css',
})
export class Resenas implements OnChanges {
  // @Input permite recibir peliculaId desde FuncionesPelicula mediante [peliculaId]; required exige que el padre lo suministre.
  @Input({ required: true }) peliculaId = 0;
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  auth = inject(AuthService);
  private catalogo = inject(CatalogoService);
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  datos = signal<DatosResenas>({ promedio: 0, resenas: [] });
  error = signal('');
  guardando = signal(false);
  estrellas = 5;
  comentario = '';
  private carga = 0;

  // Angular lo llama al establecer o cambiar un @Input; aquí recarga reseñas cuando recibe otra película.
  ngOnChanges(): void {
    void this.cargar();
  }
  // Consulta promedio y reseñas; el contador evita aplicar una respuesta que corresponde a una película anterior.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async cargar(): Promise<void> {
    const carga = ++this.carga;
    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      const datos = await this.catalogo.resenas(this.peliculaId);
      if (carga === this.carga) this.datos.set(datos);
    } catch {
      if (carga === this.carga) this.error.set('No pudimos cargar las reseñas.');
    }
  }
  // Guarda la reseña del usuario y vuelve a consultar para mostrar el promedio actualizado.
  async guardar(formulario: NgForm): Promise<void> {
    if (formulario.invalid || this.guardando() || !this.comentario.trim()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      await this.catalogo.guardarResena(this.peliculaId, this.estrellas, this.comentario);
      this.comentario = '';
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar la reseña.');
    } finally {
      this.guardando.set(false);
    }
  }
}
