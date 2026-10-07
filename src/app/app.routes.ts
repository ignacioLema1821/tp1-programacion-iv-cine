// Mapa de navegación: relaciona cada dirección con el componente que Angular debe mostrar.
import { AdminCatalogo } from './pages/admin-catalogo/admin-catalogo';
import { AdminSalas } from './pages/admin-salas/admin-salas';
import { Reportes } from './pages/reportes/reportes';
import { Routes } from '@angular/router';
import { Comprobante } from './pages/comprobante/comprobante';
import { Perfil } from './pages/perfil/perfil';
import { Empleado } from './pages/empleado/empleado';
import { empleadoGuard } from './guards/empleado.guard';
import { Butacas } from './pages/butacas/butacas';
import { Cartelera } from './pages/cartelera/cartelera';
import { FuncionesPelicula } from './pages/funciones-pelicula/funciones-pelicula';
import { Registro } from './pages/registro/registro';
import { Login } from './pages/login/login';
import { Admin } from './pages/admin/admin';
import { AdminFunciones } from './pages/admin-funciones/admin-funciones';
import { adminGuard } from './guards/admin.guard';

// Routes es el tipo de esta lista. Angular prueba rutas en orden; las más específicas están antes y ** queda al final.
export const routes: Routes = [
  // canActivate ejecuta el guard antes de abrir la pantalla. No reemplaza los permisos de Supabase.
  { path: 'admin/reportes', component: Reportes, canActivate: [adminGuard] },
  { path: 'admin/salas', component: AdminSalas, canActivate: [adminGuard] },
  { path: 'admin/catalogo', component: AdminCatalogo, canActivate: [adminGuard] },
  // :codigo es un parámetro variable que Comprobante lee con ActivatedRoute.
  { path: 'comprobante/:codigo', component: Comprobante },
  { path: 'perfil', component: Perfil },
  { path: 'empleado', component: Empleado, canActivate: [empleadoGuard] },
  {
    path: '',
    redirectTo: 'cartelera',
    // full exige que coincida toda la dirección: esta redirección se aplica solamente a la URL vacía.
    pathMatch: 'full',
  },
  {
    path: 'cartelera',
    component: Cartelera,
  },
  {
    path: 'cartelera/:peliculaId/funciones',
    component: FuncionesPelicula,
  },
  {
    path: 'funciones/:funcionId/butacas',
    component: Butacas,
  },
  {
    path: 'registro',
    component: Registro,
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'admin/funciones',
    component: AdminFunciones,
    canActivate: [adminGuard],
  },
  {
    path: 'admin',
    component: Admin,
    canActivate: [adminGuard],
  },
  {
    path: '**',
    redirectTo: 'cartelera',
  },
];
