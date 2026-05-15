# Radar Gestión Valencia — Checkpoint Generate Write Switch V1 real Preview parcial

Fecha: 2026-05-15
Rama: publication-generate-write-switch-v1-real
Commit validado en Preview: d0d07e07c0b3451680a4121d8f39715464f82c49
Preview: https://radar-gestion-9w87ym0xk-radar-asesoria-valencia.vercel.app

## 1. Objetivo del bloque

Preparar el endpoint POST /api/manager/publication-packages/generate para Write Switch V1 real, manteniendo comportamiento seguro por defecto en sqlite.

## 2. Cambios implementados en rama

- Se añadió marcador write_switch_v1_publication_generate_real_sqlite_safe.
- El endpoint usa getRadarPublicationGenerateWriteSource().
- Se añadieron clientSectorKey y sectorMatchesClient.
- Se bloquean combinaciones cliente-sector incorrectas con invalid_client_sector.
- Si shouldUseSupabase está activo, el endpoint falla cerrado con 501 publication_generate_supabase_write_not_implemented.
- No se añadieron todavía escrituras Supabase reales.
- No se añadió todavía transacción SQLite completa en este bloque.

## 3. Validación Preview ejecutada

Login gestor Preview:

- LOGIN_HTTP=200.
- authenticated=true.

Estado write source generate:

- write_source=sqlite.
- env_var=RADAR_PUBLICATION_GENERATE_WRITE_SOURCE.
- dual_write_active=false.
- supabase_write_active=false.

Caso cruzado bloqueado:

- client_id=clinica_dental.
- sector_key=transporte.
- client_sector_key=clinicas_privadas.
- HTTP=400.
- error=invalid_client_sector.
- sector_matches_client=false.
- write_source=sqlite.
- sqlite_action=not_attempted_invalid_client_sector.
- supabase_action=not_used.

Caso existente ya publicado:

- client_id=clinica_dental.
- sector_key=clinicas_privadas.
- HTTP=200.
- action=existing_published_package_found.
- package_id=hsc4tgy50msbz7s3xvsmn7.
- package_status=published.
- review_status=approved.
- client_publish_status=published.

## 4. Hallazgo pendiente

La respuesta existing_published_package_found sigue sin devolver de forma explícita:

- write_source.
- sqlite_action.
- supabase_action.

No es un fallo de seguridad porque no crea borradores nuevos ni ejecuta publicación, pero debe pulirse antes de considerar el bloque listo para merge a main.

## 5. Seguridad operativa

- Producción no tocada.
- No se ejecutó vercel --prod.
- No se envió generación real válida.
- No se envió confirm_publish=true.
- No hubo mutaciones esperadas.
- No se imprimieron secretos.

## 6. Conclusión

El guard crítico fail-closed de Generate Write Switch V1 real quedó validado en Preview.

No mergear todavía esta rama a main hasta decidir una de estas dos opciones:

1. Pulir el contrato de respuesta existing_published_package_found.
2. Aceptar explícitamente el defecto menor documentado.

Recomendación técnica: pulir contrato con edición manual controlada o Codex, no insistir con bloques largos de PowerShell.
