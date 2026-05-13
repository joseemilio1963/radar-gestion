# Radar Gestión Valencia — Checkpoint Write Switch V1 Portal Interest seguro

**Fecha:** 2026-05-13 19:38:47  
**Rama:** main  
**Commit:** 11487bd Add portal interest request write switch V1  
**Producción:** https://radar.aulagentia.eu  

---

## 1. Estado operativo validado

El código de **Write Switch V1** para el endpoint:

\\\	ext
POST /api/portal/interest-requests
\\\

ha sido integrado en \main\ y desplegado en producción mediante el commit:

\\\	ext
11487bd Add portal interest request write switch V1
\\\

Producción quedó validada en modo seguro:

\\\	ext
FINAL_PRODUCTION_WRITE_SWITCH_SAFE_NO_MUTATION_OK=True
WRITE_MUTATION_EXECUTED=False
PRODUCTION_WRITE_SOURCE_EFFECTIVE_DEFAULT=sqlite
\\\

---

## 2. Estado actual de producción

Producción mantiene:

\\\	ext
RADAR_READ_SOURCE=supabase_readonly
RADAR_WRITE_SOURCE=no configurado en Production
\\\

Por diseño, si \RADAR_WRITE_SOURCE\ no existe, el sistema usa:

\\\	ext
RADAR_WRITE_SOURCE=sqlite
\\\

Por tanto, producción:

- Lee desde Supabase readonly.
- Sigue escribiendo solicitudes de interés en SQLite.
- No tiene activado \dual_write\.
- No ha ejecutado mutaciones reales durante la validación post-merge.

---

## 3. Validaciones realizadas

### Local

\\\	ext
RADAR_WRITE_SOURCE=sqlite
POST /api/portal/interest-requests => 200
POST_STATUS=ok
POST_ACTION=created
POST_WRITE_SOURCE=sqlite
POST_SQLITE_ACTION=created
POST_SUPABASE_ACTION=not_used
DB_RESTORED=True
\\\

### Preview modo sqlite

\\\	ext
RADAR_READ_SOURCE=supabase_readonly
RADAR_WRITE_SOURCE=sqlite
VALIDACION_PREVIEW_READ_SUPABASE_WRITE_SQLITE_OK=True
\\\

### Preview modo dual_write

\\\	ext
RADAR_WRITE_SOURCE=dual_write
POST_WRITE_SOURCE=dual_write
POST_SQLITE_ACTION=created
POST_SUPABASE_ACTION=created
VALIDACION_PREVIEW_DUAL_WRITE_CREATED_OK=True
\\\

La solicitud de prueba creada en Supabase fue eliminada manualmente:

\\\	ext
request_id=mjlz5bkrlssym07p5nqyx
AFTER_DELETE_COUNT=0
\\\

### Producción post-merge

\\\	ext
ROOT_HTTP=200
INDEX_HTTP=200
RADAR_WRITE_SOURCE_PRODUCTION_PRESENT=False
RADAR_READ_SOURCE_PRODUCTION_PRESENT=True
CLIENTS_HTTP=200
CLIENTS_READ_SOURCE=supabase_readonly
PORTAL_CLINICA_HTTP=200
PORTAL_CLINICA_READ_SOURCE=supabase_readonly
READ_SOURCE_NO_LOGIN_HTTP=401
FINAL_PRODUCTION_WRITE_SWITCH_SAFE_NO_MUTATION_OK=True
\\\

---

## 4. Rollback inmediato

Como producción no tiene \RADAR_WRITE_SOURCE\ configurado, el rollback lógico actual ya está activo:

\\\	ext
RADAR_WRITE_SOURCE efectivo = sqlite
\\\

Si en el futuro se activa \dual_write\ o \supabase\ en Production, el rollback será:

\\\powershell
cd C:\Users\User\Desktop\radar-gestion_SYNC

npx vercel env rm RADAR_WRITE_SOURCE production --yes --scope radar-asesoria-valencia
npx vercel deploy --prod --yes --scope radar-asesoria-valencia
\\\

Validación posterior obligatoria:

\\\	ext
RADAR_WRITE_SOURCE_PRODUCTION_PRESENT=False
PRODUCTION_WRITE_SOURCE_EFFECTIVE_DEFAULT=sqlite
/api/clients/entities => read_source=supabase_readonly
/api/portal/packages?client_id=clinica_dental => read_source=supabase_readonly
/api/manager/read-source/status sin login => 401
\\\

---

## 5. Activación futura controlada de dual_write

No activar \dual_write\ en Production sin protocolo.

Cuando se decida activar:

\\\powershell
cd C:\Users\User\Desktop\radar-gestion_SYNC

echo dual_write| npx vercel env add RADAR_WRITE_SOURCE production --scope radar-asesoria-valencia
npx vercel deploy --prod --yes --scope radar-asesoria-valencia
\\\

Después se debe ejecutar una prueba real controlada con un único cliente/item y comprobar:

\\\	ext
POST_WRITE_SOURCE=dual_write
POST_SQLITE_ACTION=created
POST_SUPABASE_ACTION=created
Dashboard Supabase refleja la nueva solicitud
\\\

---

## 6. Advertencia técnica

No migrar todavía estos endpoints:

\\\	ext
POST /api/manager/interest-requests/:id/status
POST /api/manager/publication-packages/:id/publish
\\\

El endpoint de publicación es especialmente delicado porque controla:

- Revisión humana.
- Publicación visible al cliente.
- Estados \pproved/published\.
- Fail-closed del Portal Entidad.

---

## 7. Próximo bloque recomendado

Antes de activar \dual_write\ en producción, revisar si conviene:

1. Añadir endpoint gestor protegido para consultar \write_source/status\.
2. Añadir trazabilidad mínima en respuesta o logs.
3. Preparar protocolo de prueba productiva única.
4. Revisar impacto de solicitudes creadas en SQLite mientras el dashboard lee desde Supabase.

