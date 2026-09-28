export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  inicio: string;
  fin: string;
  fin_ocupacion: string;
  formato: string;
  idioma: string;
  precio_base: number;

  // La consulta también traerá los nombres relacionados.
  pelicula: { nombre: string } | null;
  sala: { nombre: string } | null;
}