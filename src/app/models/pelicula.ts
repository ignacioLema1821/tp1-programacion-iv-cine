// Modelo de película: define los datos que usan la cartelera y la administración.
// interface es un contrato de campos y tipos: ayuda a TypeScript a comprobar el código; no crea tablas ni valida datos en ejecución.
export interface Pelicula {
  id: number;
  nombre: string;
  generos: string[];

  // generos son nombres para mostrar; generoIds son claves para guardar la relación de la película con esos géneros.
  generoIds: number[];

  imagen: string;
  edad_minima: number;
  destacada: boolean;
  // | null admite que no haya estreno. precio_preventa null indica que no se configuró un precio especial.
  estreno: string | null;
  dias_preventa: number;
  precio_preventa: number | null;
  // Dato agregado por el servicio para ordenar las tres películas con más entradas vendidas.
  vendidas: number;
  duracion: number;
  sinopsis: string;
}
