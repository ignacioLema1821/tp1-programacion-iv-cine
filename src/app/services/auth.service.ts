// Servicio de autenticación: registra usuarios, abre/cierra sesiones y comparte el usuario y su rol.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, effect, inject, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { DatosRegistro } from '../models/datos-registro';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabaseService = inject(SupabaseService);

  // La señal se lee con usuario() y se actualiza con usuario.set(...). User | null admite una sesión con usuario o ninguna sesión.
  usuario = signal<User | null>(null);
  cargandoSesion = signal(true);

  rol = signal<'cliente' | 'empleado' | 'admin' | null>(null);
  cargandoRol = signal(false);
  errorRol = signal('');

  private numeroConsultaRol = 0;

  // onAuthStateChange avisa cuando cambia la sesión. effect reacciona al cambio de usuario para cargar su rol.
  constructor() {
    this.supabaseService.cliente.auth.onAuthStateChange((_evento, sesion) => {
      if (sesion) {
        this.usuario.set(sesion.user);
      } else {
        this.usuario.set(null);
      }

      this.cargandoSesion.set(false);
    });

    effect(() => {
      // Leer usuario() dentro de effect crea una dependencia: al cambiar la señal, Angular vuelve a ejecutar el bloque.
      const usuarioActual = this.usuario();

      if (usuarioActual) {
        // void indica que no esperamos esa Promise aquí; cargarRol maneja sus propios errores. No convierte la operación en sincrónica.
        void this.cargarRol(usuarioActual.id);
      } else {
        void this.cargarRol(null);
      }
    });
  }

  // Consulta perfiles por ID. El contador permite descartar una respuesta vieja si cambió el usuario durante la espera.
  private async cargarRol(usuarioId: string | null): Promise<void> {
    const numeroConsulta = ++this.numeroConsultaRol;

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

  // signUp crea la cuenta. options.data guarda los datos personales como metadatos; devuelve si además se inició una sesión.
  async registrar(datos: DatosRegistro, password: string): Promise<boolean> {
    const respuesta = await this.supabaseService.cliente.auth.signUp({
      email: datos.email.trim(),
      password: password,
      // Los metadatos personales acompañan la cuenta; el rol se consulta por separado en la tabla perfiles.
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

  // signInWithPassword verifica correo y contraseña en Supabase; los cambios de sesión se reflejan en usuario().
  async iniciarSesion(email: string, password: string): Promise<void> {
    const respuesta = await this.supabaseService.cliente.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (respuesta.error) {
      throw respuesta.error;
    }
  }

  // signOut con scope local cierra la sesión de este navegador.
  async cerrarSesion(): Promise<void> {
    const respuesta = await this.supabaseService.cliente.auth.signOut({
      scope: 'local',
    });

    if (respuesta.error) {
      throw respuesta.error;
    }
  }
}
