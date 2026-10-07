import { Injectable, effect, inject, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { DatosRegistro } from '../models/datos-registro';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabaseService = inject(SupabaseService);

  usuario = signal<User | null>(null);
  cargandoSesion = signal(true);

  // Solo aceptamos los tres roles definidos en la base.
  rol = signal<'cliente' | 'empleado' | 'admin' | null>(null);
  cargandoRol = signal(false);
  errorRol = signal('');

  // Identifica la consulta más reciente para ignorar respuestas anteriores.
  private numeroConsultaRol = 0;

  constructor() {
    // Este callback solamente actualiza el usuario y el estado de sesión.
    this.supabaseService.cliente.auth.onAuthStateChange((_evento, sesion) => {
      if (sesion) {
        this.usuario.set(sesion.user);
      } else {
        this.usuario.set(null);
      }

      this.cargandoSesion.set(false);
    });

    // Cuando cambia el usuario, consultamos su rol fuera del callback de Auth.
    effect(() => {
      const usuarioActual = this.usuario();

      if (usuarioActual) {
        void this.cargarRol(usuarioActual.id);
      } else {
        void this.cargarRol(null);
      }
    });
  }

  private async cargarRol(usuarioId: string | null): Promise<void> {
    const numeroConsulta = ++this.numeroConsultaRol;

    // Quitamos la información anterior antes de consultar otro perfil.
    this.rol.set(null);
    this.errorRol.set('');
    this.cargandoRol.set(usuarioId !== null);

    if (usuarioId === null) {
      return;
    }

    try {
      const respuesta = await this.supabaseService.cliente
        .from('perfiles')
        .select('rol')
        .eq('id', usuarioId)
        .single();

      // Si comenzó otra consulta, esta respuesta ya no debe actualizar la pantalla.
      if (numeroConsulta !== this.numeroConsultaRol) {
        return;
      }

      if (respuesta.error) {
        throw respuesta.error;
      }

      const rolEncontrado = respuesta.data.rol;

      if (
        rolEncontrado === 'cliente' ||
        rolEncontrado === 'empleado' ||
        rolEncontrado === 'admin'
      ) {
        this.rol.set(rolEncontrado);
      } else {
        throw new Error('El perfil tiene un rol desconocido.');
      }
    } catch (error) {
      if (numeroConsulta === this.numeroConsultaRol) {
        console.error('Error al consultar el rol:', error);

        this.errorRol.set('No pudimos consultar tu perfil. Recargá la página para reintentar.');
      }
    } finally {
      if (numeroConsulta === this.numeroConsultaRol) {
        this.cargandoRol.set(false);
      }
    }
  }

  async registrar(datos: DatosRegistro, password: string): Promise<boolean> {
    const respuesta = await this.supabaseService.cliente.auth.signUp({
      email: datos.email.trim(),
      password: password,
      options: {
        data: {
          nombre: datos.nombre.trim(),
          apellido: datos.apellido.trim(),
          fecha_nacimiento: datos.fechaNacimiento,
          tipo_sangre: datos.tipoSangre,
          color_ojos: datos.colorOjos.trim(),
          dias_vacaciones: datos.diasVacaciones,
        },
      },
    });

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data.session !== null;
  }

  async iniciarSesion(email: string, password: string): Promise<void> {
    const respuesta = await this.supabaseService.cliente.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (respuesta.error) {
      throw respuesta.error;
    }
  }

  async cerrarSesion(): Promise<void> {
    const respuesta = await this.supabaseService.cliente.auth.signOut({
      scope: 'local',
    });

    if (respuesta.error) {
      throw respuesta.error;
    }
  }
}
