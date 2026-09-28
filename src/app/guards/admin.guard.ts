import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

// Angular ejecuta esta función antes de permitir entrar a la ruta.
export const adminGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  try {
    // Comprobamos el usuario con Supabase.
    const respuestaUsuario =
      await supabaseService.cliente.auth.getUser();

    if (respuestaUsuario.error || !respuestaUsuario.data.user) {
      return router.createUrlTree(['/login']);
    }

    const usuarioId = respuestaUsuario.data.user.id;

    // Consultamos el rol actual en la base.
    const respuestaPerfil = await supabaseService.cliente
      .from('perfiles')
      .select('rol')
      .eq('id', usuarioId)
      .single();

    if (respuestaPerfil.error) {
      throw respuestaPerfil.error;
    }

    if (respuestaPerfil.data.rol === 'admin') {
      return true;
    }

    // Un usuario conectado sin rol admin vuelve a la cartelera.
    return router.createUrlTree(['/cartelera']);
  } catch (error) {
    console.error('No se pudo comprobar el acceso administrativo:', error);

    // Si no podemos verificar los permisos, no permitimos entrar.
    return router.createUrlTree(['/cartelera']);
  }
};