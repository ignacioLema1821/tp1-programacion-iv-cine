# CineApp — Programación IV

Trabajo práctico de desarrollo de una aplicación para un cine.

Estado: en desarrollo.

## Tecnologías

- Angular con componentes standalone.
- TypeScript.
- CSS.
- Supabase como base de datos.

## Funcionalidades implementadas

- Cartelera conectada a Supabase.
- Búsqueda de películas por nombre.
- Filtro por género.
- Combinación de búsqueda y filtro.
- Mensajes de carga y manejo de errores.
- Botón para reintentar la carga.

## Arquitectura

La aplicación está organizada en:

- pages: componentes de las pantallas.
- models: interfaces que definen la estructura de los datos.
- services: acceso a los datos y conexión con Supabase.
- environments: configuración de conexión.

El componente Cartelera solicita los datos a PeliculasService.
Este servicio utiliza SupabaseService para consultar la base de datos.

## Base de datos

Se utilizan las tablas:

- peliculas
- generos
- peliculas_generos

La tabla peliculas_generos permite relacionar varias películas
con varios géneros.

Las tablas tienen RLS activado y políticas de lectura para
visitantes y usuarios autenticados.

## Decisiones técnicas

- Se utilizaron componentes standalone.
- Se separó la presentación del acceso a los datos mediante servicios.
- Se definió la interfaz Pelicula para describir los datos utilizados.
- Se usó una tabla intermedia para la relación entre películas y géneros.
- Se utilizaron signals para actualizar la pantalla al recibir los datos.
- Se incluyeron estados de carga y error en las consultas.

## Ejecución local

1. Instalar las dependencias con `npm install`.
2. Configurar la URL y la clave pública de Supabase en
   `src/environments/environment.ts`.
3. Ejecutar `npx ng serve`.
4. Abrir http://localhost:4200.

La base de datos debe tener las tablas, relaciones y permisos indicados.

## Próximos pasos

- Navegación entre pantallas.
- Registro e inicio de sesión.
- Roles y administración.
- Salas, funciones y selección de butacas.
- Compras y demás funcionalidades del enunciado.

## Publicación

Pendiente.