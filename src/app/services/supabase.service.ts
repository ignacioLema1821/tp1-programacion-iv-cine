import { Injectable } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root', // comparte el servicio en toda la aplicacion
})
export class SupabaseService {
  //readonly evita reemplazar sin querer la propiedad cliente

  readonly cliente = createClient(
    //createclient recibe la url y la clave
    environment.supabaseUrl,
    environment.supabaseKey,
  );
}
