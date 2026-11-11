# Revelo Transporte

Marketplace web para conectar empresas que publican cargas con transportadores que proponen su propio precio para moverlas en Colombia.

## Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Lucide.
- Backend: NestJS, REST, JWT, Argon2, Swagger.
- Base de datos: PostgreSQL, Prisma ORM.
- Mapas: abstraccion `MapsService` con OSRM como proveedor inicial.
- Monorepo: npm workspaces en `apps/web`, `apps/api` y `packages/shared`.

## Requisitos

- Node.js 20 o superior.
- Docker, opcional pero recomendado para PostgreSQL local.

## Configuracion

```bash
cp .env.example .env
cp .env.example apps/api/.env
npm install
docker compose up -d
npm run prisma:generate --workspace apps/api
npm run db:sync
npm run db:seed
```

## Ejecucion

```bash
npm run dev --workspace apps/api
npm run dev --workspace apps/web
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/docs`

## Usuarios demo

Todos usan la contrasena `Demo12345!`.

- Cliente: `cliente.demo@revelo.co`
- Transportador: `transportador.demo@revelo.co`
- Administrador: `admin.demo@revelo.co`

## Sprint 1 Entregado

- Fundacion del monorepo.
- Prisma schema con entidades, enums, relaciones e indices del MVP.
- Backend NestJS modular con autenticacion, vehiculos, cargas, postulaciones, viajes, notificaciones, dashboards, admin y mapas.
- Frontend Next.js responsive con landing, autenticacion visual, exploracion de cargas, detalle, publicar carga, dashboard y notificaciones.

## Publicación y contratación

- Registro como empresa/persona que publica mercancía o como transportador. El transportador registra su vehículo en el mismo formulario: placa, marca, modelo, año, tipo, carrocería y capacidad en toneladas.
- Foto opcional JPG/PNG/WebP de hasta 500 KB, guardada con el vehículo. Se pueden registrar más vehículos desde `/vehiculos`.
- Inicio de sesión real y sesión restaurada al recargar. `/dashboard` muestra el panel correspondiente al rol.
- Categorías definidas. Cantidades en kilos, libras, toneladas, cajas, bultos, estibas o unidades. Para empaques se solicita el peso total; kilos, libras y toneladas se convierten a kg.
- Presupuestos y ofertas en COP con separadores de miles: `500000` se muestra como `500.000`.
- Selectores de departamento y municipio para origen y destino, usando el catálogo DIVIPOLA local de 32 departamentos más Bogotá D. C. Cambiar el departamento borra el municipio anterior. El mapa permite ajustar el punto exacto.
- Postulaciones con vehículo disponible, precio, fecha, duración y mensaje. El cliente recibe la oferta y puede aceptarla/rechazarla; el transportador puede retirarla. Las notificaciones son internas en la aplicación.
- Al aceptar, se crea un viaje visible para ambas cuentas con los datos de contacto. El transportador actualiza recogida, tránsito y entrega; el cliente confirma recepción. Se libera el vehículo al completar el viaje.
- Los paneles y las notificaciones se actualizan cada 15 segundos. El GPS requiere permiso del navegador y actualiza mientras el transportador mantenga abierto el seguimiento del viaje; no funciona en segundo plano con la página cerrada.
- En `/cargas` filtra por ruta, mercancía, tipo de camión, presupuesto, peso y fecha. El transportador puede ver cargas compatibles por tipo/carrocería/capacidad, usando solo vehículos activos y disponibles. El chat y las incidencias se consultan desde el seguimiento del viaje; el panel administrativo incluye la bandeja de incidencias.
- Chat, incidencias y calificaciones requieren aplicar el esquema Prisma actual. En local utiliza `npm run db:sync`; para una base existente con las tablas de Revelo, consulta `docs/REVELO_DEPLOYMENT.md` sobre las migraciones incrementales.
- Después de completar un viaje, empresa y transportador pueden calificarse una vez; el dashboard muestra el promedio real recibido por el transportador.
- La ficha del viaje se puede imprimir o guardar como PDF desde el navegador; se identifica como informativa y no sustituye documentos regulatorios.
- La navegación móvil abre un menú accesible con enlaces adaptados al rol.

Si usas PostgreSQL instalado localmente, ajusta `DATABASE_URL` en `.env` y `apps/api/.env` a tu usuario y base local. Docker es una alternativa para una instalación nueva; no es necesario si PostgreSQL ya escucha en el puerto 5432.

## Verificación

Con la API local activa y `apps/api/.env` configurado:

```bash
npm run test:api:e2e
npm run test:tracking
npm run test:maps
npm run build
npm run lint
npm run build --workspace apps/api
npm run build --workspace apps/web
```

La prueba E2E de API requiere PostgreSQL y API activos; crea cuentas/cargas con prefijo único y limpia los datos de prueba. Cubre roles, búsqueda, ofertas, chat, incidencias, calificaciones, GPS, notificaciones, estados y permisos.

La auditoría y el trabajo por módulo están en [REVELO_IMPLEMENTATION_PLAN.md](docs/REVELO_IMPLEMENTATION_PLAN.md), con [arquitectura](docs/REVELO_ARCHITECTURE.md), [módulos](docs/REVELO_MODULES.md), [seguridad](docs/REVELO_SECURITY.md), [despliegue](docs/REVELO_DEPLOYMENT.md), [pruebas](docs/REVELO_TESTING.md) y [decisiones pendientes](docs/REVELO_PENDING_DECISIONS.md).

## Selección de origen y destino

En `/publicar-carga`, selecciona el municipio como referencia y busca la dirección de cada punto. También puedes tocar el mapa, arrastrar los marcadores O/D o mover el mapa y pulsar **Elegir el punto del centro**. Revisa la vista previa y pulsa **Confirmar origen** o **Confirmar destino**. Ambos puntos deben estar confirmados para publicar.

El botón **Mi ubicación** solicita permiso de GPS. Si falla la búsqueda del nombre del lugar, puedes seleccionar el punto y escribir la dirección manualmente. Una vez confirmados ambos puntos se intenta calcular el recorrido por carretera.

Consulta la [auditoría, cambios y límites del proveedor](docs/ux-ubicaciones.md). Las pruebas aisladas de mapas se ejecutan con `npm run test:maps`.
