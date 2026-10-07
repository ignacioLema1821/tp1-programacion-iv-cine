export interface Pelicula {
  id: number;
  nombre: string;
  generos: string[];

  // Los nombres se muestran; los IDs se usan para guardar relaciones.
  generoIds: number[];

  imagen: string;
  edad_minima: number;
  destacada: boolean;
  estreno: string | null;
  dias_preventa: number;
  precio_preventa: number | null;
  vendidas: number;
  duracion: number;
  sinopsis: string;
}
