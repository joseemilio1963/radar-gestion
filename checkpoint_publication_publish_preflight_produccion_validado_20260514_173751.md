# Radar Gestión Valencia — Checkpoint publication publish preflight validado en producción

**Fecha:** 2026-05-14  
**Producción:** https://radar.aulagentia.eu  
**Rama:** main  
**Commit validado:** `938e0be303bfe7d45298d40cf3b2927137cb645c`  
**Commit corto:** `938e0be Add publication publish preflight endpoint`  
**Backup remoto previo:** `backup-main-before-publication-preflight_20260514_173637`  
**Backup apunta a:** `be34fb44d664408673e6e89b3e101c5afc583a50`

---

## 1. Objetivo

Documentar la validación en producción del endpoint protegido y read-only de preflight para publicación de paquetes:

`GET /api/manager/publication-packages/:id/publish/preflight`

Este endpoint permite evaluar si un paquete puede publicarse antes de enviar una orden real con `confirm_publish=true`.

---

## 2. Estado de producción validado

Producción respondió correctamente:

- Home: `200`
- Preflight sin login: `401 MANAGER_AUTH_REQUIRED`
- Login gestor: `200`
- Status scoped publicación: `200`
- `SCOPED_WRITE_SOURCE=sqlite`
- `SCOPED_DUAL_WRITE_ACTIVE=false`
- `SCOPED_SUPABASE_WRITE_ACTIVE=false`

---

## 3. Paquetes evaluados en producción

Se evaluaron los 4 paquetes existentes:

- `lmaq9r54ryf6r5bhd8xa15` — `industrias_metalurgicas_turia`
- `515j0rk3e7pkb1pfm8laa` — `inmobiliaria_turia`
- `hsc4tgy50msbz7s3xvsmn7` — `clinica_dental`
- `j5fotye7bzqmqsl67dao5k` — `transportes_levante`

Resultado común:

- `sqlite_package_found=true`
- `valid_client=true`
- `already_published=true`
- `would_publish=false`
- `write_mutation_executed=false`
- `valid_confirm_true_publish_sent=false`

Resumen:

- `PACKAGES_TESTED=4`
- `ALREADY_PUBLISHED_COUNT=4`
- `WOULD_PUBLISH_COUNT=0`
- `ERROR_COUNT=0`

---

## 4. Seguridad operativa

Durante esta validación:

- No se ejecutó `vercel --prod`.
- No se envió `confirm_publish=true`.
- No hubo mutación real.
- No se imprimieron secretos.
- Producción mantiene publicación scoped en `sqlite`.

---

## 5. Conclusión

El endpoint preflight queda disponible en producción como herramienta protegida y read-only.

No existe actualmente candidato seguro para ejecutar una publicación real en `dual_write`, porque los 4 paquetes existentes ya están publicados.

No debe activarse todavía:

`RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=dual_write`

Para una prueba real futura será necesario crear un fixture/borrador que exista tanto en SQLite como en Supabase, o usar una Supabase staging.