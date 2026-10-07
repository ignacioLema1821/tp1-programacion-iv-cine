import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Butaca } from '../models/butaca';
export interface Sala {
  id: number;
  nombre: string;
  activa: boolean;
  recargo_vip: number;
}

@Injectable({ providedIn: 'root' })
export class SalasService {
  private supabase = inject(SupabaseService);
  async salas(): Promise<Sala[]> {
    const r = await this.supabase.cliente
      .from('salas')
      .select('id,nombre,activa,recargo_vip')
      .order('id');
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  async butacas(salaId: number): Promise<Butaca[]> {
    const r = await this.supabase.cliente
      .from('butacas')
      .select('*')
      .eq('sala_id', salaId)
      .order('fila')
      .order('numero');
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  async guardarSala(
    id: number | null,
    nombre: string,
    activa: boolean,
    recargo: number,
  ): Promise<void> {
    const r = await this.supabase.cliente.rpc('guardar_sala', {
      p_id: id,
      p_nombre: nombre,
      p_activa: activa,
      p_recargo: recargo,
    });
    if (r.error) throw new Error(r.error.message);
  }
  async guardarButaca(butaca: Butaca): Promise<void> {
    const r = await this.supabase.cliente.rpc('guardar_butaca', {
      p_id: butaca.id,
      p_fila: butaca.fila,
      p_numero: butaca.numero,
      p_bloque: butaca.bloque,
      p_tipo: butaca.tipo,
    });
    if (r.error) throw new Error(r.error.message);
  }
  async usuarios(): Promise<{ id: string; correo: string; rol: string }[]> {
    const r = await this.supabase.cliente.rpc('usuarios_administracion');
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  async cambiarRol(id: string, rol: string): Promise<void> {
    const r = await this.supabase.cliente.rpc('cambiar_rol', { p_id: id, p_rol: rol });
    if (r.error) throw new Error(r.error.message);
  }
}
