# CineApp - Programación IV

Aplicación para un cine desarrollada con Angular y Supabase.

Versión de avance para la corrección del 5 de octubre de 2026. El proyecto está en desarrollo.

- Repositorio: https://github.com/ignacioLema1821/tp1-programacion-iv-cine
- Sitio publicado: [CineApp](https://cineapp-edb62.web.app)

## Tecnologías

- Angular 22 con componentes standalone y Angular Router.
- TypeScript y CSS.
- Formularios basados en plantillas con FormsModule y ngModel.
- Signals para el estado de las pantallas y computed para el total de la selección.
- Supabase Auth para autenticación y PostgreSQL para datos y reglas de negocio.
- Firebase Hosting: configuración preparada para publicar la compilación de Angular.

## Funcionalidades actuales

- Cartelera conectada a Supabase con búsqueda por nombre y filtro por género.
- Registro con los datos personales solicitados en la consigna.
- Inicio y cierre de sesión; actualización del menú según usuario y rol.
- Perfil con rol cliente, empleado o admin. Las pantallas administrativas requieren admin.
- Administración de películas: creación y edición de nombre, duración, sinopsis y géneros.
- Programación individual de funciones con formato, idioma, horario y precio base.
- Asignación automática de sala con control de superposición y 30 minutos de limpieza.
- Confirmación para eliminar funciones futuras.
- Consulta pública de funciones futuras por película.
- Plano de butacas por sala: comunes, accesibles y VIP.
- Selección y deselección con resumen y total estimado; VIP con recargo del 50 % guardado en la sala.
- Estados de carga, mensajes de error y opciones para reintentar.

La selección de butacas es local y se pierde al salir o recargar. Todavía no registra una compra,
reserva lugares ni refleja ocupación en tiempo real. El rol empleado está previsto en el modelo;
su pantalla de validación de entradas queda pendiente.

## Arquitectura

```text
src/
  app/
    app.ts / app.html / app.css      Componente raíz y navegación
    app.config.ts                   Proveedores de la aplicación
    app.routes.ts                   Rutas y protección administrativa
    guards/                         Verificación de acceso a rutas
    models/                         Interfaces de datos
    services/                       Autenticación, consultas y llamadas RPC
    pages/
      cartelera/                    Películas y filtros
      registro/                     Alta de usuarios
      login/                        Inicio de sesión
      admin/                        Creación y edición de películas
      admin-funciones/               Programación y eliminación de funciones
      funciones-pelicula/            Horarios futuros de una película
      butacas/                      Plano y selección local
  environments/                     URL y clave pública de Supabase
sql/                                Scripts SQL guardados en el repositorio
docs/                               Guía de defensa y publicación
```

Las pantallas solicitan datos a servicios. Los servicios comparten un cliente mediante
SupabaseService. Los modelos describen los datos usados en TypeScript.

Ejemplo: el enlace Elegir butacas incluye el ID de la función. Butacas lee ese ID con
ActivatedRoute, consulta la función y luego las butacas de su sala mediante ButacasService.
Agrupa las butacas por fila y bloque. Un signal mantiene la selección y computed calcula su total.

## Datos y reglas en Supabase

| Tabla | Propósito |
| --- | --- |
| peliculas | Nombre, duración y sinopsis |
| generos | Catálogo de géneros |
| peliculas_generos | Relación de muchos a muchos entre películas y géneros |
| perfiles | Rol asociado al ID de un usuario de Supabase Auth |
| salas | Salas activas y porcentaje de recargo VIP |
| funciones | Película, sala, inicio, fin, fin de ocupación, formato, idioma y precio |
| butacas | Lugares físicos de cada sala: fila, número, bloque y tipo |

Supabase Auth administra las cuentas y contraseñas. Los datos personales del registro se envían
como metadatos del usuario. El rol se obtiene de perfiles, no de esos metadatos.

La base configura permisos y RLS: lectura pública de la cartelera y del plano, consulta del
perfil propio y operaciones administrativas restringidas. El guard administra la navegación;
los permisos y funciones de PostgreSQL protegen las operaciones sobre los datos.

Se utilizan las funciones SQL guardar_pelicula, programar_funcion y eliminar_funcion mediante
RPC. La programación calcula la duración y el margen de limpieza, busca una sala libre y
serializa las operaciones de programación con un bloqueo de tabla. Las escrituras directas
de funciones desde el cliente no están habilitadas.

La modificación de duración de una película con funciones pendientes o en curso se rechaza
mediante un trigger. La eliminación de funciones se limita a horarios que todavía no comenzaron.

### Plano de sala

Se interpreta el cambio del enunciado como una única fila accesible que reemplaza a J y K:
18 filas de 28 lugares y una fila de 14, total 518 por sala. J representa esa fila accesible
y K no se genera. Las filas R, S y T contienen 84 lugares VIP; quedan 420 comunes y 14 accesibles.
Esta interpretación de J/K se consultará con el profesor por la ambigüedad de la redacción.

El recargo VIP del 50 % es una decisión del proyecto: la consigna exige un precio mayor,
pero no establece un porcentaje. Los importes del resumen se redondean a centavos por entrada.

### Scripts conservados

sql/06-butacas.sql contiene la creación de las butacas y el recargo VIP. Ya se ejecutó en
el proyecto Supabase actual; no debe repetirse íntegramente sobre esa misma base.
Falta incorporar los scripts anteriores para poder reconstruir toda la base desde cero.

## Decisiones técnicas

- Cada componente standalone declara las herramientas que utiliza.
- Se separan la presentación y el acceso a los datos mediante servicios.
- Se usan interfaces para describir datos y detectar errores de tipos al compilar.
- Los filtros de cartelera trabajan sobre las películas cargadas; los horarios se filtran en Supabase.
- Las operaciones incluyen estados de carga y manejo de errores con try/catch/finally.
- Las rutas incluyen IDs para consultar una película o función al abrir una dirección directamente.
- Los contadores de consulta evitan que una respuesta anterior reemplace una selección más reciente.
- La sala se asigna en PostgreSQL, donde se puede controlar la concurrencia de las escrituras.
- La selección de butacas todavía es local; la validación final de precio y disponibilidad
  se agregará en la transacción de compra.
- Los horarios de funciones se muestran con UTC-3 y se envían en formato ISO.

## Ejecución local

1. Instalar una versión de Node.js compatible con Angular 22 y las dependencias con npm install.
2. Configurar src/environments/environment.ts con la URL y una clave pública de Supabase.
   No utilizar claves secretas ni service_role en Angular.
3. Tener disponible la base Supabase con las tablas, funciones y permisos indicados.
4. Ejecutar npm start y abrir http://localhost:4200.

## Compilación y hosting

npm run build genera la compilación de producción. Firebase publica dist/cine-app/browser.
firebase.json incluye una reescritura a index.html para que las rutas de Angular funcionen
al entrar directamente o actualizar una pantalla. El predeploy vuelve a ejecutar la compilación.

Después de instalar Firebase CLI, iniciar sesión y seleccionar el proyecto:

```bash
firebase deploy --only hosting
```

La autenticación y la base permanecen en Supabase. Después de publicar debe configurarse
la URL pública en Authentication > URL Configuration para las redirecciones de correo.

## Verificación del avance

Se probaron manualmente registro, login/logout, roles, películas, programación de funciones,
consulta de horarios y selección de butacas con cálculo de recargo VIP.

Durante la preparación del plano se verificaron TypeScript, plantillas y lógica de selección
con datos de prueba. Eso no sustituye las pruebas de integración con la base.

app.spec.ts conserva las pruebas iniciales generadas por Angular y necesita actualizarse.
No se presenta esa suite como una verificación completa de la aplicación actual.

## Pendientes principales

- Compra con pago simulado sujeto a confirmación del profesor, control de venta duplicada y ocupación en tiempo real.
- Entradas PDF con QR y validación por empleados.
- Imágenes, restricciones de edad, destacadas, más vendidas y reseñas.
- Programación recurrente y administración completa de salas y distribución.
- Candy, combos, cupones, puntos y canjes.
- Próximos estrenos, preventa, alertas e historial de películas.
- Cancelaciones y crédito en cuenta.
- Reportes, exportaciones y log de actividad.
- PWA y documentación completa de requisitos y SQL.


