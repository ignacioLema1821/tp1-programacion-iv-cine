// Selección y compra: dibuja el plano, actualiza ocupación y arma el carrito con un precio estimado.
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Butaca, FilaButacas, FuncionConRecargo } from '../../models/butaca';
import { ButacasService } from '../../services/butacas.service';
import { CatalogoService } from '../../services/catalogo.service';
import { Producto, Combo, Cupon, Recompensa } from '../../models/catalogo';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ComprasService } from '../../services/compras.service';
import { DisponibilidadService } from '../../services/disponibilidad.service';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-butacas',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './butacas.html',
  styleUrl: './butacas.css',
})
export class Butacas implements OnDestroy {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private ruta = inject(ActivatedRoute);
  private butacasService = inject(ButacasService);

  auth = inject(AuthService);
  private compras = inject(ComprasService);
  private catalogo = inject(CatalogoService);
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  cupones = signal<Cupon[]>([]);
  recompensas = signal<Recompensa[]>([]);
  puntos = signal(0);
  // Record<number, number> es un diccionario: cantidades[idProducto] guarda cuántas unidades se eligieron.
  cantidades: Record<number, number> = {};
  comboId: number | null = null;
  recompensaId: number | null = null;
  cupon = '';
  private disponibilidad = inject(DisponibilidadService);
  private router = inject(Router);
  ocupadas = signal<number[]>([]);
  disponibilidadLista = signal(false);
  avisoDisponibilidad = signal('');
  mostrarCompra = signal(false);
  comprando = signal(false);
  errorCompra = signal('');
  descuento = signal(0);
  credito = signal(0);
  correo = '';
  nacimiento = '';
  usarCredito = false;
  confirmarSimulacion = false;
  private dejarDeEscuchar: (() => void) | null = null;
  private refresco: ReturnType<typeof setInterval> | null = null;
  private consultaDisponibilidad = 0;

  private funcionId = 0;
  private numeroCarga = 0;

  funcion = signal<FuncionConRecargo | null>(null);
  filas = signal<FilaButacas[]>([]);
  seleccionadas = signal<Butaca[]>([]);
  cargando = signal(true);
  mensajeError = signal('');
  funcionComenzada = signal(false);

  // computed es una señal calculada: total() se lee igual que una señal y cambia cuando cambian sus dependencias.
  total = computed(() => {
    let centavos = 0;

    for (const butaca of this.seleccionadas()) {
      centavos += this.precioEnCentavos(butaca);
    }

    return centavos / 100;
  });

  private reloj = setInterval(() => this.comprobarHorario(), 1000);

