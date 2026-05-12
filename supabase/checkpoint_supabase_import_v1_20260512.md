# Radar Gestión Valencia — Checkpoint Supabase Persistence V1

Fecha: 2026-05-12
Rama: supabase-persistence-v1
Estado: SUPABASE SCHEMA + RLS + SEED DEMO + VALIDACIÓN POST-IMPORTACIÓN COMPLETADOS
Producción: no modificada. Producción sigue usando SQLite hasta cambio explícito de backend/env.

## 1. Objetivo

Migrar la estructura demo validada de Radar Gestión Valencia a Supabase como primera capa de persistencia productiva, sin activar todavía la app contra Supabase.

Este bloque valida:

- Schema Supabase V1.
- RLS fail-closed V1.
- Seed demo saneado.
- Datos importados sin mojibake.
- Coherencia de conteos frente al estado SQLite demo validado.

## 2. SQL ejecutado en Supabase

Ejecutados correctamente en Supabase SQL Editor:

1. supabase/migrations/001_radar_schema_v1.sql
2. supabase/migrations/002_radar_rls_v1.sql
3. supabase/seeds/001_seed_demo_v1.sql
4. Validación post-importación unificada.

Resultado del seed:

Success. No rows returned

## 3. Validación post-importación

La validación unificada devolvió 16 checks con ok = true:

| Check | Actual | Expected | OK |
|---|---:|---:|---|
| user_clients | 4 | 4 | true |
| compliance_obligations | 84 | 84 | true |
| aid_items | 3 | 3 | true |
| radar_items | 1 | 1 | true |
| client_publication_packages | 4 | 4 | true |
| client_publication_package_items | 33 | 33 | true |
| client_interest_requests | 8 | 8 | true |
| radar_documents | 1 | 1 | true |
| radar_review_logs | 1 | 1 | true |
| published_packages_safe | 4 | 4 | true |
| published_items_safe | 33 | 33 | true |
| handled_requests | 8 | 8 | true |
| pending_requests | 0 | 0 | true |
| mojibake_user_clients | 0 | 0 | true |
| mojibake_compliance_titles | 0 | 0 | true |
| mojibake_package_items | 0 | 0 | true |

## 4. Validación de encoding

Se validó que no hay mojibake en:

- user_clients
- compliance_obligations
- client_publication_package_items

Acentos verificados visualmente en Supabase:

- Clínica Dental Sonrisas
- Industrias Metalúrgicas Turia
- Prevención de riesgos laborales
- Gestión
- formación
- nº

## 5. Estado operativo

Supabase V1 queda preparado como base demo importada y validada.

La aplicación en producción todavía no usa Supabase.
La producción actual sigue usando SQLite/Vercel runtime hasta que se implemente y valide un cambio explícito de backend/env.

## 6. Siguiente paso recomendado

Crear bloque separado: Supabase Backend Read-Only V1.

Objetivo:

- Añadir cliente Supabase server-side.
- Configurar variables de entorno sin subir secretos.
- Crear endpoints espejo read-only.
- Comparar respuestas SQLite vs Supabase.
- No modificar todavía endpoints productivos.
- No activar escrituras contra Supabase hasta validación posterior.
