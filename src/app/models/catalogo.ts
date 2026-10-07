// Modelos del catálogo: describen productos, combos, beneficios, reseñas y resultados de reportes.
// interface es un contrato de campos y tipos: ayuda a TypeScript a comprobar el código; no crea tablas ni valida datos en ejecución.
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
// Los IDs relacionan el combo con los productos; su precio es el importe fijo del conjunto.
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
// Una recompensa de entrada no requiere producto_id; una de candy identifica el producto que se canjea.
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
// Las llaves describen objetos y [] describe listas; aquí viajan el promedio y la lista de reseñas juntos.
export interface Resenas {
  promedio: number;
  resenas: { estrellas: number; comentario: string; fecha: string }[];
}
// diario, peliculas y candy son listas de resultados calculados por la función de reportes en la base.
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
