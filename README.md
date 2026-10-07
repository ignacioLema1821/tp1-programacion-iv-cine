# CineApp — TP1 Programación IV

Aplicación de cine desarrollada con Angular, Supabase y Firebase Hosting.

## Sitio publicado

https://cineapp-edb62.web.app

## Funcionalidades implementadas

- Cartelera con búsqueda, filtros, pósteres y próximos estrenos.
- Registro, inicio de sesión y roles de cliente, empleado y administrador.
- Administración de películas, salas, butacas y funciones.
- Programación de funciones con asignación automática de sala.
- Selección de butacas comunes, accesibles y VIP.
- Compra simulada con candy, combos, descuentos, puntos y canjes.
- Comprobantes PDF con QR y validación por sector.
- Perfil con compras, cancelaciones, crédito e historial.
- Reseñas, preventa y avisos dentro de la aplicación.
- Reportes con exportación a PDF y Excel.
- Configuración para instalar la aplicación como PWA.

## Organización del código

- `src/app/pages`: componentes de las pantallas, con TypeScript, HTML y CSS.
- `src/app/models`: interfaces que describen los datos.
- `src/app/services`: consultas a Supabase y operaciones compartidas.
- `src/app/guards`: control de acceso a rutas según la sesión y el rol.
- `src/app/app.routes.ts`: rutas de la aplicación.
- `public`: imágenes, íconos y manifest.

Los componentes muestran información y reciben acciones del usuario.
Los servicios consultan Supabase.
La base de datos valida permisos, disponibilidad, precios y cambios de saldo.

## Ejecución local

```bash
npm ci
npm start
```

Abrir http://localhost:4200.

La aplicación utiliza el proyecto Supabase configurado en
`src/environments/environment.ts`. La estructura y las funciones de
la base ya están configuradas en ese proyecto; los scripts SQL no
se incluyen en este repositorio.

## Compilación y pruebas

```bash
npm run build
npm test -- --watch=false
```

Se comprobó la compilación y pasaron las tres pruebas de navegación
según sesión y rol. También se revisaron los recorridos públicos
del sitio publicado.

Se comprobaron manualmente en el sitio publicado la compra simulada,
la descarga del comprobante PDF con QR, la cancelación y liberación
de butacas, el uso de crédito, la validación por separado de cine y candy
y el rechazo de códigos ya utilizados. También se probaron el escaneo
con la cámara del celular, los reportes PDF y Excel y la instalación
de la aplicación. Estas comprobaciones cubren los recorridos principales;
no representan pruebas exhaustivas de todas las combinaciones posibles.

## Decisiones de implementación

- El pago es simulado: no se cobra dinero ni se solicitan tarjetas.
- El recargo VIP se configura por sala; inicialmente es del 50 %.
- Seleccionar butacas no las reserva; la compra se confirma en la base.
- Bienvenida y cupón aplican el mayor porcentaje válido, sin sumarse.
- Las cancelaciones generan crédito para futuras compras.
- Cine y candy validan por separado el mismo código de compra.
- Los avisos de preventa aparecen dentro de la aplicación.
- Las operaciones de compra requieren conexión.

## Publicación

```bash
firebase deploy --only hosting --project cineapp-edb62
```

Subir cambios a GitHub no actualiza automáticamente el sitio publicado.