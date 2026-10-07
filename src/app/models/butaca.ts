import { Funcion } from './funcion';

export interface Butaca {
  id: number;
  sala_id: number;
  fila: string;
  numero: number;
  bloque: number;
  tipo: 'comun' | 'accesible' | 'vip';
}

// Para dibujar el plano, agrupamos las butacas por fila y por bloque.
export interface FilaButacas {
  letra: string;
  accesible: boolean;
  bloques: {
    numero: number;
    butacas: Butaca[];
  }[];
}

// Reutilizamos los datos de Funcion y agregamos el recargo de su sala.
export interface FuncionConRecargo extends Funcion {
  sala: {
    nombre: string;
    recargo_vip: number;
  } | null;
}
