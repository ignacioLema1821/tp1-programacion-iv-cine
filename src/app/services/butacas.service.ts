import { Injectable, inject } from '@angular/core';
import { Butaca, FuncionConRecargo } from '../models/butaca';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class ButacasService {
  private supabaseService = inject(SupabaseService);

  async obtenerFuncion(id: number): Promise<FuncionConRecargo | null> {
    const respuesta = await this.supabaseService.cliente
      .from('funciones')
      .select(
        `
        id,
        pelicula_id,
        sala_id,
        inicio,
        fin,
        fin_ocupacion,
        formato,
        idioma,
        precio_base,
        pelicula:peliculas(nombre, estreno, dias_preventa, precio_preventa, edad_minima),
        sala:salas(nombre, recargo_vip)
      `,
      )
      .eq('id', id)
      .maybeSingle<FuncionConRecargo>();

    if (respuesta.error) {
      throw respuesta.error;
    }

    // Si el administrador eliminó la función, el resultado será null.
    const funcion = respuesta.data;
    const hoy = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    if (
      funcion?.pelicula?.estreno &&
      funcion.pelicula.estreno > hoy &&
      funcion.pelicula.precio_preventa
    ) {
      funcion.precio_base = funcion.pelicula.precio_preventa;
    }
    return funcion;
  }

  async obtenerButacas(salaId: number): Promise<Butaca[]> {
    const respuesta = await this.supabaseService.cliente
      .from('butacas')
      .select('id, sala_id, fila, numero, bloque, tipo')
      .eq('sala_id', salaId)
      .order('fila')
      .order('numero')
      .returns<Butaca[]>();

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data;
  }
}
