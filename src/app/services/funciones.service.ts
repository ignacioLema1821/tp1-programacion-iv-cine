import { Injectable, inject } from '@angular/core';
import { Funcion } from '../models/funcion';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class FuncionesService {
  private supabaseService = inject(SupabaseService);

  // Sin parámetros devuelve todas las funciones para el administrador.
  async obtenerFunciones(peliculaId?: number, soloFuturas: boolean = false): Promise<Funcion[]> {
    let consulta = this.supabaseService.cliente.from('funciones').select(`
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
        sala:salas(nombre)
      `);

    // eq significa "igual a": limita la consulta a una película.
    if (peliculaId !== undefined) {
      consulta = consulta.eq('pelicula_id', peliculaId);
    }

    // gt significa "mayor que": buscamos inicios posteriores a ahora.
    if (soloFuturas) {
      const ahora = new Date().toISOString();
      consulta = consulta.gt('inicio', ahora);
    }

    const respuesta = await consulta.order('inicio').returns<Funcion[]>();

    if (respuesta.error) {
      throw respuesta.error;
    }

    const hoy = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
    });
    for (const funcion of respuesta.data) {
      if (
        soloFuturas &&
        funcion.pelicula?.estreno &&
        funcion.pelicula.estreno > hoy &&
        funcion.pelicula.precio_preventa
      ) {
        funcion.precio_base = funcion.pelicula.precio_preventa;
      }
    }
    return respuesta.data;
  }

  async programarFuncion(
    peliculaId: number,
    inicio: string,
    formato: string,
    idioma: string,
    precio: number,
  ): Promise<number> {
    // La función SQL valida los datos y asigna una sala disponible.
    const respuesta = await this.supabaseService.cliente.rpc('programar_funcion', {
      p_pelicula_id: peliculaId,
      p_inicio: inicio,
      p_formato: formato,
      p_idioma: idioma,
      p_precio_base: precio,
    });

    if (respuesta.error) {
      throw new Error(respuesta.error.message);
    }

    return respuesta.data;
  }

  async eliminarFuncion(funcionId: number): Promise<void> {
    // La base comprueba el rol y que la función todavía no haya comenzado.
    const respuesta = await this.supabaseService.cliente.rpc('eliminar_funcion', {
      p_funcion_id: funcionId,
    });

    if (respuesta.error) {
      throw new Error(respuesta.error.message);
    }
  }
  async programarPeriodo(
    peliculaId: number,
    desde: string,
    hasta: string,
    hora: string,
    dias: number[],
    formato: string,
    idioma: string,
    precio: number,
  ): Promise<number> {
    const r = await this.supabaseService.cliente.rpc('programar_periodo', {
      p_pelicula_id: peliculaId,
      p_desde: desde,
      p_hasta: hasta,
      p_hora: hora,
      p_dias: dias,
      p_formato: formato,
      p_idioma: idioma,
      p_precio: precio,
    });
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
}
