// Control de navegación: permite entrar al panel solamente si el rol consultado es admin.
// El guard orienta la navegación en Angular; RLS y las funciones de Supabase protegen los datos aunque se intente llamar directamente a la API.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

// CanActivateFn define el contrato del guard: devuelve permiso (true) o una URL alternativa; async permite esperar a Supabase.
export const adminGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  try {
    const respuestaUsuario = await supabaseService.cliente.auth.getUser();

    if (respuestaUsuario.error || !respuestaUsuario.data.user) {
      // createUrlTree construye el destino; Angular se encarga de redirigir si el guard devuelve esa URL.
      return router.createUrlTree(['/login']);
    }

    const usuarioId = respuestaUsuario.data.user.id;

    const respuestaPerfil = await supabaseService.cliente
      .from('perfiles')
      .select('rol')
      .eq('id', usuarioId)
      // eq filtra por ID y single espera exactamente un perfil. Los permisos finales también se controlan en la base.
      .single();

    if (respuestaPerfil.error) {
      throw respuestaPerfil.error;
    }

    if (respuestaPerfil.data.rol === 'admin') {
      return true;
    }

    return router.createUrlTree(['/cartelera']);
  } catch (error) {
    console.error('No se pudo comprobar el acceso administrativo:', error);

    return router.createUrlTree(['/cartelera']);
  }
};
