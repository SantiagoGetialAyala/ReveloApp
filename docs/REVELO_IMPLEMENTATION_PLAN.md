# Revelo Transporte: auditoría y plan técnico

**Actualización:** 3 de noviembre de 2026  
**Enfoque entregado:** seguimiento de viajes, búsqueda avanzada, chat persistente, notificaciones y paneles con datos reales.

## Stack confirmado

- Monorepo npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS 3, Lucide y Leaflet.
- Backend: NestJS 10, REST, JWT, validación con `class-validator` y Prisma 5.
- Datos: PostgreSQL.
- Mapas: Leaflet/OpenStreetMap; ruta vial con OSRM; coordenadas de vehículos y mapas de cargas almacenadas en la base de datos.
- Los estados del viaje y sus notas ya se persisten en `TripStatusHistory`. La ubicación tiene una única fecha y punto actual en `Vehicle`.
- No hay dependencias de pruebas E2E de navegador, almacenamiento privado de archivos ni pasarela de pagos configurados. El chat se resolvió con persistencia local y polling.
- El chat se implementó en esta iteración sobre PostgreSQL/Prisma con polling REST; no requiere un proveedor de tiempo real.

## Funciones existentes comprobadas en el código

Autenticación y roles; perfiles básicos; catálogo DIVIPOLA; vehículos con fotos y GPS; creación de cargas y coordenadas exactas; propuestas y reglas de capacidad/disponibilidad; creación transaccional de viaje al aceptar; aceptación, rechazo y retiro; contactos según recursos; cambios de estado permitidos; historial de estados; notificaciones internas; mapa y ruta estimada; paneles básicos de empresa y transportador; polling de paneles cada 15 segundos. Los recursos más relevantes son `apps/api/src/proposals/proposals.service.ts`, `apps/api/src/trips/trips.service.ts`, `apps/api/src/maps/maps.service.ts`, `apps/api/prisma/schema.prisma` y `apps/web/app/dashboard/page.tsx`.

## Riesgos y prioridades

1. **Seguimiento y privacidad GPS:** la coordenada del vehículo se reemplaza al usarlo en otros viajes. Hay que vincular cualquier punto a un viaje activo y mostrar su hora; una coordenada guardada no prueba que haya GPS conectado. Los viajes cerrados no deben compartir la nueva posición del vehículo.
2. **Verificación, documentos y fotos:** no existe un almacenamiento privado configurado ni una política operativa de acceso, retención, formatos o revisión. No se deben usar fotos/documentos públicos como sustituto de evidencias privadas.
3. **Incidencias y cancelaciones:** requieren definir responsables, estados, retención, confirmaciones y reglas comerciales. No se inventaron sanciones ni reembolsos.
4. **Calificaciones y estadísticas:** calcular únicamente a partir de viajes concluidos y no confundir precio acordado con dinero pagado.
5. **Pagos, cancelaciones y regulación:** faltan acuerdos de negocio, reglas para liberar recursos y revisión legal. No crear una pasarela, una penalización, un reembolso ni una integración RNDC por inferencia.
6. **Rendimiento y acceso:** no hay un ejecutor de Playwright activo ni un PostgreSQL/API local disponibles en esta sesión. Las compilaciones y pruebas de lógica no sustituyen una prueba completa con las dos cuentas participantes.
7. **Cobertura:** el paquete React Bits/MCP de shadcn no estaba conectado ni registrado en el proyecto. El seguimiento usa CSS ligero y movimiento reducido; no instala una biblioteca de animación nueva.

## Implementación terminada: seguimiento del viaje

- La empresa abre el mapa desde **Viajes acordados** y el transportador desde la postulación aceptada. Aceptar una oferta navega directamente al viaje creado.
- Ruta visual con origen y destino persistidos en la carga y geometría/estimación de OSRM, si está disponible. El mapa presenta el último GPS guardado, la hora y la antigüedad. El botón de seguimiento centra el mapa en la ubicación recibida.
- Línea de tiempo según los estados y los eventos realmente guardados: confirmado, recogida, en camino, entregado/en revisión y recepción confirmada. La nota de cada actualización queda en el historial existente.
- El transportador comparte ubicación desde el teléfono con permiso explícito. Las lecturas se envían como máximo cada 30 segundos; la pantalla consulta cada 15. No se extrapola la posición. Se informa cuándo han pasado más de 2 minutos.
- Se conserva el proceso existente: el transportador confirma recogida, inicio del tránsito y entrega; la empresa revisa y confirma la recepción.
- La ubicación se liga en la interfaz a `createdAt` del viaje; una coordenada anterior no se presenta como seguimiento del viaje. Al cerrar o cancelar, el backend oculta las coordenadas y la fecha del GPS en consultas de viajes y la interfaz detiene el seguimiento.
- El historial ahora comprueba que la cuenta sea parte del viaje (o administradora); la consulta de un vehículo por UUID se limita a su dueño o al administrador y las tarjetas de ofertas no devuelven coordenadas GPS. Se preservan la transacción de aceptación, la máquina de estados, la liberación del vehículo y las notificaciones actuales.
- Diseño responsive con color por estado, pasos reales, indicador de GPS reciente/antiguo, controles accesibles y movimiento reducido. La ruta, el mapa y el estado siguen visibles si falla OSRM, GPS o una consulta.

## Archivos del seguimiento

