# Documento maestro - Radar Gestion Valencia

**Ultima actualizacion:** 2026-05-14
**Produccion:** https://radar.aulagentia.eu
**Rama principal:** main
**Commit operativo actual:** 77f87214617815c24571cb149fd3435f11df3e9a
**Commit corto:** 77f8721 Scope publication publish write source

---

## 1. Estado operativo actual

Radar Gestion Valencia esta operando como aplicacion web en Vercel, con dominio productivo en https://radar.aulagentia.eu.

Estado tecnico validado:

- Lectura productiva: RADAR_READ_SOURCE=supabase_readonly.
- Escritura global de solicitudes: RADAR_WRITE_SOURCE=dual_write.
- Publicacion de paquetes: RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=sqlite por defecto.
- Backend operativo con endpoints protegidos para gestor.
- Portal Entidad activo con paquetes publicados aprobados.
- Supabase actua como fuente de lectura para endpoints switchados.
- SQLite sigue siendo fuente segura para publicacion hasta nueva validacion especifica.

---

## 2. Bloques productivos validados

### 2.1 Auth Gestor V1

Validado en produccion el control de acceso gestor mediante PIN y sesion.

Checkpoint asociado:

- checkpoint_produccion_auth_gestor_v1_20260510.md

### 2.2 Supabase Read Switch V1

Produccion lee desde Supabase readonly en endpoints principales switchados.

Endpoints principales:

- GET /api/clients/entities
- GET /api/portal/packages?client_id=...
- GET /api/manager/commercial-dashboard
- GET /api/manager/read-source/status

Checkpoint asociado:

- checkpoint_produccion_supabase_readonly_20260513_171229.md

### 2.3 Ciclo dual_write de solicitudes

Validado en produccion el ciclo de solicitudes desde Portal Entidad y gestion por gestor.

Endpoints validados:

- POST /api/portal/interest-requests
- POST /api/manager/interest-requests/:id/status

Estado final de la solicitud de prueba productiva:

- REQUEST_ID=by4jrxqpkpkcidrf51w61p
- Estado final=handled

Dashboard tras validacion:

- interest_requests_total=9
- pending_contact=0
- handled=9

Checkpoint asociado:

- checkpoint_dual_write_interest_cycle_validado_20260514_114228.md

### 2.4 Publicacion de paquetes scoped

Se audito y migro de forma controlada el endpoint de publicacion:

- POST /api/manager/publication-packages/:id/publish

Riesgo detectado:

- Produccion tenia RADAR_WRITE_SOURCE=dual_write global.
- Si publicacion heredaba ese flag, podia entrar en dual_write sin validacion especifica.

Correccion aplicada:

- Flag scoped: RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=sqlite|dual_write|supabase.
- Default seguro: sqlite.
- Endpoint protegido de estado: GET /api/manager/publication-publish/write-source/status.

Estado validado en produccion:

- SCOPED_WRITE_SOURCE=sqlite.
- SCOPED_ENV_VAR=RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE.
- SCOPED_PRODUCTION_SAFE_DEFAULT=True.
- SCOPED_DUAL_WRITE_ACTIVE=False.
- SCOPED_SUPABASE_WRITE_ACTIVE=False.

Guards validados en produccion:

- Sin login -> 401.
- Payload vacio -> 400 invalid_payload.
- confirm_publish=false -> 400 invalid_payload.

No se envio confirm_publish=true valido.
No hubo mutacion real de publicacion.
No se ejecuto vercel --prod.

Backup remoto previo al merge:

- backup-main-before-publication-publish-scoped_20260514_165719
- Apunta a d4343ff1968d3d1620ae31d880c9179fabb80610

Auditoria asociada:

- audit_publication_publish_live_static_20260514_120500.md

---

## 3. Estado de flags

| Flag | Estado produccion | Funcion |
|---|---:|---|
| RADAR_READ_SOURCE | supabase_readonly | Lecturas switchadas desde Supabase |
| RADAR_WRITE_SOURCE | dual_write | Solicitudes Portal Entidad y estado gestor |
| RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE | sqlite por defecto | Publicacion de paquetes, desacoplada del flag global |

---

## 4. Reglas operativas vigentes

- No activar RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=dual_write sin prueba previa especifica.
- No activar RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=supabase sin auditoria y validacion completa.
- No enviar confirm_publish=true en produccion salvo autorizacion expresa.
- No ejecutar vercel --prod sin autorizacion expresa.
- Mantener los endpoints de publicacion protegidos por auth gestor.
- Mantener trazabilidad mediante checkpoints por bloque tecnico.

---

## 5. Documentos tecnicos del repo

- audit_endpoints_live_v3_20260513_172627.md
- audit_p0_write_endpoints_static_20260513_173010.md
- audit_publication_publish_live_static_20260514_120500.md
- audit_sqlite_dependencies_v2_20260513_171814.md
- checkpoint_produccion_auth_gestor_v1_20260510.md
- checkpoint_produccion_supabase_readonly_20260513_171229.md
- checkpoint_write_switch_v1_portal_interest_safe_20260513_193846.md
- protocolo_activacion_dual_write_produccion_portal_interest_20260513_204032.md
- checkpoint_dual_write_interest_cycle_validado_20260514_114228.md

---

## 6. Proximo paso recomendado

Antes de activar escritura Supabase para publicacion:

1. Crear prueba controlada en Preview.
2. Usar paquete o fixture no critico.
3. Validar consistencia SQLite/Supabase.
4. Validar rollback.
5. Solo despues plantear RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=dual_write.

Estado actual recomendado: mantener publicacion en sqlite.
