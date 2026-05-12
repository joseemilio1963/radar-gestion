# Radar Gestión Valencia — Checkpoint producción Supabase Backend Read-Only V1

Fecha de validación: 2026-05-12
Producción: https://radar.aulagentia.eu
Commit validado: c7a7992 Restore protected API paths after auth route fix
Estado: VALIDADO EN PRODUCCIÓN

Supabase Backend Read-Only V1 queda activo en producción, protegido por login gestor y funcionando en modo paralelo/read-only.

Validación confirmada:
- Home producción: HTTP 200
- Sesión sin login: authenticated:false
- Supabase read-only sin login: 401 MANAGER_AUTH_REQUIRED
- Login gestor: HTTP 200
- Sesión tras login: authenticated:true
- Supabase status autenticado: HTTP 200
- Supabase counts: HTTP 200
- Supabase compare-counts: HTTP 200
- Logout: authenticated:false

Variables Vercel Production configuradas:
- SUPABASE_READONLY_ENABLED
- SUPABASE_URL
- SUPABASE_SERVER_KEY

Estado Supabase validado:
- enabled=true
- configured=true
- url_present=true
- key_present=true
- key_is_server_side_only=true

Conteos Supabase validados:
- user_clients: 4
- compliance_obligations: 84
- aid_items: 3
- radar_items: 1
- client_publication_packages: 4
- client_publication_package_items: 33
- client_interest_requests: 8
- radar_documents: 1
- radar_review_logs: 1

Comparación SQLite /tmp/database.sqlite vs Supabase:
- Todas las comparaciones devolvieron match=true.

Rutas reales de autenticación gestor:
- /api/auth/manager/login
- /api/auth/manager/session
- /api/auth/manager/logout

Estado final:
- Frontend/API producción OK
- Auth gestor OK
- Supabase Backend Read-Only V1 OK
- Producción sigue usando SQLite para endpoints actuales
- Supabase todavía no sustituye SQLite como fuente operativa

Próximo bloque recomendado:
Supabase Backend Read Services V2: crear capa de lectura real desde Supabase con SQLite como fallback y comparar endpoint por endpoint antes de activar escrituras.
