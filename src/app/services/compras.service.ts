import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Comprobante, Saldo } from '../models/compra';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private supabase = inject(SupabaseService);

  async comprar(
    funcionId: number,
    butacas: number[],
    correo: string,
    nacimiento: string,
    usarCredito: boolean,
    productos: { id: number; cantidad: number }[] = [],
    comboId: number | null = null,
    cupon = '',
    recompensaId: number | null = null,
  ): Promise<string> {
    // El servidor verifica disponibilidad y calcula el precio definitivo.
    const respuesta = await this.supabase.cliente.rpc('comprar_carrito', {
      p_funcion_id: funcionId,
      p_butacas: butacas,
      p_correo: correo,
      p_fecha_nacimiento: nacimiento || null,
      p_usar_credito: usarCredito,
      p_productos: productos,
      p_combo_id: comboId,
      p_cupon: cupon,
      p_recompensa_id: recompensaId,
    });
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }

  async comprobante(codigo: string): Promise<Comprobante> {
    const respuesta = await this.supabase.cliente.rpc('obtener_comprobante', { p_codigo: codigo });
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }

  async saldo(usuarioId: string): Promise<Saldo> {
    const respuesta = await this.supabase.cliente
      .from('saldos')
      .select('credito, puntos, bienvenida_usada')
      .eq('usuario_id', usuarioId)
      .maybeSingle();
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data || { credito: 0, puntos: 0, bienvenida_usada: false };
  }

  async descuentoBienvenida(): Promise<number> {
    const respuesta = await this.supabase.cliente
      .from('configuracion_cine')
      .select('descuento_bienvenida')
      .eq('id', 1)
      .single();
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data.descuento_bienvenida;
  }

  async historial(): Promise<Comprobante[]> {
    const usuario = await this.supabase.cliente.auth.getUser();
    if (!usuario.data.user) return [];
    const respuesta = await this.supabase.cliente
      .from('compras')
      .select(
        'id, codigo, pelicula_nombre, sala_nombre, inicio, edad_minima, subtotal, descuento, total, credito_usado, pago_simulado, estado, cine_validado, candy_validado, candy:compra_candy(nombre,cantidad,precio), entradas(fila,numero,tipo,precio)',
      )
      .eq('usuario_id', usuario.data.user.id)
      .order('creada_en', { ascending: false })
      .returns<Comprobante[]>();
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }

  async cancelar(id: string): Promise<void> {
    const respuesta = await this.supabase.cliente.rpc('cancelar_compra', { p_id: id });
    if (respuesta.error) throw new Error(respuesta.error.message);
  }

  async validar(
    codigo: string,
  ): Promise<{ pelicula: string; sala: string; inicio: string; butacas: string }> {
    const respuesta = await this.supabase.cliente.rpc('validar_entrada', { p_codigo: codigo });
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }
  async validarCandy(
    codigo: string,
  ): Promise<{ productos: { nombre: string; cantidad: number }[] }> {
    const respuesta = await this.supabase.cliente.rpc('validar_candy', { p_codigo: codigo });
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }
}
