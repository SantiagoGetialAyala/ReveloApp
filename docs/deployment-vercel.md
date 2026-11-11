# Despliegue en Vercel

El repositorio está configurado como dos servicios bajo un mismo dominio:

- `web`: Next.js desde `apps/web`.
- `api`: NestJS en un contenedor desde `Dockerfile.api`; `/api/*` y `/docs*` se enrutan a este servicio.
- PostgreSQL: base administrada externa conectada mediante `DATABASE_URL`.

Vercel Services está en beta. El servicio de contenedor y la base administrada pueden generar cargos según el plan y el uso. No se envían datos del PostgreSQL local; la base remota debe comenzar vacía.

## Preparar Vercel y PostgreSQL

1. Importar `SantiagoGetialAyala/ReveloApp` desde GitHub en Vercel, usando `main`.
2. Mantener la configuración de servicios del `vercel.json` de la raíz y habilitar Vercel Services.
3. Crear/conectar PostgreSQL desde una integración del Marketplace (por ejemplo Neon) y guardar `DATABASE_URL` como variable para Production y Preview.
4. Configurar estas variables en Vercel:

   - `DATABASE_URL`: URL PostgreSQL de la base remota.
   - `JWT_SECRET`: valor aleatorio largo y privado.
   - `ADMIN_EMAIL`: correo para la cuenta administradora.
   - `ADMIN_PASSWORD`: contraseña inicial de al menos 16 caracteres.
   - `ADMIN_NAME`: `Revelo Transporte`.
   - `NEXT_PUBLIC_API_URL`: `__SAME_ORIGIN__`. Se usa al compilar Next.js para que el navegador llame a `/api` en el mismo dominio.
   - `CORS_ORIGIN`: URL final de la aplicación, por ejemplo `https://revelo-app.vercel.app`.
   - `OSRM_BASE_URL`: `https://router.project-osrm.org`.
   - `GEOCODING_BASE_URL`: `https://nominatim.openstreetmap.org`.
   - `GEOCODING_USER_AGENT`: `revelo-transporte-platform/0.1`.

   No definir `API_PORT`: Vercel proporciona `PORT` al contenedor.

5. Desplegar una vez para obtener la URL y confirmar que la web responde.

## Inicializar la base remota vacía

Una vez configuradas `DATABASE_URL`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` en Vercel, desde una terminal autenticada con Vercel y en la raíz del repositorio:

```sh
npx vercel env run -e production -- npm run db:deploy
npx vercel env run -e production -- npm run db:seed --workspace=@revelo/api
```

Los comandos usan las variables de producción de Vercel sin escribirlas en un archivo local. El seed crea/actualiza el administrador indicado por `ADMIN_EMAIL` y `ADMIN_NAME`, con la contraseña definida en `ADMIN_PASSWORD`. No utiliza los datos de la base local.

Las futuras migraciones se aplican con `npm run db:deploy` usando la URL remota. No ejecutar `db:reset-local`, `db:sync` ni comandos de reset contra producción.

## Migración inicial

`20261101000000_initial_schema` describe el esquema completo actual para una base nueva. Las migraciones posteriores son aditivas e idempotentes; no duplican objetos ya incluidos en el esquema inicial.

La migración inicial es solo para una base vacía. No ejecutarla contra una base que ya tenga tablas. Para una base existente se requiere preparar y revisar un procedimiento de baseline; este despliegue no migra automáticamente los datos locales.
