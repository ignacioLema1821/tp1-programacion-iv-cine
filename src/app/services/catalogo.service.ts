// Servicio de catálogo: centraliza candy, beneficios, reseñas, alertas y reportes de Supabase.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Categoria,
  Producto,
  Combo,
  Cupon,
  Recompensa,
  Configuracion,
  Resenas,
  Reporte,
} from '../models/catalogo';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabase = inject(SupabaseService);

  // Consulta categorías para agrupar los productos del candy.
  async categorias(): Promise<Categoria[]> {
    const r = await this.supabase.cliente
      .from('categorias_candy')
      .select('*')
      .order('nombre');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Trae productos y precios; la pantalla de compra conserva solamente los activos.
  async productos(): Promise<Producto[]> {
    const r = await this.supabase.cliente
      .from('productos_candy')
      .select('*')
      .order('nombre');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Consulta combos de entrada, pochoclo y bebida a un precio fijo.
  async combos(): Promise<Combo[]> {
    const r = await this.supabase.cliente
      .from('combos')
      .select('*')
      .order('nombre');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Consulta descuentos configurados; la base verifica que el cupón se pueda usar al comprar.
  async cupones(): Promise<Cupon[]> {
    const r = await this.supabase.cliente
      .from('cupones')
      .select('*')
      .order('codigo');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Trae los canjes posibles y su costo en puntos.
  async recompensas(): Promise<Recompensa[]> {
    const r = await this.supabase.cliente
      .from('recompensas')
      .select('*')
      .order('costo_puntos');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Lee la única fila de configuración general (id 1); single exige que exista una fila.
  async configuracion(): Promise<Configuracion> {
    const r = await this.supabase.cliente
      .from('configuracion_cine')
      .select('descuento_bienvenida,puntos_por_peso')
      .eq('id', 1)
      .single();

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // El parámetro tabla admite solamente los cinco nombres definidos. Record<string, unknown> representa campos con valores de distintos tipos.
  async guardar(
    tabla:
      | 'categorias_candy'
      | 'productos_candy'
      | 'combos'
      | 'cupones'
      | 'recompensas',
    datos: Record<string, unknown>,
  ): Promise<void> {
    // ...datos crea una copia del objeto del formulario. unknown permite distintos tipos de valores sin asumir qué contiene cada campo.
    const copia = { ...datos };
    const id = copia['id'];

    // Quitamos el ID de los campos enviados porque lo genera la base. Sin ID se inserta; con ID se actualiza la fila correspondiente.
    delete copia['id'];

    if (id === null || id === undefined) {
      const r = await this.supabase.cliente
        .from(tabla)
        .insert(copia);

      if (r.error) throw new Error(r.error.message);
      return;
    }

    const r = await this.supabase.cliente
      .from(tabla)
      .update(copia)
      .eq('id', id)
      .select('id')
      .single();

    if (r.error) throw new Error(r.error.message);
  }

  // Actualiza beneficios generales. Los permisos de escritura los comprueba Supabase con sus políticas.
  async guardarConfiguracion(datos: Configuracion): Promise<void> {
    const r = await this.supabase.cliente
      .from('configuracion_cine')
      .update(datos)
      .eq('id', 1);

    if (r.error) throw new Error(r.error.message);
  }

  // La función de la base devuelve las reseñas públicas y su promedio para esta película.
  async resenas(peliculaId: number): Promise<Resenas> {
    const r = await this.supabase.cliente.rpc(
      'resenas_pelicula',
      { p_id: peliculaId },
    );

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // upsert inserta o actualiza: onConflict identifica la combinación película + usuario, para mantener una reseña por persona.
  async guardarResena(
    peliculaId: number,
    estrellas: number,
    comentario: string,
  ): Promise<void> {
    const usuario = await this.supabase.cliente.auth.getUser();

    if (!usuario.data.user) {
      throw new Error('Iniciá sesión para dejar tu reseña.');
    }

    const r = await this.supabase.cliente
      .from('resenas')
      .upsert(
        {
          pelicula_id: peliculaId,
          usuario_id: usuario.data.user.id,
          estrellas,
          comentario: comentario.trim(),
        },
        { onConflict: 'pelicula_id,usuario_id' },
      );

    if (r.error) throw new Error(r.error.message);
  }

  // Registra una alerta del usuario. El código 23505 significa que ya existe esa combinación y no se duplica.
  async activarAlerta(peliculaId: number): Promise<void> {
    const usuario = await this.supabase.cliente.auth.getUser();

    if (!usuario.data.user) {
      throw new Error('Iniciá sesión para activar una alerta.');
    }

    const r = await this.supabase.cliente
      .from('alertas_estreno')
      .insert({
        usuario_id: usuario.data.user.id,
        pelicula_id: peliculaId,
      });

    if (r.error && r.error.code !== '23505') {
      throw new Error(r.error.message);
    }
  }

  // Solicita a la función SQL las estadísticas agregadas dentro de las fechas elegidas.
  async reporte(desde: string, hasta: string): Promise<Reporte> {
    const r = await this.supabase.cliente.rpc(
      'reporte_cine',
      {
        p_desde: desde,
        p_hasta: hasta,
      },
    );

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Consulta las últimas 100 acciones, ordenadas de la más reciente a la más antigua.
  async actividad(): Promise<
    {
      id: number;
      usuario_id: string | null;
      accion: string;
      detalle: string;
      fecha: string;
    }[]
  > {
    const r = await this.supabase.cliente
      .from('actividad')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(100);

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Consulta las alertas de la sesión actual; la base informa si la venta ya está disponible.
  async alertas(): Promise<
    {
      pelicula_id: number;
      nombre: string;
      disponible: boolean;
    }[]
  > {
    const r = await this.supabase.cliente.rpc('mis_alertas');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
}