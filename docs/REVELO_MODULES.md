# Módulos de Revelo Transporte

| Módulo                              | Estado                   | Persistencia o comportamiento                                                                                                                                 |
| ----------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registro, sesión y roles            | Existente                | JWT, perfiles y restricciones por rol                                                                                                                         |
| Cargas y ofertas                    | Existente y ampliado     | Búsqueda pública paginada por ubicación, categoría, vehículo/carrocería, presupuesto, peso y fecha; orden configurable y sección de compatibilidad explicable |
| Vehículos                           | Existente                | Propietario, capacidad, disponibilidad y ubicación autorizada                                                                                                 |
| Seguimiento                         | Implementado previamente | Mapa, ruta estimada, timeline, historial y GPS voluntario en primer plano                                                                                     |
| Ficha de viaje                      | Implementado en web      | Vista autenticada imprimible/guardar como PDF desde el navegador, identificada como informativa                                                               |
| Chat por viaje                      | Implementado en código   | Tabla `TripMessage`; acceso de participantes, máximo 2.000 caracteres y 10 envíos/minuto por participante; polling web cada 8 segundos                        |
| Incidencias                         | Implementado en código   | Reportes por participantes, bandeja ADMIN, estados/historial auditable y notificaciones; sin adjuntos                                                         |
| Calificaciones                      | Implementado en código   | Nota 1–5 y comentario una vez por parte después del viaje; promedio/conteo reales en panel del transportador                                                  |
| Notificaciones                      | Ampliado                 | Contador no leído, marcar una/todas leídas y enlaces profundos por tipo de evento                                                                             |
| Dashboards                          | Ampliados                | Estadísticas actuales por rol y métricas globales de administrador                                                                                            |
| Navegación                          | Ampliada                 | Menú móvil accesible con enlaces adaptados al rol                                                                                                             |
| Publicación de carga                | Ampliado                 | Asistente de cuatro pasos, validación progresiva, revisión previa y mapa manual confirmado antes de publicar                                                  |
| Mapa de selección de origen/destino | Existente                | Selección manual/mapa y geocodificación del flujo actual                                                                                                      |

## Aún sin módulo operativo

Verificación documental y cola de revisión; custodia privada de documentos/fotos; evidencias de recogida/entrega; política de cancelaciones; perfil público de reputación y moderación de reseñas; libro económico y pagos; exportación PDF server-side y archivo; preferencias de notificación. No se muestran como completados ni se simulan.

Los filtros de búsqueda no constituyen aún un motor de recomendación: aplican condiciones explícitas. Los indicadores de valor se etiquetan como montos acordados y no como pagos.
