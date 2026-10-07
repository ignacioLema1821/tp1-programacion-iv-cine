// Servicio de películas: reúne películas y géneros, ordena la cartelera y guarda datos administrativos.
// async devuelve una Promise; await espera una operación. Supabase devuelve data/error: throw pasa el error al catch de quien llamó.
// Consultas: from elige tabla, select indica campos, eq filtra por igualdad y order ordena; rpc ejecuta una función SQL.
import { Injectable, inject } from '@angular/core';
import { Pelicula } from '../models/pelicula';
import { Genero } from '../models/genero';
import { SupabaseService } from './supabase.service';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({
  providedIn: 'root',
})
export class PeliculasService {
  // inject obtiene el cliente compartido a través de SupabaseService; este servicio centraliza consultas para las pantallas.
  private supabaseService = inject(SupabaseService);

  // Consulta los géneros ordenados por nombre para los filtros y el formulario administrativo.
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

  // Reúne tres tablas: películas, géneros y su relación. Luego agrega ventas para ordenar la cartelera.
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

    // La tabla intermedia peliculas_generos permite que una película tenga varios géneros. find ubica el género por ID.
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

    // rpc llama a una función guardada en PostgreSQL y recibe sus resultados.
    const ventas = await this.supabaseService.cliente.rpc('peliculas_mas_vendidas');
    if (ventas.error) throw new Error(ventas.error.message);
    for (const pelicula of peliculas) {
      for (const venta of ventas.data as { pelicula_id: number; cantidad: number }[]) {
        if (venta.pelicula_id === pelicula.id) pelicula.vendidas += venta.cantidad;
      }
    }
    // sort compara dos elementos; un resultado negativo ubica a primero. || aplica el siguiente criterio si hay empate.
    peliculas.sort((a, b) => b.vendidas - a.vendidas || a.nombre.localeCompare(b.nombre));
    // filter conserva las que tienen ventas y slice toma hasta tres; some identifica cuáles ya están en ese primer grupo.
    const primeras = peliculas.filter((p) => p.vendidas > 0).slice(0, 3);
    const otras = peliculas.filter((p) => !primeras.some((primera) => primera.id === p.id));
    otras.sort(
      (a, b) => Number(b.destacada) - Number(a.destacada) || a.nombre.localeCompare(b.nombre),
    );
    // ... combina ambas listas en una nueva: primero las más vendidas, después las restantes.
    return [...primeras, ...otras];
  }

  // Guarda película y relaciones con géneros mediante una función SQL; id null indica una creación.
  async guardarPelicula(
    id: number | null,
    nombre: string,
    duracion: number,
    sinopsis: string,
    generoIds: number[],
  ): Promise<void> {
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
  // Guarda imagen, edad y preventa. estreno vacío se envía como null para indicar que no se configuró.
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
