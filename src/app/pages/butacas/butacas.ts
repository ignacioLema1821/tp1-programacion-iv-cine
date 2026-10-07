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

@Component({
  selector: 'app-butacas',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule],
  templateUrl: './butacas.html',
  styleUrl: './butacas.css',
})
export class Butacas implements OnDestroy {
  private ruta = inject(ActivatedRoute);
  private butacasService = inject(ButacasService);

  auth = inject(AuthService);
  private compras = inject(ComprasService);
  private catalogo = inject(CatalogoService);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  cupones = signal<Cupon[]>([]);
  recompensas = signal<Recompensa[]>([]);
  puntos = signal(0);
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

  // computed recalcula el total cuando cambia la selección o la función.
  total = computed(() => {
    let centavos = 0;

    for (const butaca of this.seleccionadas()) {
      centavos += this.precioEnCentavos(butaca);
    }

    return centavos / 100;
  });

  // Si la pantalla queda abierta, comprobamos si ya comenzó la función.
  private reloj = setInterval(() => this.comprobarHorario(), 1000);

  constructor() {
    // Leemos el ID de la función desde la dirección.
    // Dejamos de escuchar los cambios cuando se destruye el componente.
    this.ruta.paramMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      this.funcionId = Number(parametros.get('funcionId'));
      void this.cargarDatos();
    });
  }

  // Al salir, detenemos el reloj e invalidamos las consultas pendientes.
  ngOnDestroy(): void {
    clearInterval(this.reloj);
    this.dejarDeEscuchar?.();
    if (this.refresco) clearInterval(this.refresco);
    this.consultaDisponibilidad++;
    this.numeroCarga++;
  }

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

    try {
      const funcion = await this.butacasService.obtenerFuncion(id);

      // Ignoramos la respuesta si el usuario ya cambió de función.
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
      // También reconsultamos para recuperarnos de una desconexión de Realtime.
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

  // Transformamos la lista de la base en filas con tres bloques.
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

  estaSeleccionada(butaca: Butaca): boolean {
    return this.seleccionadas().some((elegida) => elegida.id === butaca.id);
  }

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
      // Conservamos todas excepto la que volvieron a tocar.
      this.seleccionadas.set(this.seleccionadas().filter((elegida) => elegida.id !== butaca.id));
    } else {
      // Copiamos las seleccionadas y agregamos la nueva butaca.
      const nuevas = [...this.seleccionadas(), butaca];
      this.seleccionadas.set(nuevas);
    }
  }

  limpiarSeleccion(): void {
    if (this.comprando()) return;
    this.seleccionadas.set([]);
  }

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

  // Redondeamos cada entrada a centavos antes de sumar los importes.
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

  precioButaca(butaca: Butaca): number {
    return this.precioEnCentavos(butaca) / 100;
  }

  nombreTipo(butaca: Butaca): string {
    if (butaca.tipo === 'vip') {
      return 'VIP';
    }

    if (butaca.tipo === 'accesible') {
      return 'Accesible';
    }

    return 'Común';
  }

  // La letra permite reconocer el tipo sin depender solo del color.
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

  mostrarPrecio(precio: number): string {
    return precio.toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
    });
  }

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

  totalConDescuento(): number {
    let subtotal = this.total();
    for (const producto of this.productos())
      subtotal += producto.precio * (this.cantidades[producto.id] || 0);
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

  pagoEstimado(): number {
    const total = this.totalConDescuento();
    return this.usarCredito ? Math.max(0, total - this.credito()) : total;
  }

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
    // Copiamos los IDs antes de enviar: Realtime puede cambiar la selección.
    const ids = this.seleccionadas().map((butaca) => butaca.id);
    try {
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
