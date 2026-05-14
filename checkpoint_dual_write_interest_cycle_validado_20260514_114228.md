# Checkpoint técnico — Ciclo dual_write de solicitudes validado en producción

**Fecha:** 2026-05-14
**Producción:** https://radar.aulagentia.eu
**Repositorio local:** `C:\Users\User\Desktop\radar-gestion_SYNC`
**Rama principal:** `main`
**Commit validado:** `1f9f98f Add manager interest status write switch V1`
**Estado:** CICLO DE SOLICITUDES VALIDADO EN PRODUCCIÓN CON LECTURA SUPABASE Y ESCRITURA `dual_write`

---

## 1. Resumen ejecutivo

Se ha validado en producción el ciclo crítico de solicitudes comerciales de Radar Gestión Valencia:

``text
Portal Entidad crea solicitud
→ POST /api/portal/interest-requests
→ dual_write SQLite + Supabase

Gestor actualiza estado
→ POST /api/manager/interest-requests/:id/status
→ Supabase actualizado correctamente
→ Dashboard comercial refleja el cambio
``

Estado validado:

- Lectura producción: `supabase_readonly`
- Escritura producción: `dual_write`
- Producción online.
- Git limpio.

---

## 2. Endpoints críticos validados

Quedan validados en producción:

- `POST /api/portal/interest-requests`
- `POST /api/manager/interest-requests/:id/status`
- `GET /api/manager/commercial-dashboard`
- `GET /api/manager/read-source/status`
- `GET /api/manager/write-source/status`

---

## 3. Creación de solicitud desde Portal Entidad

Endpoint:

``text
POST /api/portal/interest-requests
``

Candidato usado en prueba productiva:

- `client_id=clinica_dental`
- `package_item_id=3xeprp25kkfght7spu8j38`
- `title=Kit Digital`
- `source_type=aid_item`
- `request_type=TRAMITACION_AYUDA_SUBVENCION`

Marcador:

``text
PROD_DUAL_WRITE_TEST_20260514_104933
``

Resultado:

- `POST_HTTP=200`
- `POST_STATUS=ok`
- `POST_ACTION=created`
- `POST_WRITE_SOURCE=dual_write`
- `POST_SQLITE_ACTION=created`
- `POST_SUPABASE_ACTION=created`
- `POST_REQUEST_ID=by4jrxqpkpkcidrf51w61p`
- `POST_REQUEST_STATUS=pending_contact`

Dashboard tras creación:

- `interest_requests_total=9`
- `pending_contact=1`
- `handled=8`

---

## 4. Actualización de estado por gestor

Endpoint:

``text
POST /api/manager/interest-requests/:id/status
``

Commit funcional:

``text
1f9f98f Add manager interest status write switch V1
``

Diseño implementado:

- `sqlite`: SQLite obligatorio.
- `dual_write`: Supabase como referencia principal y SQLite solo si existe fila local.
- `supabase`: Supabase obligatorio.

Decisión técnica clave:

En Vercel Serverless, SQLite puede ser efímero tras redeploy. Por eso, en `dual_write`, Supabase se usa como referencia principal.

Comportamiento validado:

- `POST_SQLITE_ACTION=not_found_skipped`
- `POST_SUPABASE_ACTION=updated`

---

## 5. Mutación real controlada

Solicitud actualizada:

- `request_id=by4jrxqpkpkcidrf51w61p`
- `target_status=handled`

Marcador:

``text
PROD_DUAL_WRITE_STATUS_TEST_20260514_113359
``

Prueba segura previa con ID falso:

- `PROBE_HTTP=404`
- `PROBE_ERROR_CODE=SUPABASE_INTEREST_REQUEST_NOT_FOUND`
- `PROBE_WRITE_SOURCE=dual_write`
- `PROBE_SUPABASE_ACTION=select_failed`
- `SAFE_CODE_PROBE_OK=True`

Mutación real:

- `POST_HTTP=200`
- `POST_STATUS=ok`
- `POST_ACTION=interest_request_status_updated`
- `POST_WRITE_SOURCE=dual_write`
- `POST_SQLITE_ACTION=not_found_skipped`
- `POST_SUPABASE_ACTION=updated`
- `POST_REQUEST_STATUS=handled`

Resultado final:

``text
PRODUCTION_MANAGER_INTEREST_STATUS_DUAL_WRITE_REAL_UPDATE_OK=True
``

---

## 6. Dashboard final validado

Antes:

- `interest_requests_total=9`
- `pending_contact=1`
- `handled=8`

Después:

- `interest_requests_total=9`
- `pending_contact=0`
- `handled=9`

Delta:

- `DASHBOARD_DELTA_INTEREST_REQUESTS_TOTAL=0`
- `DASHBOARD_DELTA_PENDING_CONTACT=-1`
- `DASHBOARD_DELTA_HANDLED=1`

Interpretación:

- La solicitud de prueba quedó cerrada como `handled`.
- Supabase fue actualizado correctamente.
- El dashboard comercial reflejó el cambio leyendo desde Supabase.
- SQLite local fue saltado correctamente al no existir la fila tras redeploy.

---

## 7. Estado operativo final

Estado actual:

- Producción online.
- `RADAR_READ_SOURCE=supabase_readonly`
- `RADAR_WRITE_SOURCE=dual_write`
- Creación de solicitudes validada.
- Gestión de estado de solicitudes validada.
- Dashboard Supabase validado.
- Solicitud de prueba cerrada como `handled`.
- No quedan solicitudes de prueba pendientes.

---

## 8. Decisión técnica

Se mantiene:

``text
RADAR_READ_SOURCE=supabase_readonly
RADAR_WRITE_SOURCE=dual_write
``

No se recomienda pasar todavía a:

``text
RADAR_WRITE_SOURCE=supabase
``

Motivo:

Aunque el ciclo de solicitudes está validado, todavía quedan endpoints de escritura y publicación pendientes de auditoría.

---

## 9. Siguiente paso recomendado

Auditar el endpoint:

``text
POST /api/manager/publication-packages/:id/publish
``

Este endpoint debe tratarse con máxima cautela porque controla la publicación visible en Portal Entidad.

Orden recomendado:

1. Mantener `dual_write` activo.
2. No pasar todavía a modo `supabase`.
3. Auditar estáticamente el endpoint de publicación.
4. Diseñar Write Switch específico para publicación.
5. Validar primero local.
6. Validar después en Preview.
7. Solo entonces valorar producción.

---

## 10. Rollback disponible

Rollback de escritura a SQLite:

``powershell
cd C:\Users\User\Desktop\radar-gestion_SYNC
npx vercel env rm RADAR_WRITE_SOURCE production --yes --scope radar-asesoria-valencia
npx vercel deploy --prod --yes --scope radar-asesoria-valencia
``
