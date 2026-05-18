\# Radar Gestión Valencia — Checkpoint P0 Seguridad Cliente V1 validado en producción



\*\*Fecha:\*\* 2026-05-18  

\*\*Producción:\*\* https://radar.aulagentia.eu  

\*\*Estado:\*\* VALIDADO EN PRODUCCIÓN  



\## Commits validados



\- `e8eab17 Add client portal authentication V1`

\- `948644a Add client portal logout and friendly client label`



\## Resultado validado



Queda implementado y validado el acceso seguro del Portal Entidad cliente.



Validación producción confirmada:



\- Producción sirve asset `/assets/index-DebR\_2fo.js`.

\- La API del Portal Entidad sin sesión cliente devuelve `401`.

\- Código de error esperado: `CLIENT\_PORTAL\_AUTH\_REQUIRED`.

\- La URL cliente `https://radar.aulagentia.eu/?portal\_client=transportes\_levante` devuelve `200`.

\- El frontend muestra pantalla de acceso cliente con `Ya tengo clave` y `Crear clave`.

\- El cliente puede crear clave usando teléfono autorizado.

\- El cliente puede entrar al Portal Entidad.

\- El portal muestra nombre legible: `Transportes Levante`.

\- El cliente puede pulsar `Cerrar sesión`.

\- Tras cerrar sesión, vuelve a la pantalla de acceso y no entra automáticamente.



\## Implementación backend



Backend incorporado:



\- Tabla `client\_portal\_access`.

\- Sesión cliente separada de sesión gestor.

\- Hash de teléfono autorizado.

\- Hash de clave cliente con PBKDF2.

\- Endpoint cliente `POST /api/client-portal/auth/setup`.

\- Endpoint cliente `POST /api/client-portal/auth/login`.

\- Endpoint cliente `GET /api/client-portal/auth/session`.

\- Endpoint cliente `POST /api/client-portal/auth/logout`.

\- Endpoint gestor `POST /api/manager/client-portal-access/configure`.

\- Guard `CLIENT\_PORTAL\_AUTH\_REQUIRED\_GET\_GUARD\_V1`.

\- Guard `CLIENT\_PORTAL\_AUTH\_REQUIRED\_INTEREST\_POST\_V1`.



\## Implementación frontend



Frontend incorporado:



\- `ClientPortalAuthGate`.

\- `CLIENT\_PORTAL\_FRONTEND\_SESSION\_CHECK\_V1`.

\- `CLIENT\_PORTAL\_AUTH\_GATE\_RENDER\_V1`.

\- Botón `Cerrar sesión`.

\- Nombre cliente legible mediante `formatPortalClientDisplayName`.

\- El Portal Entidad exclusivo solo renderiza `PortalEntidadPanel` tras sesión cliente válida.



\## Seguridad y alcance



\- No se tocaron datos de negocio.

\- No se ejecutó `vercel --prod` manual.

\- No se ejecutó `POST /generate`.

\- No se usó `confirm\_publish=true`.

\- La mutación productiva controlada se limitó a `client\_portal\_access`.

\- No quedaron valores de prueba hardcodeados en código.



\## Estado operativo



El Portal Entidad cliente ya no queda abierto por simple `client\_id`.



Antes de entregar enlaces a clientes reales, cada asesoría deberá tener configurado el teléfono autorizado correspondiente de cada cliente.



\## Próximo bloque recomendado



Auditoría y parametrización white-label:



\- Nombre comercial de asesoría.

\- Logo.

\- Colores.

\- Textos de cabecera.

\- Configuración por asesoría sin tocar código funcional.

