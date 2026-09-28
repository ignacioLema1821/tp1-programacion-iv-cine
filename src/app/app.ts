import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // No es private porque también lo consultamos desde app.html.
  authService = inject(AuthService);

  private router = inject(Router);

  cerrandoSesion = signal(false);
  mensajeError = signal('');

  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion()) {
      return;
    }

    this.mensajeError.set('');
    this.cerrandoSesion.set(true);

    try {
      await this.authService.cerrarSesion();

      // La cartelera sigue siendo accesible sin iniciar sesión.
      await this.router.navigate(['/cartelera']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.mensajeError.set(
        'No pudimos cerrar la sesión. Intentá nuevamente.'
      );
    } finally {
      this.cerrandoSesion.set(false);
    }
  }
}