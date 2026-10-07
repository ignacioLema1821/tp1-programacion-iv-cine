// Inicio de sesión: valida el formulario y delega la autenticación en AuthService.
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthError } from '@supabase/supabase-js';
import { AuthService } from '../../services/auth.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-login',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  cargando = signal(false);
  mensajeError = signal('');

  // Valida NgForm, espera a AuthService y navega a la cartelera. AuthError permite reconocer errores como correo sin confirmar.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async iniciarSesion(formulario: NgForm): Promise<void> {
    if (this.cargando()) {
      return;
    }

    this.mensajeError.set('');

    if (formulario.invalid) {
      this.mensajeError.set('Ingresá un correo válido y tu contraseña.');
      return;
    }

    this.cargando.set(true);

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      await this.authService.iniciarSesion(this.email, this.password);

      this.password = '';

      await this.router.navigate(['/cartelera']);
    } catch (error) {
      console.error('Error al iniciar sesión:', error);

      if (error instanceof AuthError) {
        if (error.code === 'email_not_confirmed') {
          this.mensajeError.set('Tenés que confirmar tu correo antes de iniciar sesión.');
        } else if (error.code === 'invalid_credentials') {
          this.mensajeError.set('El correo o la contraseña no son correctos.');
        } else {
          this.mensajeError.set('No pudimos iniciar sesión. Intentá nuevamente.');
        }
      } else {
        this.mensajeError.set('No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.');
      }
    } finally {
      this.cargando.set(false);
    }
  }
}
