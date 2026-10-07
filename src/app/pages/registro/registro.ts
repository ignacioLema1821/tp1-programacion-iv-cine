// Registro: valida los datos personales y solicita a AuthService que cree la cuenta.
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { DatosRegistro } from '../../models/datos-registro';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-registro',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private authService = inject(AuthService);

  // El modelo exige estos campos y tipos; el HTML los modifica mediante ngModel.
  datos: DatosRegistro = {
    email: '',
    nombre: '',
    apellido: '',
    fechaNacimiento: '',
    tipoSangre: '',
    colorOjos: '',
    diasVacaciones: 0,
  };

  password = '';
  confirmarPassword = '';

  tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  cargando = signal(false);
  mensajeError = signal('');
  mensajeExito = signal('');

  // Getter: se usa como fechaActual, sin (). padStart agrega ceros para producir el formato AAAA-MM-DD del input date.
  get fechaActual(): string {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  // NgForm comprueba las reglas del HTML; este método agrega validaciones de textos, fecha, enteros y contraseñas iguales.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async registrar(formulario: NgForm): Promise<void> {
    if (this.cargando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (formulario.invalid) {
      this.mensajeError.set('Revisá los campos obligatorios, el correo y la contraseña.');
      return;
    }

    // trim permite rechazar valores que contienen solamente espacios.
    if (!this.datos.nombre.trim() || !this.datos.apellido.trim() || !this.datos.colorOjos.trim()) {
      this.mensajeError.set(
        'Nombre, apellido y color de ojos no pueden contener solamente espacios.',
      );
      return;
    }

    if (this.datos.fechaNacimiento > this.fechaActual) {
      this.mensajeError.set('La fecha de nacimiento no puede ser posterior a hoy.');
      return;
    }

    // TypeScript number también admite decimales; isInteger agrega la regla de que los días sean enteros.
    if (!Number.isInteger(this.datos.diasVacaciones) || this.datos.diasVacaciones < 0) {
      this.mensajeError.set(
        'Los días de vacaciones deben ser un número entero igual o mayor que cero.',
      );
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.mensajeError.set('Las contraseñas no coinciden.');
      return;
    }

    this.cargando.set(true);

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      // El booleano indica si Supabase abrió sesión o si todavía queda confirmar el correo, según la configuración del proyecto.
      const sesionIniciada = await this.authService.registrar(this.datos, this.password);

      if (sesionIniciada) {
        this.mensajeExito.set('Tu cuenta está lista y la sesión quedó iniciada.');
      } else {
        this.mensajeExito.set(
          'Revisá tu correo para confirmar el registro. Si ya tenías una cuenta, utilizá el inicio de sesión.',
        );
      }

      this.password = '';
      this.confirmarPassword = '';
    } catch (error) {
      console.error('Error de registro:', error);
      this.mensajeError.set(
        'No pudimos completar el registro. Revisá los datos e intentá nuevamente.',
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
