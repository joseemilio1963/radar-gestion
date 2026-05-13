# Radar Gestión Valencia — Auditoría SQLite dependencies V2

Fecha: 2026-05-13 17:18:17
Rama: main
Commit: a8d0be7 Document production Supabase readonly checkpoint

## Resumen endpoints

- Routes found: 49
- Switch-aware: 5
- SQLite direct: 22
- Mixed SQLite/Supabase: 5
- Write-like: 28

## Endpoints detectados

- UNKNOWN /api/manager/auth/login — line 2074 — NO_DB_MARKERS — write=False — protected=True
- UNKNOWN /api/manager/auth/session — line 2075 — NO_DB_MARKERS — write=False — protected=True
- UNKNOWN /api/manager/auth/logout — line 2076 — NO_DB_MARKERS — write=False — protected=True
- UNKNOWN /api/manager — line 2085 — NO_DB_MARKERS — write=False — protected=False
- UNKNOWN /api/manager/ — line 2086 — NO_DB_MARKERS — write=False — protected=False
- UNKNOWN /api/radar — line 2087 — NO_DB_MARKERS — write=False — protected=False
- UNKNOWN /api/radar/ — line 2088 — NO_DB_MARKERS — write=False — protected=False
- UNKNOWN /api/aids — line 2089 — NO_DB_MARKERS — write=False — protected=False
- UNKNOWN /api/aids/ — line 2090 — NO_DB_MARKERS — write=False — protected=False
- UNKNOWN /api/compliance — line 2091 — NO_DB_MARKERS — write=False — protected=False
- UNKNOWN /api/compliance/ — line 2092 — NO_DB_MARKERS — write=True — protected=True
- UNKNOWN /api/auth/manager/login — line 2114 — NO_DB_MARKERS — write=True — protected=True
- UNKNOWN /api/auth/manager/session — line 2162 — NO_DB_MARKERS — write=False — protected=True
- UNKNOWN /api/auth/manager/logout — line 2177 — NO_DB_MARKERS — write=True — protected=True
- UNKNOWN /api/auth/manager/ — line 2205 — NO_DB_MARKERS — write=False — protected=True
- GET /api/radar/items — line 2219 — SQLITE_DIRECT — write=True — protected=False
- GET /api/radar/items/:id — line 2260 — SQLITE_DIRECT — write=True — protected=False
- GET /api/radar/items/:id/export/(mrk|txt|preview) — line 2295 — SQLITE_DIRECT — write=True — protected=False
- UNKNOWN /api/radar/intake — line 2336 — SQLITE_DIRECT — write=True — protected=False
- UNKNOWN /api/portal/interest-requests — line 2542 — SQLITE_DIRECT — write=True — protected=False
- POST /api/manager/interest-requests/:id/status — line 2652 — NO_DB_MARKERS — write=True — protected=False
- UNKNOWN /api/manager/interest-requests/ — line 2653 — MIXED_SQLITE_SUPABASE — write=True — protected=False
- GET /api/manager/supabase-read-services/clients/compare — line 2744 — MIXED_SQLITE_SUPABASE — write=False — protected=False
- GET /api/manager/supabase-read-services/portal-packages/compare — line 2789 — MIXED_SQLITE_SUPABASE — write=False — protected=False
- GET /api/manager/supabase-read-services/commercial-dashboard/compare — line 2875 — SWITCH_AWARE — write=True — protected=False
- GET /api/manager/read-source/status — line 2947 — SWITCH_AWARE — write=False — protected=False
- GET /api/manager/supabase-readonly/status — line 2955 — MIXED_SQLITE_SUPABASE — write=False — protected=False
- GET /api/manager/supabase-readonly/counts — line 2965 — SUPABASE_DIRECT — write=False — protected=False
- GET /api/manager/supabase-readonly/compare-counts — line 2983 — MIXED_SQLITE_SUPABASE — write=False — protected=False
- GET /api/manager/commercial-dashboard — line 3021 — SWITCH_AWARE — write=True — protected=False
- GET /api/manager/interest-requests/summary — line 3292 — SQLITE_DIRECT — write=True — protected=False
- GET /api/manager/interest-requests — line 3388 — SQLITE_DIRECT — write=True — protected=False
- GET /api/clients/entities — line 3430 — SWITCH_AWARE — write=False — protected=False
- GET /api/compliance/sectors — line 3468 — SQLITE_DIRECT — write=False — protected=False
- GET /api/compliance/obligations — line 3485 — SQLITE_DIRECT — write=True — protected=False
- GET /api/compliance/obligations/:id — line 3527 — SQLITE_DIRECT — write=True — protected=False
- GET /api/aids/items — line 3557 — SQLITE_DIRECT — write=True — protected=False
- GET /api/aids/items/:id — line 3599 — SQLITE_DIRECT — write=True — protected=False
- GET /api/manager/publication-package-items — line 3630 — SQLITE_DIRECT — write=False — protected=False
- GET /api/manager/publication-packages — line 3684 — SQLITE_DIRECT — write=True — protected=False
- POST /api/manager/publication-packages/generate — line 3725 — SQLITE_DIRECT — write=True — protected=False
- GET /api/manager/publication-packages/:id — line 3881 — SQLITE_DIRECT — write=True — protected=False
- POST /api/manager/publication-packages/:id/publish — line 3909 — SQLITE_DIRECT — write=True — protected=False
- GET /api/portal/summary — line 3995 — SQLITE_DIRECT — write=True — protected=False
- GET /api/portal/packages — line 4031 — SWITCH_AWARE — write=True — protected=False
- GET /api/portal/compliance/obligations — line 4094 — SQLITE_DIRECT — write=True — protected=False
- GET /api/portal/aids/items — line 4110 — SQLITE_DIRECT — write=True — protected=False
- PUT /api/alertas/ — line 4127 — SQLITE_DIRECT — write=True — protected=False
- GET /api/asesorias — line 4153 — SQLITE_DIRECT — write=True — protected=False

## Funciones SQLite/Mixtas candidatas a revisión

- getSqliteReferenceCounts — line 134 — MIXED_SQLITE_SUPABASE — write=False
- seedComplianceSectorsIfEmpty — line 343 — SQLITE_DIRECT — write=True
- getClientCatalog — line 635 — MIXED_SQLITE_SUPABASE — write=False
- compareReadServicesClients — line 775 — MIXED_SQLITE_SUPABASE — write=False
- getSqliteReadServicesPortalPackages — line 905 — SQLITE_DIRECT — write=True
- compareReadServicesPortalPackages — line 991 — MIXED_SQLITE_SUPABASE — write=True
- getSqliteReadServicesCommercialDashboard — line 1377 — SQLITE_DIRECT — write=True

## Nota

Auditoría automática por patrones adaptada a req.url routing. Requiere revisión manual antes de migrar escrituras o eliminar SQLite.
