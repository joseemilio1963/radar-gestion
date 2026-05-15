# Radar Gestión Valencia — Checkpoint Generate Write Switch V1 real producción validado

Fecha: 2026-05-15
Producción: https://radar.aulagentia.eu
Rama: main
Commit validado: c2649dcef48e2ce5898f4bb3465b35052e761820
Backup remoto previo: backup-main-before-generate-write-switch-real_20260515_151126

## 1. Objetivo

Validar en producción, sin mutaciones reales, el bloque Generate Write Switch V1 real para:

POST /api/manager/publication-packages/generate

El bloque quedó mergeado a main desde la rama publication-generate-write-switch-v1-real.

## 2. Estado de código validado

El endpoint incluye:

- Guard cliente-sector con invalid_client_sector.
- Write source scoped mediante RADAR_PUBLICATION_GENERATE_WRITE_SOURCE.
- Default seguro en sqlite.
- Fail-closed si Supabase o dual_write se activan antes de implementar escritura Supabase real.
- Contrato completo para existing_published_package_found.
- Transacción SQLite en generación real: BEGIN, COMMIT y ROLLBACK.
- DELETE preparado para client_publication_package_items por package_id.

Checks post-merge ejecutados antes del push a main:

- node --check server.js OK.
- node --check api/index.js OK.
- validate_auth_gestor_v1 OK.
- npm run build OK.

## 3. Validación producción sin login

- HOME_HTTP=200.
- GET /api/manager/publication-generate/write-source/status sin login: HTTP=401 MANAGER_AUTH_REQUIRED.

## 4. Validación producción autenticada — status

Login gestor producción:

- LOGIN_HTTP=200.
- authenticated=true.

Status generate write source:

- STATUS_HTTP=200.
- mode=publication_generate_write_source_status_v1.
- write_source=sqlite.
- env_var=RADAR_PUBLICATION_GENERATE_WRITE_SOURCE.
- dual_write_active=false.
- supabase_write_active=false.

## 5. Validación producción — caso cruzado bloqueado

Payload probado:

- client_id=clinica_dental.
- sector_key=transporte.

Resultado:

- HTTP=400.
- status=error.
- error=invalid_client_sector.
- client_sector_key=clinicas_privadas.
- sector_matches_client=false.
- write_source=sqlite.
- sqlite_action=not_attempted_invalid_client_sector.
- supabase_action=not_used.

## 6. Validación producción — caso ya publicado

Payload probado:

- client_id=clinica_dental.
- sector_key=clinicas_privadas.

Resultado:

- HTTP=200.
- status=ok.
- action=existing_published_package_found.
- write_source=sqlite.
- sqlite_action=existing_published_package_found.
- supabase_action=not_used.
- client_sector_key=clinicas_privadas.
- sector_matches_client=true.
- package_id=hsc4tgy50msbz7s3xvsmn7.
- client_id=clinica_dental.
- sector_key=clinicas_privadas.
- package_status=published.
- review_status=approved.
- client_publish_status=published.

## 7. Seguridad operativa

- No se ejecutó vercel --prod.
- No se envió generación válida nueva.
- No se creó borrador nuevo.
- No se envió confirm_publish=true.
- No hubo publicación real.
- No hubo mutaciones esperadas.
- No se imprimieron secretos.
- main quedó alineado con origin/main.

## 8. Alcance pendiente

La transacción SQLite real BEGIN/COMMIT/ROLLBACK quedó validada por código, checks y no-regresión, pero no se ejercitó con una generación nueva porque no existe actualmente candidato seguro no publicado.

## 9. Conclusión

Generate Write Switch V1 real queda validado en producción en modo seguro sqlite.

No activar RADAR_PUBLICATION_GENERATE_WRITE_SOURCE=dual_write ni supabase hasta implementar y validar escritura Supabase real para generación de paquetes.
