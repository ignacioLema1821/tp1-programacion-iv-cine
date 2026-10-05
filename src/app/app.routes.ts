import { Routes } from '@angular/router';
import { Butacas } from './pages/butacas/butacas';
import { Cartelera } from './pages/cartelera/cartelera';
import { FuncionesPelicula } from './pages/funciones-pelicula/funciones-pelicula';
import { Registro } from './pages/registro/registro';
import { Login } from './pages/login/login';
import { Admin } from './pages/admin/admin';
import { AdminFunciones } from './pages/admin-funciones/admin-funciones';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'cartelera',
    pathMatch: 'full'
  },
  {
    path: 'cartelera',
    component: Cartelera
  },
  {
    // peliculaId identifica de qué película queremos ver los horarios.
    path: 'cartelera/:peliculaId/funciones',
    component: FuncionesPelicula
  },
  {
    // funcionId identifica el horario y la sala para elegir butacas.
    path: 'funciones/:funcionId/butacas',
    component: Butacas
  },
  {
    path: 'registro',
    component: Registro
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'admin/funciones',
    component: AdminFunciones,
    canActivate: [adminGuard]
  },
  {
    path: 'admin',
    component: Admin,
    canActivate: [adminGuard]
  },
  {
    // Si ninguna ruta coincide, volvemos a la cartelera.
    path: '**',
    redirectTo: 'cartelera'
  }
];