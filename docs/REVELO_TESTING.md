# Pruebas y verificación

## Comandos

```sh
npm run build
npm run test:tracking
npm run test:maps
npm run test:api:e2e
npm run lint
```

El E2E requiere PostgreSQL con esquema actualizado y API activa en `http://localhost:4000/api` (o `TEST_API_URL`). Prueba roles, vehículos, filtros/compatibilidad, propuestas, chat, incidencias, reseñas, notificaciones, viaje, GPS e historial. El test crea cuentas con prefijo único y las elimina al terminar.

## Resultado de esta iteración

- `npm run build`: compilación API y web verificada tras las mejoras y generación de Prisma Client.
- `npm exec --workspace apps/api -- prisma validate`: esquema Prisma válido.
- `npm run lint`: API y web verificados; no hay errores. Quedan avisos preexistentes de `<img>` sin optimizar en vehículos/vistas y no bloquean el build.
- `npm run test:tracking`: pasó (9 pruebas).
- `npm run test:maps`: pasó (11 pruebas).
- `npm run test:api:e2e`: ampliado para filtros, compatibilidad, mensajes, incidencias, reseñas y contador; requiere DB/API que no están activos en este entorno.
- Validación visual real en navegador: pendiente; no hay servidor web activo ni navegador de pruebas disponible.

Las pruebas existentes de mapas y seguimiento son pruebas de lógica, no sustituyen E2E de la aplicación. La cobertura de chat, incidencias y reseñas se verifica completamente al habilitar la base de datos y correr el script E2E.
