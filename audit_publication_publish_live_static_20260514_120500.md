# Auditoria tecnica - Endpoint de publicacion de paquetes

Fecha: 2026-05-14
Produccion: https://radar.aulagentia.eu
Rama: main
Commit base: 95dd406 Document validated dual write interest cycle checkpoint
Ambito: POST /api/manager/publication-packages/:id/publish
Estado: auditoria estatica y live read-only validada

## 1. Objetivo

Auditar el endpoint de publicacion antes de disenar cualquier Write Switch hacia Supabase.

Este endpoint es critico porque controla que paquetes e items quedan visibles en Portal Entidad.

## 2. Estado operativo validado

- Produccion online.
- Lectura produccion: RADAR_READ_SOURCE=supabase_readonly.
- Escritura produccion: RADAR_WRITE_SOURCE=dual_write.
- Git limpio.
- Ciclo de solicitudes ya validado.

## 3. Hallazgos estaticos

Endpoint localizado:

POST /api/manager/publication-packages/:id/publish

Tablas afectadas:

- client_publication_packages
- client_publication_package_items
- client_publication_logs

Escrituras actuales detectadas:

- UPDATE client_publication_packages
- UPDATE client_publication_package_items
- INSERT INTO client_publication_logs

Riesgos detectados:

- Endpoint actualmente SQLite-only.
- No usa RADAR_WRITE_SOURCE.
- No escribe en Supabase.
- No tiene transaccion explicita BEGIN / COMMIT / ROLLBACK.
- No exige explicitamente estado previo draft_pending_review o pending_review.
- Si exige confirm_publish=true.
- Si evita duplicados publicados.

Conclusion: no se debe migrar este endpoint a Supabase sin rediseno.

## 4. Auditoria live read-only

Resultado final validado:

AUDITORIA_LIVE_PUBLICATION_STATE_FINAL_PS_PARSER_OK=True
WRITE_MUTATION_EXECUTED=False
PRODUCTION_TOUCHED_READ_ONLY=True

Estado de paquetes:

PACKAGES_TOTAL=4
VISIBLE_PACKAGES_TOTAL=4
DETAIL_ITEMS_TOTAL=33
DETAIL_VISIBLE_ITEMS_TOTAL=33
DUPLICATE_VISIBLE_GROUPS_TOTAL=0
PORTAL_COMPARE_ALL_OK_COUNT=4
RISK_FLAGS=

Paquetes publicados visibles:

- industrias_metalurgicas_turia: lmaq9r54ryf6r5bhd8xa15, 10 items.
- inmobiliaria_turia: 515j0rk3e7pkb1pfm8laa, 7 items.
- clinica_dental: hsc4tgy50msbz7s3xvsmn7, 8 items.
- transportes_levante: j5fotye7bzqmqsl67dao5k, 8 items.

Tipos de items:

- compliance_obligation=25
- aid_item=8

## 5. Comparacion SQLite/Supabase

Comparadores de Portal Packages validados:

- transportes_levante: all_match=true
- clinica_dental: all_match=true
- inmobiliaria_turia: all_match=true
- industrias_metalurgicas_turia: all_match=true

Resultado: Portal Entidad y Supabase estan alineados para los 4 clientes.

## 6. Decision tecnica

No activar RADAR_WRITE_SOURCE=supabase todavia.
No migrar publicacion a Supabase todavia.
Mantener RADAR_WRITE_SOURCE=dual_write.

Motivo: el endpoint de publicacion afecta visibilidad real del cliente y debe redisenarse con transaccion y helpers Supabase especificos.

## 7. Siguiente paso recomendado

Disenar una rama separada para Write Switch V1 de publicacion:

supabase-write-switch-v1-publication-publish

Requisitos minimos:

1. Mantener compatibilidad sqlite.
2. Anadir soporte RADAR_WRITE_SOURCE=sqlite|dual_write|supabase.
3. Anadir transaccion SQLite para package + items + log.
4. Anadir helpers Supabase para seleccionar paquete, detectar duplicados, actualizar paquete, actualizar items e insertar log.
5. Validar primero local.
6. Validar despues Preview.
7. No tocar produccion sin protocolo especifico.