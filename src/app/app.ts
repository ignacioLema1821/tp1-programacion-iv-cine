import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CatalogoService } from './services/catalogo.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // No es private porque también lo consultamos desde app.html.
  authService = inject(AuthService);

  private router = inject(Router);
  private catalogo = inject(CatalogoService);
  notificaciones = signal<{ pelicula_id: number; nombre: string }[]>([]);
  constructor() {
    effect((limpiar) => {
      const usuario = this.authService.usuario();
      this.notificaciones.set([]);
      if (!usuario) return;
      const id = usuario.id;
      void this.actualizarAlertas(id);
      const reloj = setInterval(() => {
        void this.actualizarAlertas(id);
      }, 30000);
      limpiar(() => clearInterval(reloj));
    });
  }
  private async actualizarAlertas(usuarioId: string): Promise<void> {
    try {
      const alertas = await this.catalogo.alertas();
      if (this.authService.usuario()?.id !== usuarioId) return;
      this.notificaciones.set(alertas.filter((a) => a.disponible));
    } catch {
      // Un fallo de alertas no impide iniciar sesión ni usar las demás pantallas.
    }
  }

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
      this.mensajeError.set('No pudimos cerrar la sesión. Intentá nuevamente.');
    } finally {
      this.cerrandoSesion.set(false);
    }
  }
}
