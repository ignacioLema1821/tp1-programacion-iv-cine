// Configuración de inicio: registra el router, los errores globales y el service worker de la PWA.
import { provideServiceWorker } from '@angular/service-worker';
import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  // providers registra herramientas compartidas que Angular podrá entregar mediante inject().
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Conecta el router con el mapa definido en app.routes.ts.
    provideRouter(routes),
    // El service worker permite la PWA y cachea recursos configurados; se habilita en producción, no con npm start.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Lo registra cuando la aplicación se estabiliza o cuando pasan 30 segundos, lo que ocurra primero.
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
