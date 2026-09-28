import { Routes } from '@angular/router';
import { Cartelera } from './pages/cartelera/cartelera';
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
    path: '**',
    redirectTo: 'cartelera'
  }
];