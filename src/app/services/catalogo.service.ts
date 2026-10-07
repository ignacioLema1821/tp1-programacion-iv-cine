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

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private supabase = inject(SupabaseService);

  async categorias(): Promise<Categoria[]> {
    const r = await this.supabase.cliente
      .from('categorias_candy')
      .select('*')
      .order('nombre');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  async productos(): Promise<Producto[]> {
    const r = await this.supabase.cliente
      .from('productos_candy')
      .select('*')
      .order('nombre');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  async combos(): Promise<Combo[]> {
    const r = await this.supabase.cliente
      .from('combos')
      .select('*')
      .order('nombre');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  async cupones(): Promise<Cupon[]> {
    const r = await this.supabase.cliente
      .from('cupones')
      .select('*')
      .order('codigo');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  async recompensas(): Promise<Recompensa[]> {
    const r = await this.supabase.cliente
      .from('recompensas')
      .select('*')
      .order('costo_puntos');

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  async configuracion(): Promise<Configuracion> {
    const r = await this.supabase.cliente
      .from('configuracion_cine')
      .select('descuento_bienvenida,puntos_por_peso')
      .eq('id', 1)
      .single();

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  // Los formularios del catálogo comparten este método de guardado.
  async guardar(
    tabla:
      | 'categorias_candy'
      | 'productos_candy'
      | 'combos'
      | 'cupones'
      | 'recompensas',
    datos: Record<string, unknown>,
  ): Promise<void> {
    // Copiamos los datos para no modificar el objeto del formulario.
    const copia = { ...datos };
    const id = copia['id'];

    // El ID se genera en la base y no se guarda como un campo editable.
    delete copia['id'];

    // Si no tiene ID, es un registro nuevo.
    if (id === null || id === undefined) {
      const r = await this.supabase.cliente
        .from(tabla)
        .insert(copia);

      if (r.error) throw new Error(r.error.message);
      return;
    }

    // Si tiene ID, actualizamos únicamente esa fila.
    const r = await this.supabase.cliente
      .from(tabla)
      .update(copia)
      .eq('id', id)
      .select('id')
      .single();

    if (r.error) throw new Error(r.error.message);
  }

  async guardarConfiguracion(datos: Configuracion): Promise<void> {
    const r = await this.supabase.cliente
      .from('configuracion_cine')
      .update(datos)
      .eq('id', 1);

    if (r.error) throw new Error(r.error.message);
  }

  async resenas(peliculaId: number): Promise<Resenas> {
    const r = await this.supabase.cliente.rpc(
      'resenas_pelicula',
      { p_id: peliculaId },
    );

    if (r.error) throw new Error(r.error.message);
    return r.data;
  }

  async guardarResena(
    peliculaId: number,
    estrellas: number,
    comentario: string,
  ): Promise<void> {
    const usuario = await this.supabase.cliente.auth.getUser();

    if (!usuario.data.user) {
      throw new Error('Iniciá sesión para dejar tu reseña.');
    }

    // Una persona puede tener una reseña por película y modificarla.
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

    // Si la alerta ya existe, no necesitamos crearla nuevamente.
    if (r.error && r.error.code !== '23505') {
      throw new Error(r.error.message);
    }
  }

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