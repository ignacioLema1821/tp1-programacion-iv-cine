// Componente principal: mantiene el menú, la sesión y las alertas mientras cambiamos de página.
import { Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CatalogoService } from './services/catalogo.service';
import { AuthService } from './services/auth.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-root',
  standalone: true,
  // imports habilita en este HTML las directivas, pipes o componentes indicados; no crea por sí solo servicios ni datos.
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  authService = inject(AuthService);

  private router = inject(Router);
  private catalogo = inject(CatalogoService);
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  notificaciones = signal<{ pelicula_id: number; nombre: string }[]>([]);
  // effect ejecuta este bloque y lo repite si cambia usuario(). Las alertas se consultan cada 30 segundos mientras hay sesión.
  constructor() {
    effect((limpiar) => {
      // usuario() lee la señal. this se refiere a esta instancia de App y a sus propiedades o métodos.
      const usuario = this.authService.usuario();
      this.notificaciones.set([]);
      if (!usuario) return;
      const id = usuario.id;
      void this.actualizarAlertas(id);
      const reloj = setInterval(() => {
        void this.actualizarAlertas(id);
      }, 30000);
      // limpiar es el callback de limpieza de effect: detiene el intervalo antes de repetirlo o al destruir el componente.
      limpiar(() => clearInterval(reloj));
    });
  }
  // Actualiza avisos de ventas abiertas. El ID evita mostrar una respuesta que pertenece a una sesión anterior.
  private async actualizarAlertas(usuarioId: string): Promise<void> {
    try {
      const alertas = await this.catalogo.alertas();
      if (this.authService.usuario()?.id !== usuarioId) return;
      this.notificaciones.set(alertas.filter((a) => a.disponible));
    } catch {
    }
  }

  cerrandoSesion = signal(false);
  mensajeError = signal('');

  // Cierra la sesión y navega a la cartelera; el estado cerrandoSesion impide enviar dos solicitudes a la vez.
  async cerrarSesion(): Promise<void> {
    if (this.cerrandoSesion()) {
      return;
    }

    this.mensajeError.set('');
    this.cerrandoSesion.set(true);

    try {
      await this.authService.cerrarSesion();

      await this.router.navigate(['/cartelera']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      this.mensajeError.set('No pudimos cerrar la sesión. Intentá nuevamente.');
    } finally {
      this.cerrandoSesion.set(false);
    }
  }
}
