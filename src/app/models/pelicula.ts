export interface Pelicula {
  id: number;
  nombre: string;
  generos: string[];

  // Los nombres se muestran; los IDs se usan para guardar relaciones.
  generoIds: number[];

  duracion: number;
  sinopsis: string;
}