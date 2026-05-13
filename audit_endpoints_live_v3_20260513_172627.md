# Radar Gestión Valencia — Auditoría V3 endpoints vivos en producción

**Fecha:** 2026-05-13 17:26:51
**Producción:** https://radar.aulagentia.eu
**Rama local:** main
**Commit local:** b9a28a8 Document SQLite dependency audit V2

## Criterio

- Se prueban endpoints GET seguros contra producción.
- No se ejecutan endpoints POST, PUT, PATCH o DELETE con riesgo de mutación.
- Los endpoints de escritura quedan marcados para revisión estática y migración controlada.

## Resultado operativo esperado

- Producción debe mantenerse en RADAR_READ_SOURCE=supabase_readonly.
- Los endpoints switchados deben devolver ead_source=supabase_readonly.
- Las escrituras no se migran todavía.

## Endpoints críticos


## Escrituras no ejecutadas en auditoría

- POST /api/radar/intake — sqlite_write_or_intake — priority=P2 — reason=possible_insert
- POST /api/portal/interest-requests — sqlite_write_public — priority=P0 — reason=creates_interest_request
- POST /api/manager/interest-requests/:id/status — sqlite_write_manager — priority=P0 — reason=updates_interest_request_status
- POST /api/manager/publication-packages/generate — sqlite_write_manager — priority=P1 — reason=generates_package
- POST /api/manager/publication-packages/:id/publish — sqlite_write_manager — priority=P0 — reason=publishes_package
- PUT /api/alertas/ — sqlite_write_or_legacy — priority=P3 — reason=updates_alert
- POST /api/auth/manager/login — auth — priority=P0 — reason=auth_only_already_tested
- POST /api/auth/manager/logout — auth — priority=P0 — reason=auth_only_not_data_mutation

## Próxima decisión técnica

Antes de escribir en Supabase, revisar los endpoints P0 de escritura y diseñar un Write Switch V1 con rollback.
