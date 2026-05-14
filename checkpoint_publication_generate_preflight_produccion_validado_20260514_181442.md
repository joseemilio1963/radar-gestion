# Radar Gestión Valencia — Checkpoint publication generate preflight validado en producción

Fecha: 2026-05-14
Producción: https://radar.aulagentia.eu
Commit validado: 14cf7e4c217c9447684f37da10319deff2fa24ba
Commit corto: 14cf7e4 Guard publication generate preflight by client sector
Backup remoto previo: backup-main-before-publication-generate-preflight_20260514_181337

## 1. Objetivo

Documentar la validación en producción del endpoint protegido y read-only:

GET /api/manager/publication-packages/generate/preflight

Este endpoint permite comprobar si una generación de paquete sería segura antes de ejecutar POST /generate.

## 2. Estado validado

- Endpoint sin login: 401 MANAGER_AUTH_REQUIRED.
- Login gestor: 200.
- Generate write source status: 200.
- GENERATE_WRITE_SOURCE=sqlite.
- GENERATE_ENV_VAR=RADAR_PUBLICATION_GENERATE_WRITE_SOURCE.
- GENERATE_DUAL_WRITE_ACTIVE=false.
- GENERATE_SUPABASE_WRITE_ACTIVE=false.

## 3. Guard cliente-sector

Caso válido:

- client_id=clinica_dental
- sector_key=clinicas_privadas
- client_sector_key=clinicas_privadas
- sector_matches_client=true
- sqlite_existing_published_found=true
- would_generate=false

Caso cruzado bloqueado:

- client_id=clinica_dental
- sector_key=transporte
- client_sector_key=clinicas_privadas
- sector_matches_client=false
- sqlite_existing_published_found=false
- would_generate=false

## 4. Seguridad operativa

- vercel --prod ejecutado: NO.
- generate real enviado: NO.
- confirm_publish=true enviado: NO.
- write_mutation_executed=false.
- secretos impresos: NO.

## 5. Conclusión

El preflight de generate queda validado en producción como herramienta protegida y read-only.

El sistema ya evita combinaciones cliente-sector incorrectas antes de cualquier futura generación real.

No activar RADAR_PUBLICATION_GENERATE_WRITE_SOURCE=dual_write hasta implementar y validar escritura sincronizada SQLite/Supabase.
