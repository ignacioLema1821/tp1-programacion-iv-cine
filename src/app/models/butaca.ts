// Modelos del plano: describen una butaca, su agrupación por fila y la función con recargo VIP.
// interface es un contrato de campos y tipos: ayuda a TypeScript a comprobar el código; no crea tablas ni valida datos en ejecución.
import { Funcion } from './funcion';

export interface Butaca {
  id: number;
  sala_id: number;
  fila: string;
  numero: number;
  bloque: number;
  // La unión de textos limita tipo a estas tres opciones durante la comprobación de TypeScript.
  tipo: 'comun' | 'accesible' | 'vip';
}

// Cada fila contiene tres bloques y cada bloque una lista Butaca[]: esta estructura la prepara el componente.
export interface FilaButacas {
  letra: string;
  accesible: boolean;
  bloques: {
    numero: number;
    butacas: Butaca[];
  }[];
}

// extends reutiliza el contrato de Funcion y precisa los datos adicionales de sala; | null admite que no exista la relación.
export interface FuncionConRecargo extends Funcion {
  sala: {
    nombre: string;
    recargo_vip: number;
  } | null;
}
