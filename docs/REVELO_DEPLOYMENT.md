# Desarrollo y despliegue

## Desarrollo local

Requisitos: Node.js 20 o superior, npm y Docker con Compose. Copiar `.env.example` a `.env`, cambiar `JWT_SECRET` fuera de desarrollo y ajustar URLs/orígenes si no se usan puertos locales.

```sh
docker compose up -d postgres
npm install
npm run db:sync
npm run db:seed
npm run dev
```

La API escucha en `http://localhost:4000/api` y Swagger en `http://localhost:4000/docs`; la web en `http://127.0.0.1:3000`. Para desarrollo, `db:sync` aplica el esquema actual, incluido `TripMessage`. No se aplicó contra la base del usuario en esta sesión.

## Variables

Las variables documentadas en `.env.example` incluyen `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `API_PORT`, `WEB_PORT`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, `OSRM_BASE_URL`, `GEOCODING_BASE_URL` y `GEOCODING_USER_AGENT`. Mantener secretos únicamente en el gestor de secretos del entorno.

## Producción

`npm run build` compila ambos workspaces. Desplegar web/API por separado según el host elegido, configurar HTTPS, CORS con orígenes exactos, base PostgreSQL con backups, límites de conexión, health checks y servicios de mapas con términos/cuotas adecuados. No usar las credenciales de ejemplo. El repositorio no tiene un pipeline de despliegue ni un proveedor de almacenamiento privado configurados.

Las migraciones incrementales de chat, incidencias y calificaciones viven en `apps/api/prisma/migrations/20261103160000_add_trip_messages`, `20261103170000_trip_incidents` y `20261103180000_trip_reviews`. Para una base existente con tablas Revelo, ejecutar `npm run db:deploy` después de revisar backup/rollback. Las migraciones crean las tablas nuevas e índices/relaciones; son idempotentes para bases ya actualizadas por `db:sync`. Para una base nueva, primero se debe crear el esquema base con el procedimiento de inicialización acordado y luego versionar una baseline completa; las migraciones incrementales por sí solas no crean todas las tablas de la aplicación. No ejecutar `migrate reset` sobre datos existentes.
