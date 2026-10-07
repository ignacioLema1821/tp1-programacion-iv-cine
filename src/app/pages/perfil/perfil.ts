import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';
import { ComprasService } from '../../services/compras.service';
import { Comprobante, Saldo } from '../../models/compra';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {
  auth = inject(AuthService);
  private compras = inject(ComprasService);
  private supabase = inject(SupabaseService);
  vistas = signal<
    {
      compra_id: string;
      pelicula_id: number;
      nombre: string;
      imagen: string;
      fecha: string;
      estrellas: number | null;
    }[]
  >([]);
  canjes = signal<
    { id: number; nombre: string; puntos: number; fecha: string; anulado: boolean }[]
  >([]);
  alertas = signal<{ pelicula_id: number; nombre: string; disponible: boolean }[]>([]);
  historial = signal<Comprobante[]>([]);
  saldo = signal<Saldo>({ credito: 0, puntos: 0, bienvenida_usada: false });
  error = signal('');
  cargando = signal(false);
  cancelando = signal(false);
  aCancelar = signal<Comprobante | null>(null);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      const historial = await this.compras.historial();
      this.historial.set(historial);
      const vistas = await this.supabase.cliente.rpc('mis_peliculas');
      if (vistas.error) throw new Error(vistas.error.message);
      this.vistas.set(vistas.data);
      const alertas = await this.supabase.cliente.rpc('mis_alertas');
      if (alertas.error) throw new Error(alertas.error.message);
      this.alertas.set(alertas.data);
      const usuario = this.auth.usuario();
      if (usuario) {
        this.saldo.set(await this.compras.saldo(usuario.id));
        const canjes = await this.supabase.cliente
          .from('canjes')
          .select('id,nombre,puntos,fecha,anulado')
          .eq('usuario_id', usuario.id)
          .order('fecha', { ascending: false });
        if (canjes.error) throw new Error(canjes.error.message);
        this.canjes.set(canjes.data);
      }
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cargar tu perfil.');
    } finally {
      this.cargando.set(false);
    }
  }

  puedeCancelar(compra: Comprobante): boolean {
    return (
      compra.estado === 'pagada' &&
      !compra.cine_validado &&
      !compra.candy_validado &&
      Date.now() <= new Date(compra.inicio).getTime() - 2 * 60 * 60 * 1000
    );
  }

  async cancelar(): Promise<void> {
    const compra = this.aCancelar();
    if (!compra || this.cancelando()) return;
    this.cancelando.set(true);
    try {
      await this.compras.cancelar(compra.id);
      this.aCancelar.set(null);
      await this.cargar();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No pudimos cancelar.');
    } finally {
      this.cancelando.set(false);
    }
  }
}
