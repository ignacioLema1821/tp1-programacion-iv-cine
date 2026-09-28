import { Injectable, inject } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { Genero } from '../models/genero';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class PeliculasService {
  private supabaseService = inject(SupabaseService);

  async obtenerGeneros(): Promise<Genero[]> {
    const respuesta = await this.supabaseService.cliente
      .from('generos')
      .select('id, nombre')
      .order('nombre');

    if (respuesta.error) {
      throw respuesta.error;
    }

    return respuesta.data;
  }

  async obtenerPeliculas(): Promise<Pelicula[]> {
    const respuestaPeliculas = await this.supabaseService.cliente
      .from('peliculas')
      .select('id, nombre, duracion, sinopsis')
      .order('nombre');

    if (respuestaPeliculas.error) {
      throw respuestaPeliculas.error;
    }

    const generos = await this.obtenerGeneros();

    const respuestaRelaciones = await this.supabaseService.cliente
      .from('peliculas_generos')
      .select('pelicula_id, genero_id');

    if (respuestaRelaciones.error) {
      throw respuestaRelaciones.error;
    }

    const peliculas: Pelicula[] = [];

    for (const datosPelicula of respuestaPeliculas.data) {
      const nombresGeneros: string[] = [];
      const idsGeneros: number[] = [];

      for (const relacion of respuestaRelaciones.data) {
        if (relacion.pelicula_id === datosPelicula.id) {
          const genero = generos.find(
            genero => genero.id === relacion.genero_id
          );

          if (genero) {
            nombresGeneros.push(genero.nombre);
            idsGeneros.push(genero.id);
          }
        }
      }

      const pelicula: Pelicula = {
        id: datosPelicula.id,
        nombre: datosPelicula.nombre,
        duracion: datosPelicula.duracion,
        sinopsis: datosPelicula.sinopsis,
        generos: nombresGeneros,
        generoIds: idsGeneros
      };

      peliculas.push(pelicula);
    }

    return peliculas;
  }

  async guardarPelicula(
    id: number | null,
    nombre: string,
    duracion: number,
    sinopsis: string,
    generoIds: number[]
  ): Promise<void> {
    // rpc permite ejecutar la función que creamos en PostgreSQL.
    const respuesta = await this.supabaseService.cliente.rpc(
      'guardar_pelicula',
      {
        p_id: id,
        p_nombre: nombre,
        p_duracion: duracion,
        p_sinopsis: sinopsis,
        p_generos: generoIds
      }
    );

    if (respuesta.error) {
      throw respuesta.error;
    }
  }
}