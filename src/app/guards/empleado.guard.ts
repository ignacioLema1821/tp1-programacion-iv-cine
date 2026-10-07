// Control de navegación: permite validar entradas a empleados y administradores.
// El guard orienta la navegación en Angular; RLS y las funciones de Supabase protegen los datos aunque se intente llamar directamente a la API.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

// CanActivateFn es el tipo de función que Angular ejecuta antes de activar una ruta.
export const empleadoGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  try {
    const usuario = await supabase.cliente.auth.getUser();
    if (!usuario.data.user) return router.createUrlTree(['/login']);
    const perfil = await supabase.cliente
      .from('perfiles')
      .select('rol')
      .eq('id', usuario.data.user.id)
      .single();
    if (perfil.error) throw perfil.error;
    // includes comprueba el rol; || devuelve true si está permitido o una UrlTree para redirigir si no lo está.
    return ['empleado', 'admin'].includes(perfil.data.rol) || router.createUrlTree(['/cartelera']);
  } catch {
    return router.createUrlTree(['/cartelera']);
  }
};
