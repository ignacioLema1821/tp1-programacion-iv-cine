// Panel de salas y usuarios: edita salas, su plano y los roles registrados.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Sala, SalasService } from '../../services/salas.service';
import { Butaca } from '../../models/butaca';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-admin-salas',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule],
  templateUrl: './admin-salas.html',
  styleUrl: './admin-salas.css',
})
export class AdminSalas implements OnInit {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private servicio = inject(SalasService);
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  salas = signal<Sala[]>([]);
  butacas = signal<Butaca[]>([]);
  usuarios = signal<{ id: string; correo: string; rol: string }[]>([]);
  error = signal('');
  exito = signal('');
  guardando = signal(false);
  datos = { id: null as number | null, nombre: '', activa: true, recargo_vip: 50 };
  salaId: number | null = null;
  butaca = signal<Butaca | null>(null);
  // Angular llama a ngOnInit una vez, después de establecer los inputs iniciales. implements OnInit comprueba el contrato; no llama al método por sí mismo.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async ngOnInit(): Promise<void> {
    await this.cargar();
  }
  // Carga las salas y los usuarios que puede administrar la sesión actual.
  async cargar(): Promise<void> {
    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      this.salas.set(await this.servicio.salas());
      this.usuarios.set(await this.servicio.usuarios());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cargar salas.');
    }
  }
  // Copia la sala al formulario y conserva su ID para actualizarla.
  editar(sala: Sala): void {
    this.datos = { ...sala };
  }
  // Envía los datos de la sala y vuelve al formulario de creación cuando termina.
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
  // Carga el plano de salaId y quita cualquier butaca que haya quedado seleccionada para editar.
  async cargarButacas(): Promise<void> {
    this.butaca.set(null);
    try {
      this.butacas.set(this.salaId ? await this.servicio.butacas(this.salaId) : []);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cargar el plano.');
    }
  }
  // Guarda una copia editable de la butaca; sus cambios se persisten recién al guardar.
  elegirButaca(butaca: Butaca): void {
    // La copia evita modificar el objeto del listado mientras se completa el formulario de edición.
    this.butaca.set({ ...butaca });
  }
  // Valida el formulario y delega las reglas del plano en el servicio y la base.
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
  // Envía el rol elegido para ese usuario; guardando evita solicitudes simultáneas desde esta pantalla.
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
