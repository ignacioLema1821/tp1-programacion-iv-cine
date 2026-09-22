import { Injectable, inject } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class PeliculasService {
  private supabaseService = inject(SupabaseService);

  async obtenerPeliculas(): Promise<Pelicula[]> {
    const respuestaPeliculas = await this.supabaseService.cliente
      .from('peliculas')
      .select('id, nombre, duracion, sinopsis')
      .order('nombre');

    if (respuestaPeliculas.error) {
      throw respuestaPeliculas.error;
    }

    const respuestaGeneros = await this.supabaseService.cliente
      .from('generos')
      .select('id, nombre');

    if (respuestaGeneros.error) {
      throw respuestaGeneros.error;
    }

    const respuestaRelaciones = await this.supabaseService.cliente
      .from('peliculas_generos')
      .select('pelicula_id, genero_id');

    if (respuestaRelaciones.error) {
      throw respuestaRelaciones.error;
    }

    const peliculas: Pelicula[] = [];

    for (const datosPelicula of respuestaPeliculas.data) {
      const generosPelicula: string[] = [];

      for (const relacion of respuestaRelaciones.data) {
        if (relacion.pelicula_id === datosPelicula.id) {
          const genero = respuestaGeneros.data.find(
            genero => genero.id === relacion.genero_id
          );

          if (genero) {
            generosPelicula.push(genero.nombre);
          }
        }
      }

      const pelicula: Pelicula = {
        id: datosPelicula.id,
        nombre: datosPelicula.nombre,
        duracion: datosPelicula.duracion,
        sinopsis: datosPelicula.sinopsis,
        generos: generosPelicula
      };

      peliculas.push(pelicula);
    }

    return peliculas;
  }
}