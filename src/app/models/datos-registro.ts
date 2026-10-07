// Modelo del registro: define los datos personales que el formulario envía a AuthService.
// interface es un contrato de campos y tipos: ayuda a TypeScript a comprobar el código; no crea tablas ni valida datos en ejecución.
export interface DatosRegistro {
  email: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  tipoSangre: string;
  colorOjos: string;
  diasVacaciones: number;
}
