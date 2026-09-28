import { Component, inject, signal } from '@angular/core'; // Importa las herramientas del componente.
import { FormsModule, NgForm } from '@angular/forms'; // Importa ngModel y el tipo que representa el formulario.
import { AuthService } from '../../services/auth.service'; // Importa el servicio de autenticación.
import { DatosRegistro } from '../../models/datos-registro'; // Importa el modelo de datos personales.

@Component({ 
  selector: 'app-registro', // Define la etiqueta del componente.
  standalone: true, // Permite declarar sus dependencias directamente.
  imports: [FormsModule], // Habilita ngModel y la gestión del formulario.
  templateUrl: './registro.html', // Indica el archivo HTML.
  styleUrl: './registro.css' // Indica el archivo de estilos.
}) 

export class Registro { 
  private authService = inject(AuthService); // Obtiene el servicio que registra usuarios.

  datos: DatosRegistro = { 
    email: '', // Comienza con el correo vacío.
    nombre: '', // Comienza con el nombre vacío.
    apellido: '', // Comienza con el apellido vacío.
    fechaNacimiento: '', // Comienza sin fecha seleccionada.
    tipoSangre: '', // Comienza sin grupo sanguíneo seleccionado.
    colorOjos: '', // Comienza con el color de ojos vacío.
    diasVacaciones: 0 // Comienza con cero días de vacaciones.
  }; 

  password = ''; // Guarda temporalmente la contraseña escrita.
  confirmarPassword = ''; // Guarda la repetición para comprobar que coincidan.

  tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']; 

  cargando = signal(false); // Indica si se está enviando el registro.
  mensajeError = signal(''); // Guarda el mensaje de error para la pantalla.
  mensajeExito = signal(''); // Guarda el mensaje que se muestra al terminar correctamente.

  get fechaActual(): string { // Calcula la fecha local de hoy.
    const hoy = new Date(); // Obtiene la fecha actual.
    const anio = hoy.getFullYear(); // Obtiene el año.
    const mes = String(hoy.getMonth() + 1).padStart(2, '0'); // Obtiene el mes y agrega un cero si tiene un solo dígito.
    const dia = String(hoy.getDate()).padStart(2, '0'); // Obtiene el día con dos dígitos.
    return `${anio}-${mes}-${dia}`; // Devuelve la fecha en el formato que utiliza el campo.
  } // Termina el getter de fecha.

  async registrar(formulario: NgForm): Promise<void> { // Recibe el formulario y procesa el registro.
    if (this.cargando()) { // Comprueba si ya hay una solicitud en curso.
      return; // Evita enviar otra solicitud al mismo tiempo.
    } // Termina la comprobación.

    this.mensajeError.set(''); // Limpia el mensaje de error anterior.
    this.mensajeExito.set(''); // Limpia el mensaje de éxito anterior.

    if (formulario.invalid) { // Comprueba las validaciones configuradas en el HTML.
      this.mensajeError.set('Revisá los campos obligatorios, el correo y la contraseña.'); // Explica qué revisar.
      return; // Detiene el registro.
    } // Termina la validación general.

    if (!this.datos.nombre.trim() || !this.datos.apellido.trim() || !this.datos.colorOjos.trim()) { // Rechaza textos que tengan solamente espacios.
      this.mensajeError.set('Nombre, apellido y color de ojos no pueden contener solamente espacios.'); // Informa el problema.
      return; // Detiene el registro.
    } // Termina la validación de textos.

    if (this.datos.fechaNacimiento > this.fechaActual) { // Comprueba que la fecha no sea futura.
      this.mensajeError.set('La fecha de nacimiento no puede ser posterior a hoy.'); // Explica el problema.
      return; // Detiene el registro.
    } // Termina la validación de fecha.

    if (!Number.isInteger(this.datos.diasVacaciones) || this.datos.diasVacaciones < 0) { // Exige un número entero igual o mayor que cero.
      this.mensajeError.set('Los días de vacaciones deben ser un número entero igual o mayor que cero.'); // Informa el problema.
      return; // Detiene el registro.
    } // Termina la validación de vacaciones.

    if (this.password !== this.confirmarPassword) { // Compara las dos contraseñas.
      this.mensajeError.set('Las contraseñas no coinciden.'); // Informa que deben ser iguales.
      return; // Detiene el registro.
    } // Termina la comparación.

    this.cargando.set(true); // Activa el estado de envío.

    try { // Intenta realizar el registro.
      const sesionIniciada = await this.authService.registrar(this.datos, this.password); // Espera la respuesta del servicio.

      if (sesionIniciada) { // Comprueba si Supabase inició una sesión.
        this.mensajeExito.set('Tu cuenta está lista y la sesión quedó iniciada.'); // Informa el resultado.
      } else { // Maneja el caso en el que no se inició una sesión.
        this.mensajeExito.set('Revisá tu correo para confirmar el registro. Si ya tenías una cuenta, utilizá el inicio de sesión.'); // Indica cómo continuar.
      } 

      this.password = ''; // Borra la contraseña de la propiedad del componente.
      this.confirmarPassword = ''; // Borra también su repetición.
    } catch (error) { // Recibe errores del servicio o de la conexión.
      console.error('Error de registro:', error); // Deja el detalle técnico en la consola.
      this.mensajeError.set('No pudimos completar el registro. Revisá los datos e intentá nuevamente.'); // Muestra un mensaje al usuario.
    } finally { // Se ejecuta tanto si hubo éxito como si hubo un error.
      this.cargando.set(false); // Finaliza el estado de envío.
    } 
  } 
} 