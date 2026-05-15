# Radar Gestión Valencia — Checkpoint Generate Write Switch V1 real Preview validado

Fecha: 2026-05-15
Rama: publication-generate-write-switch-v1-real
Commit validado: 3b6abbe25c60e3ca5aa1b94459472a1936809651
Preview: https://radar-gestion-elg6kbvbl-radar-asesoria-valencia.vercel.app

## 1. Objetivo

Validar en Preview el comportamiento seguro del endpoint:

POST /api/manager/publication-packages/generate

dentro del bloque Generate Write Switch V1 real.

## 2. Estado validado

Login gestor Preview:

- LOGIN_HTTP=200
- authenticated=true

Write source scoped de generate:

- write_source=sqlite
- dual_write_active=false
- supabase_write_active=false

## 3. Caso cruzado bloqueado

Payload probado:

- client_id=clinica_dental
- sector_key=transporte

Resultado:

- HTTP=400
- status=error
- error=invalid_client_sector
- client_sector_key=clinicas_privadas
- sector_matches_client=false
- write_source=sqlite
- sqlite_action=not_attempted_invalid_client_sector
- supabase_action=not_used

## 4. Caso existente ya publicado

Payload probado:

- client_id=clinica_dental
- sector_key=clinicas_privadas

Resultado:

- HTTP=200
- status=ok
- action=existing_published_package_found
- write_source=sqlite
- sqlite_action=existing_published_package_found
- supabase_action=not_used
- client_sector_key=clinicas_privadas
- sector_matches_client=true
- package_id=hsc4tgy50msbz7s3xvsmn7
- package_status=published
- review_status=approved
- client_publish_status=published

## 5. Seguridad operativa

- Producción no tocada.
- No se ejecutó vercel --prod.
- No se envió generación válida que cree borrador nuevo.
- No se envió confirm_publish=true.
- No hubo mutaciones esperadas.
- No se imprimieron secretos.

## 6. Conclusión

El guard fail-closed y el contrato de respuesta existing_published_package_found quedan validados en Preview.

El checkpoint parcial anterior queda superado por este checkpoint validado.

Siguiente decisión posible:

- Merge controlado a main con validación producción sin mutaciones.
- O mantener rama en espera si se quiere añadir transacción SQLite antes del merge.
