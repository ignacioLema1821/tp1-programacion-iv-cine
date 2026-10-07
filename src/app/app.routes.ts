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

export const routes: Routes = [
  { path: 'admin/reportes', component: Reportes, canActivate: [adminGuard] },
  { path: 'admin/salas', component: AdminSalas, canActivate: [adminGuard] },
  { path: 'admin/catalogo', component: AdminCatalogo, canActivate: [adminGuard] },
  { path: 'comprobante/:codigo', component: Comprobante },
  { path: 'perfil', component: Perfil },
  { path: 'empleado', component: Empleado, canActivate: [empleadoGuard] },
  {
    path: '',
    redirectTo: 'cartelera',
    pathMatch: 'full',
  },
  {
    path: 'cartelera',
    component: Cartelera,
  },
  {
    // peliculaId identifica de qué película queremos ver los horarios.
    path: 'cartelera/:peliculaId/funciones',
    component: FuncionesPelicula,
  },
  {
    // funcionId identifica el horario y la sala para elegir butacas.
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
    // Si ninguna ruta coincide, volvemos a la cartelera.
    path: '**',
    redirectTo: 'cartelera',
  },
];
