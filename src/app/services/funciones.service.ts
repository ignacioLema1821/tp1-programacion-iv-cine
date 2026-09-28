import { Injectable, inject } from '@angular/core';
import { Funcion } from '../models/funcion';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class FuncionesService {
  private supabaseService = inject(SupabaseService);

  async obtenerFunciones(): Promise<Funcion[]> {
    const respuesta = await this.supabaseService.cliente
      .from('funciones')
      .select(`
        id,
        pelicula_id,
        sala_id,
        inicio,
        fin,
        fin_ocupacion,
        formato,
        idioma,
        precio_base,
        pelicula:peliculas(nombre),
        sala:salas(nombre)
      `)
      .order('inicio')
      .returns<Funcion[]>();

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data;
  }

  async programarFuncion(
    peliculaId: number,
    inicio: string,
    formato: string,
    idioma: string,
    precio: number
  ): Promise<number> {
    const respuesta = await this.supabaseService.cliente.rpc(
      'programar_funcion',
      {
        p_pelicula_id: peliculaId,
        p_inicio: inicio,
        p_formato: formato,
        p_idioma: idioma,
        p_precio_base: precio
      }
    );

    if (respuesta.error) {
      throw new Error(respuesta.error.message);
    }

    return respuesta.data;
  }

  async eliminarFuncion(funcionId: number): Promise<void> {
    // La base vuelve a comprobar el rol y que la función sea futura.
    const respuesta = await this.supabaseService.cliente.rpc(
      'eliminar_funcion',
      {
        p_funcion_id: funcionId
      }
    );

    if (respuesta.error) {
      throw new Error(respuesta.error.message);
    }
  }
}