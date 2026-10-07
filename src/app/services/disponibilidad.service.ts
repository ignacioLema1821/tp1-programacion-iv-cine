import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  private supabase = inject(SupabaseService);

  async ocupadas(funcionId: number): Promise<number[]> {
    const respuesta = await this.supabase.cliente
      .from('ocupacion_butacas')
      .select('butaca_id')
      .eq('funcion_id', funcionId)
      .eq('ocupada', true);
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data.map((fila) => fila.butaca_id);
  }

  escuchar(funcionId: number, actualizar: () => void): () => void {
    const canal = this.supabase.cliente
      .channel('butacas-' + funcionId + '-' + crypto.randomUUID())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ocupacion_butacas',
          filter: 'funcion_id=eq.' + funcionId,
        },
        actualizar,
      )
      .subscribe((estado) => {
        if (estado === 'SUBSCRIBED') actualizar();
      });
    // La suscripción se retira al cambiar de función o salir de la pantalla.
    return () => {
      void this.supabase.cliente.removeChannel(canal);
    };
  }
}
