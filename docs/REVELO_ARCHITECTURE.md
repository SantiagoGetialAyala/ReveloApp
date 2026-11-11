# Arquitectura de Revelo Transporte

## Estado actual

Revelo es un monorepo npm con una aplicación web Next.js 15/React 19 y una API NestJS 10. La API usa Prisma 5 y PostgreSQL; la web consume REST mediante `NEXT_PUBLIC_API_URL`. `packages/shared` concentra tipos compartidos. La autenticación usa JWT y la autorización combina rol y propiedad/participación en el recurso.

```text
apps/web (Next.js App Router)
  ├── páginas por rol y operación
  ├── componentes y hooks (mapa, GPS, chat)
  └── REST → apps/api (/api)
       ├── módulos NestJS: auth, cargos, propuestas, viajes, vehículos,
       │   notificaciones, perfiles, administración y mapas
       └── Prisma → PostgreSQL
```

Los viajes se crean dentro de una transacción al aceptar una propuesta. Los cambios de estado tienen una máquina de transiciones y guardan historial. La ubicación procede del vehículo y solo se comparte mientras el participante transportador abre el seguimiento y concede permiso al navegador. La ruta estimada depende de OSRM y los mapas de OpenStreetMap.

## Persistencia y evolución

El esquema canónico está en `apps/api/prisma/schema.prisma`. El repositorio no tenía historial de migraciones Prisma al iniciar esta iteración y su flujo de desarrollo usa `prisma db push` (`npm run db:sync`). Se añadió una migración incremental e idempotente para `TripMessage`, relacionada con viaje y remitente, con índices por viaje/fecha y remitente/lectura. No se aplicó a una base local porque PostgreSQL no estaba disponible. La migración incremental presupone que ya existen las tablas base; antes de una base nueva de producción hay que aplicar el esquema base y revisar el respaldo/rollback.

## Decisiones técnicas

- Los listados de cargas son consultas REST paginadas; filtros y orden son validados en servidor.
- El dashboard usa conteos y entidades reales; no infiere dinero recibido ni reseñas.
- El chat de viaje usa consulta periódica cada 8 segundos mientras la vista está visible. No requiere WebSocket ni proveedor externo.
- Los participantes reportan incidencias vinculadas al viaje; administración cambia su estado y cada cambio guarda actor, fecha y nota en el historial.
- Las reseñas se asocian a viaje/autor; una restricción única impide duplicados y el promedio se calcula desde reseñas persistidas.
- La ficha se imprime desde el navegador; no genera ni almacena un documento legal en el servidor.
- Los mensajes y notificaciones se guardan en una transacción; el acceso exige ser cliente o transportador participante.
- El seguimiento usa consulta cada 15 segundos y el navegador puede enviar una posición cada 30 segundos. No hay GPS de fondo.

## Límites

No hay infraestructura configurada para almacenamiento privado, pasarela de pagos, correo/push, observabilidad externa ni operación RNDC. No se deben desplegar esos módulos como si existieran.
