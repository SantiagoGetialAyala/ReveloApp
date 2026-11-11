# UX de ubicaciones — Revelo Transporte

## Auditoría y prioridades

La aplicación usa Next.js App Router, React, Tailwind, Lucide y Leaflet. Los componentes `LocationPicker`, `PlaceFields`, `Button` y los estilos de formulario son reutilizables. NestJS ya proporciona geocodificación, catálogo DIVIPOLA y rutas OSRM.

Problemas encontrados en el flujo de publicación:

1. El centro del municipio se aceptaba como si fuera la dirección exacta.
2. Las direcciones escritas y los puntos elegidos en el mapa eran estados independientes.
3. Los clics devolvían coordenadas sin identificar el lugar ni solicitar confirmación.
4. Cada modificación reajustaba los límites del mapa y podía interrumpir el ajuste manual.
5. Búsqueda y GPS no descartaban respuestas obsoletas al cambiar de origen a destino.
6. El formulario no diferenciaba visualmente referencias, selecciones pendientes y puntos confirmados.

La prioridad de esta entrega es corregir ese flujo antes de extender el rediseño al resto de pantallas. El dashboard actual tiene información real de cargas, ofertas y viajes y refresco cada 15 segundos; su rediseño completo, así como el asistente de cuatro pasos, quedan fuera de esta entrega centrada en ubicaciones.

## Diseño implementado

- Tarjetas independientes de origen/destino, búsqueda mediante botón o Enter, resultados seleccionables y vista previa antes de confirmar.
- Selección mediante clic, marcador arrastrable, centro del mapa o GPS. Una selección pendiente no sustituye silenciosamente el punto confirmado.
- Consulta inversa para mostrar una referencia del lugar. Las coordenadas del usuario se conservan, aunque el proveedor devuelva un edificio cercano.
- Campos de dirección vinculados al mapa; las correcciones manuales se conservan. Editar una dirección confirmada exige confirmar de nuevo el punto.
- Municipio como referencia inicial, sin confirmación automática. Coincidencias del catálogo por nombre y departamento, tolerando tildes y alias de Bogotá. Sin coincidencia segura, se pide verificación manual; no se infiere el municipio más cercano.
- Estados de carga, ausencia de resultados, GPS denegado, mapas sin conexión y proveedor no disponible. La selección manual sigue disponible si falla la geocodificación; la dirección escrita sigue siendo obligatoria.
- Recorrido por carretera y distancia/duración estimadas con OSRM cuando existen ambos puntos confirmados. Sin ruta disponible, no se simula un recorrido.
- Azul para edición/origen, verde para destino y confirmación, gris para referencias. Tokens CSS de radio, transición y acento; animaciones breves con respeto a movimiento reducido.
- Formulario con accesos a sus tres secciones, foco visible, etiquetas, mensajes anunciables y distribución adaptable a móvil.

Se mantienen Leaflet, todas las entradas de publicación, las conversiones de peso, validaciones, permisos y contrato de creación de cargas. No se instalaron dependencias ni se modificó el esquema de datos. La única API nueva es `GET /api/maps/reverse?lat=…&lng=…`.

## Archivos

- `apps/web/components/location-picker.tsx`: interacción de búsqueda/mapa/confirmación, GPS, vista previa y ruta.
- `apps/web/app/publicar-carga/page.tsx`: integración de direcciones y puntos confirmados, navegación entre secciones y presentación.
- `apps/web/lib/location.ts`: conciliación segura con el catálogo DIVIPOLA.
- `apps/web/app/globals.css`: estilos y animaciones del flujo.
- `apps/api/src/maps/maps.service.ts`: consulta inversa y protección del proveedor compartida con búsqueda.
- `apps/api/src/maps/maps.controller.ts`: endpoint inverso con validación de coordenadas.
- `tests/maps.test.ts` y `package.json`: verificaciones de contratos, catálogo, caché, límite de frecuencia y errores.

## Proveedor y límites

La aplicación conserva Nominatim como proveedor de búsqueda. Consulta su [política de uso](https://operations.osmfoundation.org/policies/nominatim/) y [documentación de consulta inversa](https://nominatim.org/release-docs/latest/api/Reverse/).

No se implementó autocompletado remoto. Las consultas son explícitas, tienen tiempo máximo de ocho segundos y comparten una cola de al menos 1,1 segundos entre peticiones. La caché está acotada a 200 respuestas durante 24 horas. El proveedor se puede sustituir con `GEOCODING_BASE_URL` y su identificación con `GEOCODING_USER_AGENT`.

La cola y caché son por proceso: un despliegue con varias réplicas necesita un proveedor apto para ese volumen o un límite compartido. La instancia pública tiene un máximo de una consulta por segundo para toda la aplicación, exige identificación y atribución y prohíbe autocompletado. No enviar información confidencial a ese servicio. El mapa conserva la atribución de OpenStreetMap.

La consulta inversa describe un objeto cercano; la referencia debe ser revisada por quien publica. Si el proveedor devuelve un país diferente a Colombia, la interfaz rechaza la selección. Si no está disponible, no se puede verificar automáticamente el país o municipio: se conserva el modo manual.

## Verificación

Comandos:

```bash
npm run test:maps
npm run build --workspace apps/web
```

Las 11 pruebas de mapas usan respuestas controladas, sin base de datos ni peticiones al proveedor real. Cubren todos los municipios del catálogo, tildes, Bogotá, coincidencias ambiguas, preservación exacta del punto, país, fallos del proveedor, búsquedas restringidas, caché, límite compartido y coordenadas inválidas.

Pendiente de comprobación visual en navegador: escritorio/móvil, interacción táctil, arrastre, GPS permitido/denegado, cambios rápidos de origen/destino, reducción de movimiento y publicación completa con sesión de cliente. El navegador integrado no está disponible en esta sesión; la compilación y las pruebas de contrato no sustituyen esas comprobaciones.
