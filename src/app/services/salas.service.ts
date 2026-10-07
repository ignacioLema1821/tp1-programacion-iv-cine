// Servicio de administración: consulta y guarda salas, butacas y roles de usuarios.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Butaca } from '../models/butaca';
export interface Sala {
  id: number;
  nombre: string;
  activa: boolean;
  recargo_vip: number;
}

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({ providedIn: 'root' })
export class SalasService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabase = inject(SupabaseService);
  // Consulta las salas, su estado y su porcentaje de recargo VIP.
  async salas(): Promise<Sala[]> {
    const r = await this.supabase.cliente
      .from('salas')
      .select('id,nombre,activa,recargo_vip')
      .order('id');
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  // Consulta el plano de la sala elegida para poder editar sus butacas.
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
  // La función SQL crea o edita la sala; al crearla también genera su distribución inicial de butacas.
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
  // La base valida los cambios del plano y rechaza modificar una butaca vendida para una función pendiente.
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
  // Una función exclusiva del administrador devuelve los usuarios y sus roles.
  async usuarios(): Promise<{ id: string; correo: string; rol: string }[]> {
    const r = await this.supabase.cliente.rpc('usuarios_administracion');
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  // Solicita el cambio de rol por ID. El servidor comprueba que quien lo pide sea administrador.
  async cambiarRol(id: string, rol: string): Promise<void> {
    const r = await this.supabase.cliente.rpc('cambiar_rol', { p_id: id, p_rol: rol });
    if (r.error) throw new Error(r.error.message);
  }
}
