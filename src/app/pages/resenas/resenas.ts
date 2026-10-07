import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { CatalogoService } from '../../services/catalogo.service';
import { Resenas as DatosResenas } from '../../models/catalogo';

@Component({
  selector: 'app-resenas',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './resenas.html',
  styleUrl: './resenas.css',
})
export class Resenas implements OnChanges {
  @Input({ required: true }) peliculaId = 0;
  auth = inject(AuthService);
  private catalogo = inject(CatalogoService);
  datos = signal<DatosResenas>({ promedio: 0, resenas: [] });
  error = signal('');
  guardando = signal(false);
  estrellas = 5;
  comentario = '';
  private carga = 0;

  ngOnChanges(): void {
    void this.cargar();
  }
  async cargar(): Promise<void> {
    const carga = ++this.carga;
    try {
      const datos = await this.catalogo.resenas(this.peliculaId);
      if (carga === this.carga) this.datos.set(datos);
    } catch {
      if (carga === this.carga) this.error.set('No pudimos cargar las reseñas.');
    }
  }
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
