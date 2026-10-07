// Servicio de compras: comunica la pantalla con las operaciones de compra, historial y validación.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Comprobante, Saldo } from '../models/compra';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({ providedIn: 'root' })
export class ComprasService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabase = inject(SupabaseService);

  // Envía IDs y opciones, no un precio decidido por el navegador. La función SQL calcula y confirma la compra en una transacción.
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

  // Consulta el comprobante usando su código secreto. Ese mismo código se imprime y se guarda dentro del QR.
  async comprobante(codigo: string): Promise<Comprobante> {
    const respuesta = await this.supabase.cliente.rpc('obtener_comprobante', { p_codigo: codigo });
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }

  // Consulta puntos, crédito y uso de bienvenida. Si todavía no hay una fila, presenta un saldo inicial en cero.
  async saldo(usuarioId: string): Promise<Saldo> {
    const respuesta = await this.supabase.cliente
      .from('saldos')
      .select('credito, puntos, bienvenida_usada')
      .eq('usuario_id', usuarioId)
      .maybeSingle();
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data || { credito: 0, puntos: 0, bienvenida_usada: false };
  }

  // Obtiene el porcentaje configurable para estimar la primera compra de un usuario registrado.
  async descuentoBienvenida(): Promise<number> {
    const respuesta = await this.supabase.cliente
      .from('configuracion_cine')
      .select('descuento_bienvenida')
      .eq('id', 1)
      .single();
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data.descuento_bienvenida;
  }

  // Busca compras del usuario autenticado e incluye entradas y candy relacionados; RLS también limita el acceso en la base.
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

  // Solicita una cancelación: la base revisa propietario, horario y validación, y devuelve crédito para una compra futura.
  async cancelar(id: string): Promise<void> {
    const respuesta = await this.supabase.cliente.rpc('cancelar_compra', { p_id: id });
    if (respuesta.error) throw new Error(respuesta.error.message);
  }

  // Valida el sector cine una sola vez y devuelve los datos necesarios para controlar el ingreso.
  async validar(
    codigo: string,
  ): Promise<{ pelicula: string; sala: string; inicio: string; butacas: string }> {
    const respuesta = await this.supabase.cliente.rpc('validar_entrada', { p_codigo: codigo });
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }
  // Valida el sector candy independientemente del cine y devuelve los productos a entregar.
  async validarCandy(
    codigo: string,
  ): Promise<{ productos: { nombre: string; cantidad: number }[] }> {
    const respuesta = await this.supabase.cliente.rpc('validar_candy', { p_codigo: codigo });
    if (respuesta.error) throw new Error(respuesta.error.message);
    return respuesta.data;
  }
}
