export interface EntradaComprada {
  fila: string;
  numero: number;
  tipo: string;
  precio: number;
}

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
  estado: 'pagada' | 'cancelada';
  cine_validado: boolean;
  candy_validado: boolean;
  candy: { nombre: string; cantidad: number; precio: number }[];
  entradas: EntradaComprada[];
}

export interface Saldo {
  credito: number;
  puntos: number;
  bienvenida_usada: boolean;
}
