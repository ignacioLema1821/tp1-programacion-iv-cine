import { Injectable, inject } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { Genero } from '../models/genero';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
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
      .select(
        'id, nombre, duracion, sinopsis, imagen, edad_minima, destacada, estreno, dias_preventa, precio_preventa',
      )
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
          const genero = generos.find((genero) => genero.id === relacion.genero_id);

          if (genero) {
            nombresGeneros.push(genero.nombre);
            idsGeneros.push(genero.id);
          }
        }
      }

      const pelicula: Pelicula = {
        id: datosPelicula.id,
        nombre: datosPelicula.nombre,
        imagen: datosPelicula.imagen,
        edad_minima: datosPelicula.edad_minima,
        destacada: datosPelicula.destacada,
        estreno: datosPelicula.estreno,
        dias_preventa: datosPelicula.dias_preventa,
        precio_preventa: datosPelicula.precio_preventa,
        vendidas: 0,
        duracion: datosPelicula.duracion,
        sinopsis: datosPelicula.sinopsis,
        generos: nombresGeneros,
        generoIds: idsGeneros,
      };

      peliculas.push(pelicula);
    }

    const ventas = await this.supabaseService.cliente.rpc('peliculas_mas_vendidas');
    if (ventas.error) throw new Error(ventas.error.message);
    for (const pelicula of peliculas) {
      for (const venta of ventas.data as { pelicula_id: number; cantidad: number }[]) {
        if (venta.pelicula_id === pelicula.id) pelicula.vendidas += venta.cantidad;
      }
    }
    // Primero las tres más vendidas; después destacadas y orden alfabético.
    peliculas.sort((a, b) => b.vendidas - a.vendidas || a.nombre.localeCompare(b.nombre));
    const primeras = peliculas.filter((p) => p.vendidas > 0).slice(0, 3);
    const otras = peliculas.filter((p) => !primeras.some((primera) => primera.id === p.id));
    otras.sort(
      (a, b) => Number(b.destacada) - Number(a.destacada) || a.nombre.localeCompare(b.nombre),
    );
    return [...primeras, ...otras];
  }

  async guardarPelicula(
    id: number | null,
    nombre: string,
    duracion: number,
    sinopsis: string,
    generoIds: number[],
  ): Promise<void> {
    // rpc permite ejecutar la función que creamos en PostgreSQL.
    const respuesta = await this.supabaseService.cliente.rpc('guardar_pelicula', {
      p_id: id,
      p_nombre: nombre,
      p_duracion: duracion,
      p_sinopsis: sinopsis,
      p_generos: generoIds,
    });

    if (respuesta.error) {
      throw respuesta.error;
    }
  }
  async guardarDetalles(
    id: number,
    imagen: string,
    edad: number,
    destacada: boolean,
    estreno: string,
    dias: number,
    precio: number | null,
  ): Promise<void> {
    const r = await this.supabaseService.cliente.rpc('guardar_detalles_pelicula', {
      p_id: id,
      p_imagen: imagen.trim(),
      p_edad: edad,
      p_destacada: destacada,
      p_estreno: estreno || null,
      p_dias: dias,
      p_precio: precio,
    });
    if (r.error) throw new Error(r.error.message);
  }
}
