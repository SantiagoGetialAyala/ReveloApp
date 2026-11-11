# Seguridad y privacidad

## Controles implementados

- Endpoints protegidos mediante JWT y guards de rol donde corresponde.
- Acceso al seguimiento e historial del viaje restringido a sus participantes (o administrador para lectura del viaje).
- Chat restringido al cliente/transportador asociado; las cuentas no participantes no pueden leer ni enviar.
- Mensajes validados y limitados a 2.000 caracteres, con límite de 10 mensajes por minuto por usuario y viaje.
- Incidencias visibles solo a participantes; la bandeja y las actualizaciones están protegidas por rol ADMIN y guardan historial de acciones.
- Reseñas limitadas a participantes tras un viaje completado; el servidor deriva el destinatario y la base impide duplicados por autor/viaje.
- Actualización de notificación limitada al dueño; el contador y `read-all` también consultan únicamente la cuenta autenticada.
- GPS oculto para viajes cerrados y nunca extrapolado; envío de ubicación iniciado por el transportador desde su navegador.
- Validación global de DTO con `whitelist`, rechazo de campos extra y transformación habilitada.
- Helmet y CORS configurable por entorno.

## Datos sensibles y trabajo pendiente

El esquema actual conserva documentos de identificación de perfil y fotografías de vehículo como URLs/datos de aplicación. Aún no existe almacenamiento privado ni proceso de revisión documental, por lo que no se debe reutilizar ese mecanismo para cédulas, licencias, SOAT o evidencias sensibles. Faltan política de retención, auditoría de lectura de archivos, análisis antimalware y controles de solicitud automatizada para toda la API.

El GPS del navegador requiere permiso y página abierta; debe explicarse en el producto antes de activar el seguimiento. Definir base legal, consentimiento, finalidades, retención y ejercicio de derechos bajo la normativa colombiana con asesoría jurídica antes de un lanzamiento comercial.

No guardar secretos en el repositorio. Configurar `JWT_SECRET` fuerte, TLS, credenciales de base separadas y backups cifrados fuera del entorno local.
