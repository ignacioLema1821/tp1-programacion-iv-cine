export interface Categoria {
  id: number;
  nombre: string;
}
export interface Producto {
  id: number;
  categoria_id: number;
  nombre: string;
  precio: number;
  activo: boolean;
}
export interface Combo {
  id: number;
  nombre: string;
  precio: number;
  pochoclo_id: number;
  bebida_id: number;
  activo: boolean;
}
export interface Cupon {
  id: number;
  codigo: string;
  porcentaje: number;
  edad_minima: number;
  activo: boolean;
}
export interface Recompensa {
  id: number;
  nombre: string;
  costo_puntos: number;
  tipo: 'entrada' | 'candy';
  producto_id: number | null;
  activo: boolean;
}
export interface Configuracion {
  descuento_bienvenida: number;
  puntos_por_peso: number;
}
export interface Resenas {
  promedio: number;
  resenas: { estrellas: number; comentario: string; fecha: string }[];
}
export interface Reporte {
  diario: {
    dia: string;
    facturacion: number;
    entradas: number;
    pago_simulado: number;
    credito: number;
  }[];
  peliculas: { pelicula: string; entradas: number; vistas: number }[];
  candy: { nombre: string; cantidad: number }[];
}
