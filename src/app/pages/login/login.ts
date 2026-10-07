import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthError } from '@supabase/supabase-js';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  cargando = signal(false);
  mensajeError = signal('');

  async iniciarSesion(formulario: NgForm): Promise<void> {
    // Evita enviar otra solicitud mientras la anterior está pendiente.
    if (this.cargando()) {
      return;
    }

    this.mensajeError.set('');

    if (formulario.invalid) {
      this.mensajeError.set('Ingresá un correo válido y tu contraseña.');
      return;
    }

    this.cargando.set(true);

    try {
      await this.authService.iniciarSesion(this.email, this.password);

      this.password = '';

      // Después de entrar, mostramos la cartelera.
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
