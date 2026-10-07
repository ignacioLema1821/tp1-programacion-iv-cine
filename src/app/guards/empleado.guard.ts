import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

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
    return ['empleado', 'admin'].includes(perfil.data.rol) || router.createUrlTree(['/cartelera']);
  } catch {
    return router.createUrlTree(['/cartelera']);
  }
};
