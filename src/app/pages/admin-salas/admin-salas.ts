import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Sala, SalasService } from '../../services/salas.service';
import { Butaca } from '../../models/butaca';

@Component({
  selector: 'app-admin-salas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-salas.html',
  styleUrl: './admin-salas.css',
})
export class AdminSalas implements OnInit {
  private servicio = inject(SalasService);
  salas = signal<Sala[]>([]);
  butacas = signal<Butaca[]>([]);
  usuarios = signal<{ id: string; correo: string; rol: string }[]>([]);
  error = signal('');
  exito = signal('');
  guardando = signal(false);
  datos = { id: null as number | null, nombre: '', activa: true, recargo_vip: 50 };
  salaId: number | null = null;
  butaca = signal<Butaca | null>(null);
  async ngOnInit(): Promise<void> {
    await this.cargar();
  }
  async cargar(): Promise<void> {
    try {
      this.salas.set(await this.servicio.salas());
      this.usuarios.set(await this.servicio.usuarios());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cargar salas.');
    }
  }
  editar(sala: Sala): void {
    this.datos = { ...sala };
  }
  async guardarSala(formulario: NgForm): Promise<void> {
    if (formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      await this.servicio.guardarSala(
        this.datos.id,
        this.datos.nombre,
        this.datos.activa,
        this.datos.recargo_vip,
      );
      this.datos = { id: null, nombre: '', activa: true, recargo_vip: 50 };
      this.exito.set('Sala guardada. Las salas nuevas tienen su plano inicial.');
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
  async cargarButacas(): Promise<void> {
    this.butaca.set(null);
    try {
      this.butacas.set(this.salaId ? await this.servicio.butacas(this.salaId) : []);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cargar el plano.');
    }
  }
  elegirButaca(butaca: Butaca): void {
    this.butaca.set({ ...butaca });
  }
  async guardarButaca(formulario: NgForm): Promise<void> {
    const butaca = this.butaca();
    if (!butaca || formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      await this.servicio.guardarButaca(butaca);
      await this.cargarButacas();
      this.exito.set('Butaca actualizada.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos modificar la butaca.');
    } finally {
      this.guardando.set(false);
    }
  }
  async guardarRol(usuario: { id: string; rol: string }): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      await this.servicio.cambiarRol(usuario.id, usuario.rol);
      this.exito.set('Rol actualizado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos modificar el rol.');
    } finally {
      this.guardando.set(false);
    }
  }
}
