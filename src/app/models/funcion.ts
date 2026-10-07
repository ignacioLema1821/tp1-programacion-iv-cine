// Modelo de función: una proyección concreta, con película, sala, horario y precio.
// interface es un contrato de campos y tipos: ayuda a TypeScript a comprobar el código; no crea tablas ni valida datos en ejecución.
export interface Funcion {
  id: number;
  pelicula_id: number;
  sala_id: number;
  inicio: string;
  fin: string;
  // fin es el final de la película; fin_ocupacion incluye el tiempo de limpieza antes de reutilizar la sala.
  fin_ocupacion: string;
  formato: string;
  idioma: string;
  precio_base: number;

  pelicula: {
    nombre: string;
    // ? indica un campo opcional; | null significa que también puede venir sin una fecha configurada.
    estreno?: string | null;
    dias_preventa?: number;
    precio_preventa?: number | null;
    edad_minima?: number;
  } | null;
  sala: { nombre: string } | null;
}
