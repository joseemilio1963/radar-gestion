# Radar Gestión Valencia — Supabase Persistence V1

## Objetivo

Migrar la persistencia desde SQLite demo en Vercel hacia Supabase/Postgres.

## Estado actual

La app funciona en producción, pero SQLite en Vercel serverless no debe considerarse persistencia productiva definitiva.

## Enfoque de migración

1. Crear esquema Postgres equivalente.
2. Activar RLS en todas las tablas.
3. Mantener acceso fail-closed.
4. Crear seed demo validado.
5. Implementar backend dual:
   - DATA_BACKEND=sqlite
   - DATA_BACKEND=supabase
6. Validar en Preview.
7. Promocionar a producción solo tras prueba completa.

## No hacer

- No exponer clave privada de backend en frontend.
- No dar acceso directo a tablas desde cliente.
- No desactivar RLS.
- No sustituir SQLite hasta tener rollback.
