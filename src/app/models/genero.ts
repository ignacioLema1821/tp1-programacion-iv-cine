// Modelo de género: identifica cada categoría de películas con un ID y un nombre.
// interface es un contrato de campos y tipos: ayuda a TypeScript a comprobar el código; no crea tablas ni valida datos en ejecución.
export interface Genero {
  id: number;
  nombre: string;
}
