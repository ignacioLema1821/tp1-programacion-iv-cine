// Servicio de disponibilidad: consulta butacas ocupadas y escucha sus cambios en Supabase Realtime.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({ providedIn: 'root' })
export class DisponibilidadService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabase = inject(SupabaseService);

  // Consulta únicamente IDs de butacas ocupadas de esta función, sin exponer datos de los compradores.
  async ocupadas(funcionId: number): Promise<number[]> {
    const respuesta = await this.supabase.cliente
      .from('ocupacion_butacas')
      .select('butaca_id')
      .eq('funcion_id', funcionId)
      .eq('ocupada', true);
    if (respuesta.error) throw new Error(respuesta.error.message);
    // map transforma cada fila en su butaca_id, para que la pantalla tenga una lista simple de números.
    return respuesta.data.map((fila) => fila.butaca_id);
  }

  // Registra un callback (función a ejecutar cuando llega un cambio). Devuelve otra función para cerrar la suscripción al salir.
  escuchar(funcionId: number, actualizar: () => void): () => void {
    const canal = this.supabase.cliente
      .channel('butacas-' + funcionId + '-' + crypto.randomUUID())
      // Escucha altas, cambios y bajas de ocupación solamente para funcionId; la compra definitiva igualmente se controla en SQL.
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
    return () => {
      void this.supabase.cliente.removeChannel(canal);
    };
  }
}
