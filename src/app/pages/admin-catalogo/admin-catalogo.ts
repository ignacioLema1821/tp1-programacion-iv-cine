// Panel del catálogo: edita candy, combos, cupones, recompensas y beneficios generales.
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { CatalogoService } from '../../services/catalogo.service';
import {
  Categoria,
  Producto,
  Combo,
  Cupon,
  Recompensa,
  Configuracion,
} from '../../models/catalogo';

// @Component relaciona la clase con su HTML y CSS. selector es su etiqueta; standalone permite declarar aquí las dependencias del template.
@Component({
  selector: 'app-admin-catalogo',
  standalone: true,
  // FormsModule habilita ngModel y NgForm. imports declara componentes, directivas y pipes usados en el HTML de esta pantalla.
  imports: [FormsModule],
  templateUrl: './admin-catalogo.html',
  styleUrl: './admin-catalogo.css',
})
export class AdminCatalogo implements OnInit {
  // inject pide a Angular una dependencia disponible. private la reserva para esta clase; this accede a sus propiedades y métodos.
  private catalogo = inject(CatalogoService);
  // signal guarda estado reactivo: nombre() lee el valor y nombre.set(...) lo cambia; Angular actualiza sus usos en la pantalla.
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  cupones = signal<Cupon[]>([]);
  recompensas = signal<Recompensa[]>([]);
  error = signal('');
  exito = signal('');
  guardando = signal(false);
  config: Configuracion = { descuento_bienvenida: 20, puntos_por_peso: 1 };
  // Los objetos son valores editables por ngModel. as number | null permite empezar sin ID y luego asignar uno.
  categoria = { id: null as number | null, nombre: '' };
  producto = {
    id: null as number | null,
    nombre: '',
    categoria_id: null as number | null,
    precio: 0,
    activo: true,
  };
  combo = {
    id: null as number | null,
    nombre: '',
    precio: 0,
    pochoclo_id: null as number | null,
    bebida_id: null as number | null,
    activo: true,
  };
  cupon = { id: null as number | null, codigo: '', porcentaje: 15, edad_minima: 51, activo: true };
  recompensa = {
    id: null as number | null,
    nombre: '',
    costo_puntos: 500,
    tipo: 'entrada' as 'entrada' | 'candy',
    producto_id: null as number | null,
    activo: true,
  };

  // Angular llama a ngOnInit una vez, después de establecer los inputs iniciales. implements OnInit comprueba el contrato; no llama al método por sí mismo.
  // async devuelve una Promise; await espera la respuesta sin bloquear la página. Promise<void> indica que no devuelve un dato al terminar.
  async ngOnInit(): Promise<void> {
    await this.cargar();
  }
  // Carga las listas y la configuración que necesitan los distintos formularios del panel.
  async cargar(): Promise<void> {
    // try intenta la operación; catch permite mostrar un error. Si hay finally, se ejecuta tanto con éxito como con error.
    try {
      this.categorias.set(await this.catalogo.categorias());
      this.productos.set(await this.catalogo.productos());
      this.combos.set(await this.catalogo.combos());
      this.cupones.set(await this.catalogo.cupones());
      this.recompensas.set(await this.catalogo.recompensas());
      this.config = await this.catalogo.configuracion();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cargar el catálogo.');
    }
  }
  // ...producto copia sus propiedades; editar el formulario no cambia directamente la fila del listado.
  editarProducto(producto: Producto): void {
    this.producto = { ...producto };
  }
  // Copia el combo elegido al formulario para editarlo.
  editarCombo(combo: Combo): void {
    this.combo = { ...combo };
  }
  // Copia el cupón elegido al formulario para editarlo.
  editarCupon(cupon: Cupon): void {
    this.cupon = { ...cupon };
  }
  // Copia la recompensa elegida al formulario para editarla.
  editarRecompensa(recompensa: Recompensa): void {
    this.recompensa = { ...recompensa };
  }

  // switch elige qué formulario guardar según tipo. Los break terminan cada caso; finalmente recarga el catálogo.
  async guardar(tipo: string, formulario: NgForm): Promise<void> {
    if (this.guardando() || formulario.invalid) {
      this.error.set('Revisá los campos obligatorios y los valores.');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    this.exito.set('');
    try {
      switch (tipo) {
        case 'configuracion':
          await this.catalogo.guardarConfiguracion(this.config);
          break;
        case 'categoria':
          await this.catalogo.guardar('categorias_candy', this.categoria);
          this.categoria = { id: null, nombre: '' };
          break;
        case 'producto':
          await this.catalogo.guardar('productos_candy', this.producto);
          this.producto = { id: null, nombre: '', categoria_id: null, precio: 0, activo: true };
          break;
        case 'combo':
          await this.catalogo.guardar('combos', this.combo);
          this.combo = {
            id: null,
            nombre: '',
            precio: 0,
            pochoclo_id: null,
            bebida_id: null,
            activo: true,
          };
          break;
        case 'cupon':
          // ... copia los campos y codigo sobrescribe solamente ese valor; trim quita espacios y toUpperCase unifica mayúsculas.
          await this.catalogo.guardar('cupones', {
            ...this.cupon,
            codigo: this.cupon.codigo.trim().toUpperCase(),
          });
          this.cupon = { id: null, codigo: '', porcentaje: 15, edad_minima: 51, activo: true };
          break;
        case 'recompensa':
          if (this.recompensa.tipo === 'entrada') this.recompensa.producto_id = null;
          await this.catalogo.guardar('recompensas', this.recompensa);
          this.recompensa = {
            id: null,
            nombre: '',
            costo_puntos: 500,
            tipo: 'entrada',
            producto_id: null,
            activo: true,
          };
          break;
        default:
          throw new Error('Formulario desconocido.');
      }
      this.exito.set('Cambios guardados.');
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos guardar.');
    } finally {
      this.guardando.set(false);
    }
  }
}
