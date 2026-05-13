# Radar Gestión Valencia — Protocolo de activación controlada Dual Write Producción

**Fecha:** 2026-05-13 20:40:43
**Rama:** main
**Commit:** 9be3178 Add manager write source status endpoint
**Producción:** https://radar.aulagentia.eu

---

## 1. Objetivo

Activar de forma controlada RADAR_WRITE_SOURCE=dual_write solo para:

POST /api/portal/interest-requests

El objetivo es que una solicitud de interés se escriba simultáneamente en SQLite y Supabase.

## 2. Estado actual antes de activación

RADAR_READ_SOURCE=supabase_readonly
RADAR_WRITE_SOURCE Production=no configurado
WRITE_SOURCE efectivo=sqlite
DUAL_WRITE_ACTIVE=false
SUPABASE_WRITE_ACTIVE=false
PREFLIGHT_CURRENT_STATE_OK=True

## 3. Reglas de seguridad

No activar dual_write si:

- Git no está limpio.
- /api/manager/read-source/status no devuelve read_source=supabase_readonly.
- /api/manager/write-source/status no devuelve write_source=sqlite antes de activar.
- Supabase no está configured=true.
- No hay rollback preparado.
- No se puede validar con autenticación gestor.

## 4. Rollback inmediato

Ejecutar:

cd C:\Users\User\Desktop\radar-gestion_SYNC
npx vercel env rm RADAR_WRITE_SOURCE production --yes --scope radar-asesoria-valencia
npx vercel deploy --prod --yes --scope radar-asesoria-valencia

Validación tras rollback:

/api/manager/write-source/status => write_source=sqlite
dual_write_active=false
supabase_write_active=false
/api/manager/read-source/status => read_source=supabase_readonly

## 5. Activación controlada

Ejecutar:

cd C:\Users\User\Desktop\radar-gestion_SYNC
echo dual_write| npx vercel env add RADAR_WRITE_SOURCE production --scope radar-asesoria-valencia
npx vercel deploy --prod --yes --scope radar-asesoria-valencia

Validación inmediata:

/api/manager/write-source/status
write_source=dual_write
dual_write_active=true
supabase_write_active=false

## 6. Prueba productiva única

Hacer una sola solicitud controlada contra:

POST /api/portal/interest-requests

Condiciones:

- Usar un único cliente.
- Usar un item visible en Portal Entidad.
- Message con marcador único: PROD_DUAL_WRITE_TEST_<timestamp>.

Resultado esperado:

POST_HTTP=200
POST_STATUS=ok
POST_ACTION=created
POST_WRITE_SOURCE=dual_write
POST_SQLITE_ACTION=created
POST_SUPABASE_ACTION=created

## 7. Validación posterior

Tras crear la solicitud:

/api/manager/commercial-dashboard
interest_requests_total debe subir en Supabase.
pending_contact debe reflejar la nueva solicitud.

Consulta Supabase:

select id, client_id, package_item_id, title, request_status, message, created_at
from public.client_interest_requests
where message like 'PROD_DUAL_WRITE_TEST_%'
order by created_at desc
limit 5;

## 8. Limpieza de prueba

Si la solicitud es solo de prueba:

delete from public.client_interest_requests
where message like 'PROD_DUAL_WRITE_TEST_%'
  and request_status = 'pending_contact';

Validación:

select count(*) as remaining_rows
from public.client_interest_requests
where message like 'PROD_DUAL_WRITE_TEST_%';

Debe devolver remaining_rows=0.

Advertencia: si se elimina de Supabase, SQLite producción podría conservar la solicitud de prueba si no se limpia manualmente. Antes de prueba real, decidir si la solicitud debe mantenerse como oportunidad real o limpiarse en ambas fuentes.

## 9. Criterios de éxito

- write_source=dual_write.
- dual_write_active=true.
- POST_SQLITE_ACTION=created.
- POST_SUPABASE_ACTION=created.
- Dashboard gestor lee desde Supabase y refleja la solicitud.
- No hay errores 500.
- No se rompe Portal Entidad.

## 10. Criterios de parada

Rollback inmediato si:

- POST_SUPABASE_ACTION=error.
- POST_SQLITE_ACTION=created pero Supabase falla.
- Dashboard no refleja la solicitud.
- /api/manager/write-source/status no responde 200.
- Cualquier endpoint P0 devuelve 500.

## 11. Recomendación técnica

Antes de dejar dual_write activo durante días, decidir política de reconciliación:

- Qué fuente manda si SQLite y Supabase divergen.
- Cómo se limpian pruebas productivas.
- Cuándo migrar /api/manager/interest-requests/:id/status.
- Cuándo pasar de dual_write a supabase-only.

No pasar a RADAR_WRITE_SOURCE=supabase hasta migrar también las lecturas y actualizaciones de solicitudes de interés.

