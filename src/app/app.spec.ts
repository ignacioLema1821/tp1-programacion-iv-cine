// Pruebas de navegación: comprueban los enlaces visibles para una visita, un cliente y un administrador.
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { AuthService } from './services/auth.service';
import { CatalogoService } from './services/catalogo.service';

// describe agrupa pruebas; cada it describe un caso y expect comprueba el resultado esperado.
describe('Navegación según la sesión y el rol', () => {
  // Este objeto reemplaza AuthService con datos de prueba: no inicia sesiones ni consulta una cuenta real.
  const auth = {
    usuario: signal<User | null>(null),
    rol: signal<'cliente' | 'empleado' | 'admin' | null>(null),
    cargandoSesion: signal(false),
    cargandoRol: signal(false),
    errorRol: signal(''),
    cerrarSesion: async () => {},
  };
  const usuario: User = {
    id: 'usuario-prueba',
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    email: 'prueba@example.com',
    app_metadata: {},
    user_metadata: {},
  };
  // Prepara un entorno nuevo antes de cada prueba para que un caso no herede la sesión del anterior.
  beforeEach(async () => {
    auth.usuario.set(null);
    auth.rol.set(null);
    // TestBed crea el componente en un entorno de prueba. useValue inyecta estos reemplazos de los servicios.
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CatalogoService, useValue: { alertas: async () => [] } },
      ],
    }).compileComponents();
  });
  it('ofrece registro y login a una visita sin cuenta', () => {
    const fixture = TestBed.createComponent(App);
    // Renderiza el HTML antes de revisar los enlaces. Estas pruebas cubren navegación visible, no una compra completa.
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(texto).toContain('Registrarse');
    expect(texto).toContain('Iniciar sesión');
    expect(texto).not.toContain('Salas y usuarios');
  });
  it('no ofrece administración a un cliente', () => {
    auth.usuario.set(usuario);
    auth.rol.set('cliente');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(texto).toContain('Mi perfil');
    expect(texto).not.toContain('Salas y usuarios');
    expect(texto).not.toContain('Reportes');
  });
  it('ofrece administración y validación al administrador', () => {
    auth.usuario.set(usuario);
    auth.rol.set('admin');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(texto).toContain('Salas y usuarios');
    expect(texto).toContain('Reportes');
    expect(texto).toContain('Validar entradas');
  });
});