- `apps/web/app/viajes/[id]/page.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/components/trip-map.tsx`
- `apps/web/components/trip-timeline.tsx`
- `apps/web/hooks/use-vehicle-gps.ts`
- `apps/web/lib/tracking.ts`
- `apps/web/lib/models.ts`
- `apps/web/app/globals.css`
- `apps/api/src/trips/trips.service.ts`
- `apps/api/src/trips/trips.controller.ts`
- `apps/api/test/marketplace.e2e.cjs`
- `tests/tracking.test.ts`

## Implementación añadida: operación y experiencia

- La búsqueda pública de cargas tiene filtros de departamento/municipio de origen y destino, categoría, tipo de vehículo, carrocería, presupuesto máximo, rango de peso y fechas; admite orden y paginación con límites validados en el servidor.
- La sección de compatibilidad exige rol transportador, considera vehículos activos/disponibles y filtra por tipo, carrocería, peso/capacidad. Explica esos criterios y no aplica puntajes opacos; evita cargas con oferta pendiente propia.
- El panel de administración recibe conteos reales de usuarios, transportadores pendientes, vehículos activos, cargas, ofertas y viajes. Aclara que todavía no existe bandeja para revisar documentos.
- Empresa y transportador ven conteos derivados de sus recursos; el valor de viajes se etiqueta como **acordado**, nunca como pago.
- Las notificaciones incluyen contador no leído, marcar una/todas leídas y enlace al recurso relacionado por tipo de evento.
- El chat guarda mensajes de hasta 2.000 caracteres, limita el acceso a las dos partes del viaje, aplica un máximo de 10 envíos por minuto y notifica al destinatario. El navegador consulta cada 8 segundos cuando la vista está activa.
- Los participantes pueden registrar incidencias tipificadas; el panel ADMIN permite cambiar entre abierta, en revisión, esperando información, resuelta y cerrada. Cada evento persiste actor, fecha y nota, y notifica a ambas partes. El formulario no acepta adjuntos.
- Al completar el viaje, cada participante puede calificar una vez a la contraparte (1–5 y comentario opcional). La base impide duplicados; el panel del transportador calcula el promedio solo con reseñas reales.
- El detalle del viaje tiene acción de imprimir/guardar como PDF con hoja de estilos de impresión y aviso explícito de que la ficha no reemplaza documentos regulatorios.
- La publicación de carga guía en cuatro pasos: mercancía, ruta, condiciones y revisión; valida cada paso, conserva el envío original y exige confirmar los puntos del mapa.
- La navegación móvil expone un menú accesible adaptado al rol y respeta movimiento reducido en su transición.
- Prisma añade `TripMessage`, `TripIncident`, `IncidentHistory`, `TripReview` y sus índices. Se generó el cliente y se crearon migraciones incrementales; la base no se actualizó porque PostgreSQL no responde. El repositorio no tenía baseline de migraciones al iniciar, así que las migraciones nuevas presuponen que existen las tablas base y documentan el procedimiento de producción.
- No se agregaron dependencias npm para estas mejoras.

Archivos: `apps/api/src/cargos/{dto.ts,cargos.service.ts}`, `apps/api/src/admin/admin.service.ts`, `apps/api/src/notifications/`, `apps/api/src/trips/`, `apps/api/prisma/schema.prisma` y migrations, `apps/web/app/{cargas,dashboard,notificaciones,admin/incidencias}/`, `apps/web/components/{notification-indicator,trip-chat,trip-incidents,trip-reviews}.tsx` y `apps/api/test/marketplace.e2e.cjs`.

## Migraciones, dependencias y configuración

El seguimiento reutiliza `Trip`, `TripStatusHistory`, `Vehicle`, coordenadas de `Cargo` y sus fechas. El chat agrega `TripMessage` y una migración incremental. Sigue requiriendo PostgreSQL y las variables existentes de `.env`, al igual que el resto de la aplicación. Para ver mapas y ruta se necesita una conexión a servicios de mosaicos y OSRM. El navegador debe permitir GPS al transportador.

## Verificación

- `npm run test:tracking`: reglas de estado, acción permitida por rol, cancelación, validación de coordenadas, momento, antigüedad y cierre de GPS.
- `npm run build --workspace apps/api` y `npm run build --workspace apps/web`: compilación y tipos.
- `npm run test:api:e2e`: diseñado para comprobar oferta, aceptación, GPS, roles, historial y cierre con PostgreSQL y API activos. Si no hay respuesta de la base de datos/API, no se afirma que pasó.
- Pendiente: navegador en móvil/escritorio, permisos GPS, visualización de una sesión empresa y otra de transportador, y cambios de estado integrados contra PostgreSQL.

## Trabajo pendiente del prompt maestro

No están implementados: verificación documental y auditoría de revisión; almacenamiento privado de documentos/evidencias; adjuntos de evidencias; cancelación con reglas aprobadas; perfil público/reporte/moderación de reseñas; registro económico separado de pagos; conciliación/pasarela; PDF de archivo/server-side; preferencias de notificaciones; auditoría integral WCAG, seguridad y rendimiento.

Chat y filtros necesitan aplicar el esquema y validación E2E en PostgreSQL; el E2E se amplió, pero el servidor y la base no están activos. No hay navegador automatizado configurado. La integración de React Bits requiere MCP/registro disponible; se mantienen animaciones CSS y respeto a movimiento reducido. Documentos privados, pagos, retención, cancelación y RNDC requieren política comercial y revisión legal. El estado por módulo y las limitaciones están en `docs/REVELO_MODULES.md` y `docs/REVELO_PENDING_DECISIONS.md`.
