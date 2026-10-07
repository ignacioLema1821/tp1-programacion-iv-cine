// Conexión compartida: crea el cliente de Supabase que reutilizan los demás servicios.
import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// @Injectable permite inyectar este servicio; providedIn: root lo ofrece como una instancia compartida en toda la aplicación.
@Injectable({
  providedIn: 'root',
})
export class SupabaseService {

  // readonly impide reasignar cliente; sí permite llamar a sus métodos para consultar o autenticar.
  readonly cliente = createClient(
    environment.supabaseUrl,
    // Es la clave pública del cliente: la protección de datos depende de RLS y de los permisos de las funciones de la base.
    environment.supabaseKey,
  );
}
