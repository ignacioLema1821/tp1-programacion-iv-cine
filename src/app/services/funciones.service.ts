// Servicio de programación: consulta horarios y solicita a la base crear o eliminar funciones.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, inject } from '@angular/core';
import { Funcion } from '../models/funcion';
import { SupabaseService } from './supabase.service';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({
  providedIn: 'root',
})
export class FuncionesService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabaseService = inject(SupabaseService);

  // peliculaId? es opcional. La consulta agrega filtros si se pide una película o solamente horarios futuros.
  async obtenerFunciones(peliculaId?: number, soloFuturas: boolean = false): Promise<Funcion[]> {
    // La consulta se arma por pasos. pelicula:peliculas y sala:salas incluyen datos de tablas relacionadas con esos alias.
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

    if (peliculaId !== undefined) {
      consulta = consulta.eq('pelicula_id', peliculaId);
    }

    if (soloFuturas) {
      const ahora = new Date().toISOString();
      consulta = consulta.gt('inicio', ahora);
    }

    // returns<Funcion[]> declara el tipo esperado para TypeScript; no convierte ni valida por sí solo los datos recibidos.
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

  // Delega en SQL la asignación de una sala libre, incluyendo duración y tiempo de limpieza.
  async programarFuncion(
    peliculaId: number,
    inicio: string,
    formato: string,
    idioma: string,
    precio: number,
  ): Promise<number> {
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

  // Pide eliminar por ID; el servidor comprueba el rol y las condiciones antes de modificar la base.
  async eliminarFuncion(funcionId: number): Promise<void> {
    const respuesta = await this.supabaseService.cliente.rpc('eliminar_funcion', {
      p_funcion_id: funcionId,
    });

    if (respuesta.error) {
      throw new Error(respuesta.error.message);
    }
  }
  // Envía rango, hora y días elegidos. La base programa el conjunto de funciones y devuelve cuántas creó.
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
