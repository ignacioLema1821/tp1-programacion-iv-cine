// Servicio del plano: consulta la función elegida y las butacas de su sala.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, inject } from '@angular/core';
import { Butaca, FuncionConRecargo } from '../models/butaca';
import { SupabaseService } from './supabase.service';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({
  providedIn: 'root',
})
export class ButacasService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabaseService = inject(SupabaseService);

  // Busca una función por ID e incluye su película y sala. maybeSingle admite una fila o ninguna (null).
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

  // Trae el plano de una sala, ordenado por fila y número; no consulta aquí la ocupación por función.
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
