// Modelos de compra: describen el comprobante, sus entradas y el saldo de crédito y puntos.
// interface es un contrato de campos y tipos: ayuda a TypeScript a comprobar el código; no crea tablas ni valida datos en ejecución.
export interface EntradaComprada {
  fila: string;
  numero: number;
  tipo: string;
  precio: number;
}

// Estos importes son los confirmados por el servidor, no los cálculos estimados de la pantalla de selección.
export interface Comprobante {
  id: string;
  codigo: string;
  pelicula_nombre: string;
  sala_nombre: string;
  inicio: string;
  edad_minima: number;
  subtotal: number;
  descuento: number;
  total: number;
  credito_usado: number;
  pago_simulado: number;
  // La unión de textos limita los estados posibles; cine_validado y candy_validado registran usos independientes del QR.
  estado: 'pagada' | 'cancelada';
  cine_validado: boolean;
  candy_validado: boolean;
  candy: { nombre: string; cantidad: number; precio: number }[];
  entradas: EntradaComprada[];
}

// Crédito se expresa en pesos; puntos sirve para canjes. bienvenida_usada evita repetir el beneficio inicial.
export interface Saldo {
  credito: number;
  puntos: number;
  bienvenida_usada: boolean;
}