  // ActivatedRoute lee el parámetro funcionId de la URL. subscribe escucha sus cambios y carga esa función.
  constructor() {
    // pipe aplica takeUntilDestroyed al observable: la suscripción se cierra automáticamente al retirar el componente.
    this.ruta.paramMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      this.funcionId = Number(parametros.get('funcionId'));
      void this.cargarDatos();
    });
  }

  // Angular llama a ngOnDestroy al retirar el componente: aquí liberamos relojes, suscripciones o cámara para no dejarlos activos.
  ngOnDestroy(): void {
    clearInterval(this.reloj);
    // ?.() llama a la función solo si existe; es útil cuando todavía no se abrió la suscripción.
    this.dejarDeEscuchar?.();
    if (this.refresco) clearInterval(this.refresco);
    this.consultaDisponibilidad++;
    this.numeroCarga++;
  }

  // Carga función, plano y ocupación. El contador numeroCarga evita aplicar respuestas de otra función anterior.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async cargarDatos(): Promise<void> {
    const cargaActual = ++this.numeroCarga;
    this.dejarDeEscuchar?.();
    if (this.refresco) clearInterval(this.refresco);
    this.consultaDisponibilidad++;
    this.ocupadas.set([]);
    this.disponibilidadLista.set(false);
    this.avisoDisponibilidad.set('');
    this.mostrarCompra.set(false);
    const id = this.funcionId;

    this.cargando.set(true);
    this.mensajeError.set('');
    this.funcion.set(null);
    this.filas.set([]);
    this.seleccionadas.set([]);
    this.funcionComenzada.set(false);

    if (!Number.isSafeInteger(id) || id <= 0) {
      this.mensajeError.set('La dirección de la función no es válida.');
      this.cargando.set(false);
      return;
    }

    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      const funcion = await this.butacasService.obtenerFuncion(id);

      if (cargaActual !== this.numeroCarga) {
        return;
      }

      if (!funcion) {
        this.mensajeError.set('La función no existe o fue eliminada.');
        return;
      }

      if (!funcion.sala || !funcion.pelicula) {
        throw new Error('Faltan los datos de la sala o la película.');
      }

      this.funcion.set(funcion);
      this.comprobarHorario();

      if (this.funcionComenzada()) {
        return;
      }

      const butacas = await this.butacasService.obtenerButacas(funcion.sala_id);

      if (cargaActual !== this.numeroCarga) {
        return;
      }

      if (butacas.length === 0) {
        this.mensajeError.set('Esta sala todavía no tiene un plano cargado.');
        return;
      }

      this.filas.set(this.agruparPorFila(butacas));
      await this.actualizarDisponibilidad();
      if (cargaActual !== this.numeroCarga) return;
      this.dejarDeEscuchar = this.disponibilidad.escuchar(id, () => {
        void this.actualizarDisponibilidad();
      });
      this.refresco = setInterval(() => {
        void this.actualizarDisponibilidad();
      }, 10000);
      this.comprobarHorario();
    } catch (error) {
      if (cargaActual === this.numeroCarga) {
        console.error('Error al cargar las butacas:', error);
        this.mensajeError.set('No pudimos cargar el plano. Intentá nuevamente.');
      }
    } finally {
      if (cargaActual === this.numeroCarga) {
        this.cargando.set(false);
      }
    }
  }

  // Convierte una lista plana en filas con bloques izquierdo, central y derecho, para dibujar los pasillos.
  private agruparPorFila(butacas: Butaca[]): FilaButacas[] {
    const filas: FilaButacas[] = [];

    for (const butaca of butacas) {
      let fila = filas.find((fila) => fila.letra === butaca.fila);

      if (!fila) {
        fila = {
          letra: butaca.fila,
          accesible: butaca.tipo === 'accesible',
          bloques: [
            { numero: 1, butacas: [] },
            { numero: 2, butacas: [] },
            { numero: 3, butacas: [] },
          ],
        };

        filas.push(fila);
      }

      const bloque = fila.bloques.find((bloque) => bloque.numero === butaca.bloque);

      if (bloque) {
        bloque.butacas.push(butaca);
      }
    }

    return filas;
  }

  // some devuelve true si al menos una butaca seleccionada tiene el mismo ID.
  estaSeleccionada(butaca: Butaca): boolean {
    return this.seleccionadas().some((elegida) => elegida.id === butaca.id);
  }

  // Primero verifica que se pueda elegir; después agrega o quita la butaca. Seleccionarla todavía no la reserva.
  alternarButaca(butaca: Butaca): void {
    this.comprobarHorario();

    if (
      this.cargando() ||
      this.comprando() ||
      !this.disponibilidadLista() ||
      this.ocupadas().includes(butaca.id) ||
      this.funcionComenzada() ||
      !this.funcion()
    ) {
      return;
    }

    if (this.estaSeleccionada(butaca)) {
      this.seleccionadas.set(this.seleccionadas().filter((elegida) => elegida.id !== butaca.id));
    } else {
      // ... copia las seleccionadas y agrega una butaca. set recibe una lista nueva para comunicar el cambio a la señal.
      const nuevas = [...this.seleccionadas(), butaca];
      this.seleccionadas.set(nuevas);
    }
  }

  // Vacía la selección local, siempre que no se esté procesando una compra.
  limpiarSeleccion(): void {
    if (this.comprando()) return;
    this.seleccionadas.set([]);
  }

  // Si llegó la hora de inicio, bloquea esta pantalla de compra y limpia la selección.
  private comprobarHorario(): void {
    const funcion = this.funcion();

    if (!funcion || this.funcionComenzada()) {
      return;
    }

    if (new Date(funcion.inicio).getTime() <= Date.now()) {
      this.funcionComenzada.set(true);
      this.seleccionadas.set([]);
    }
  }

  // Calcula el precio de una butaca y agrega el recargo si es VIP; redondea antes de sumar para trabajar en centavos.
  private precioEnCentavos(butaca: Butaca): number {
    const funcion = this.funcion();

    if (!funcion || !funcion.sala) {
      return 0;
    }

    const base = Math.round(funcion.precio_base * 100);

    if (butaca.tipo === 'vip') {
      return Math.round(base * (1 + funcion.sala.recargo_vip / 100));
    }

    return base;
  }

  // Convierte centavos a pesos para mostrar el precio de cada entrada.
  precioButaca(butaca: Butaca): number {
    return this.precioEnCentavos(butaca) / 100;
  }

  // Traduce el valor guardado en la base a un nombre legible en la pantalla.
  nombreTipo(butaca: Butaca): string {
    if (butaca.tipo === 'vip') {
      return 'VIP';
    }

    if (butaca.tipo === 'accesible') {
      return 'Accesible';
    }

    return 'Común';
  }

  // Devuelve una marca visual: selección, VIP, accesible o común; acompaña al color del botón.
  marcaButaca(butaca: Butaca): string {
    if (this.estaSeleccionada(butaca)) {
      return '✓';
    }

    if (butaca.tipo === 'vip') {
      return 'V';
    }

    if (butaca.tipo === 'accesible') {
      return 'A';
    }

    return 'C';
  }

  // toLocaleString formatea el número como moneda argentina; no cambia el importe de la compra.
  mostrarPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    });
  }

  // Actualiza IDs ocupados y quita selecciones que otra compra ya ocupó. Solo acepta la consulta más reciente.
  async actualizarDisponibilidad(): Promise<void> {
    const consulta = ++this.consultaDisponibilidad;
    const id = this.funcionId;
    try {
      const ocupadas = await this.disponibilidad.ocupadas(id);
      if (consulta !== this.consultaDisponibilidad || id !== this.funcionId) return;
      this.ocupadas.set(ocupadas);
      this.disponibilidadLista.set(true);
      this.avisoDisponibilidad.set('');
      const antes = this.seleccionadas();
      const disponibles = antes.filter((butaca) => !ocupadas.includes(butaca.id));
      if (disponibles.length !== antes.length) {
        this.seleccionadas.set(disponibles);
        this.errorCompra.set('Otra compra ocupó una de las butacas elegidas. Revisá tu selección.');
      }
    } catch {
      if (consulta === this.consultaDisponibilidad) {
        this.disponibilidadLista.set(false);
        this.avisoDisponibilidad.set('No pudimos verificar la disponibilidad. Reintentando...');
      }
    }
  }

  // Verifica ocupación y carga candy, beneficios y saldo antes de mostrar el formulario de compra.
  async prepararCompra(): Promise<void> {
    if (this.comprando() || this.seleccionadas().length === 0) return;
    this.errorCompra.set('');
    this.descuento.set(0);
    this.credito.set(0);
    this.confirmarSimulacion = false;
    this.usarCredito = false;
    try {
      await this.actualizarDisponibilidad();
      if (!this.disponibilidadLista() || this.seleccionadas().length === 0) return;
      this.productos.set((await this.catalogo.productos()).filter((p) => p.activo));
      this.combos.set((await this.catalogo.combos()).filter((c) => c.activo));
      this.cupones.set((await this.catalogo.cupones()).filter((c) => c.activo));
      this.recompensas.set((await this.catalogo.recompensas()).filter((r) => r.activo));
      this.cantidades = {};
      this.comboId = null;
      this.recompensaId = null;
      this.cupon = '';
      const usuario = this.auth.usuario();
      this.correo = usuario?.email || '';
      // Este dato sirve para completar la pantalla y estimar descuentos; la base usa la fecha protegida del registro para usuarios con cuenta.
      this.nacimiento = usuario?.user_metadata['fecha_nacimiento'] || '';
      if (usuario) {
        const saldo = await this.compras.saldo(usuario.id);
        this.credito.set(saldo.credito);
        this.puntos.set(saldo.puntos);
        if (!saldo.bienvenida_usada) this.descuento.set(await this.compras.descuentoBienvenida());
      }
      this.mostrarCompra.set(true);
    } catch (error) {
      this.errorCompra.set(
        error instanceof Error ? error.message : 'No pudimos preparar la compra.',
      );
    }
  }

  // Estima entradas + candy + combo/canje y el mayor descuento válido. El precio definitivo lo recalcula Supabase.
  totalConDescuento(): number {
    let subtotal = this.total();
    for (const producto of this.productos())
      subtotal += producto.precio * (this.cantidades[producto.id] || 0);
    // map extrae precios; ... los pasa a Math.min. El combo sustituye una entrada y conserva el recargo VIP que corresponda.
    const entradaMenor = Math.min(...this.seleccionadas().map((b) => this.precioButaca(b)));
    const combo = this.combos().find((c) => c.id === this.comboId);
    if (combo && Number.isFinite(entradaMenor)) {
      const base = this.funcion()?.precio_base || 0;
      subtotal += combo.precio - entradaMenor + Math.max(0, entradaMenor - base);
    }
    const recompensa = this.recompensas().find((r) => r.id === this.recompensaId);
    if (recompensa?.tipo === 'entrada' && Number.isFinite(entradaMenor)) subtotal -= entradaMenor;
    if (recompensa?.tipo === 'candy') {
      const producto = this.productos().find((p) => p.id === recompensa.producto_id);
      if (producto && this.cantidades[producto.id] > 0) subtotal -= producto.precio;
    }
    let porcentaje = this.descuento();
    const cupon = this.cupones().find((c) => c.codigo === this.cupon.trim().toUpperCase());
    if (cupon && this.auth.usuario()) {
      const fecha = new Date(this.nacimiento + 'T12:00:00');
      const hoy = new Date();
      let edad = hoy.getFullYear() - fecha.getFullYear();
      if (
        hoy.getMonth() < fecha.getMonth() ||
        (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate())
      )
        edad--;
      if (cupon.edad_minima === 0 || edad >= cupon.edad_minima)
        porcentaje = Math.max(porcentaje, cupon.porcentaje);
    }
    return Math.round(Math.max(0, subtotal) * (1 - porcentaje / 100) * 100) / 100;
  }

  // Si se usa crédito, resta hasta el total: Math.max evita presentar un pago negativo.
  pagoEstimado(): number {
    const total = this.totalConDescuento();
    return this.usarCredito ? Math.max(0, total - this.credito()) : total;
  }

  // Valida el formulario, copia los IDs y envía el carrito. Si la base confirma, navega al comprobante con su código.
  async confirmarCompra(formulario: NgForm): Promise<void> {
    const funcion = this.funcion();
    if (!funcion || this.comprando()) return;
    this.comprobarHorario();
    if (
      formulario.invalid ||
      !this.confirmarSimulacion ||
      !this.disponibilidadLista() ||
      this.funcionComenzada() ||
      this.seleccionadas().length === 0
    ) {
      this.errorCompra.set('Revisá los datos y confirmá el pago simulado.');
      return;
    }
    this.comprando.set(true);
    this.errorCompra.set('');
    const ids = this.seleccionadas().map((butaca) => butaca.id);
    try {
      // filter descarta cantidades cero; map prepara solo ID y cantidad para enviar el carrito a Supabase.
      const productos = this.productos()
        .filter((p) => (this.cantidades[p.id] || 0) > 0)
        .map((p) => ({ id: p.id, cantidad: this.cantidades[p.id] }));
      const codigo = await this.compras.comprar(
        funcion.id,
        ids,
        this.correo,
        this.nacimiento,
        this.usarCredito,
        productos,
        this.comboId,
        this.cupon,
        this.recompensaId,
      );
      this.seleccionadas.set([]);
      await this.router.navigate(['/comprobante', codigo]);
    } catch (error) {
      this.errorCompra.set(
        error instanceof Error ? error.message : 'No pudimos completar la compra.',
      );
      await this.actualizarDisponibilidad();
    } finally {
      this.comprando.set(false);
    }
  }
}
