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

---

## Actualización 2026-05-14 — Publication publish preflight validado en producción

Se añadió y validó en producción el endpoint protegido y read-only:

`GET /api/manager/publication-packages/:id/publish/preflight`

Commit validado:

`938e0be Add publication publish preflight endpoint`

Estado validado:

- Producción online: `https://radar.aulagentia.eu`.
- Endpoint sin login: `401 MANAGER_AUTH_REQUIRED`.
- Login gestor: `200`.
- `SCOPED_WRITE_SOURCE=sqlite`.
- `SCOPED_DUAL_WRITE_ACTIVE=false`.
- `SCOPED_SUPABASE_WRITE_ACTIVE=false`.
- `WRITE_MUTATION_EXECUTED=false`.
- `VALID_CONFIRM_TRUE_PUBLISH_SENT=false`.

Se evaluaron los 4 paquetes publicados actuales y todos devolvieron:

- `already_published=true`.
- `would_publish=false`.

Resumen:

- `PACKAGES_TESTED=4`.
- `ALREADY_PUBLISHED_COUNT=4`.
- `WOULD_PUBLISH_COUNT=0`.
- `ERROR_COUNT=0`.

Conclusión operativa:

No hay candidato seguro para ejecutar publicación real en `dual_write` ahora mismo. No activar `RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=dual_write` en producción hasta disponer de fixture/borrador sincronizado en SQLite y Supabase o Supabase staging.

Checkpoint asociado:

- `checkpoint_publication_publish_preflight_produccion_validado_20260514_173751.md`
---

## Actualización 2026-05-14 — Publication generate write source status validado en producción

Endpoint validado en producción:

- GET /api/manager/publication-generate/write-source/status
- write_source=sqlite
- env_var=RADAR_PUBLICATION_GENERATE_WRITE_SOURCE
- production_safe_default=true
- dual_write_active=false
- supabase_write_active=false
- VALID_GENERATE_MUTATION_SENT=False
- VALID_CONFIRM_TRUE_PUBLISH_SENT=False
- WRITE_MUTATION_EXECUTED=False

Conclusión: generate queda en modo seguro sqlite. No activar dual_write hasta implementar escritura sincronizada SQLite/Supabase.

Checkpoint asociado:

- checkpoint_publication_generate_write_source_status_produccion_validado_20260514_175647.md

---

## Actualización 2026-05-14 — Publication generate preflight validado en producción

Se añadió y validó en producción el endpoint protegido y read-only:

- GET /api/manager/publication-packages/generate/preflight

Commit validado:

- 14cf7e4 Guard publication generate preflight by client sector

Estado validado:

- Endpoint sin login: 401 MANAGER_AUTH_REQUIRED.
- Login gestor: 200.
- GENERATE_WRITE_SOURCE=sqlite.
- GENERATE_DUAL_WRITE_ACTIVE=False.
- GENERATE_SUPABASE_WRITE_ACTIVE=False.
- VALID_GENERATE_MUTATION_SENT=False.
- VALID_CONFIRM_TRUE_PUBLISH_SENT=False.
- WRITE_MUTATION_EXECUTED=False.

Guard validado:

- clinica_dental + clinicas_privadas => sector_matches_client=True, would_generate=False por paquete ya publicado.
- clinica_dental + transporte => sector_matches_client=False, would_generate=False.

Conclusión:

El preflight de generate queda validado en producción y evita combinaciones cliente-sector incorrectas antes de cualquier generación real.

Checkpoint asociado:

- checkpoint_publication_generate_preflight_produccion_validado_20260514_181442.md

---

## Actualización 2026-05-15 — Generate Write Switch V1 real Preview parcial

Rama: publication-generate-write-switch-v1-real.

Commit Preview validado:

- d0d07e07c0b3451680a4121d8f39715464f82c49 Guard publication generate write switch V1 fail closed.

Estado validado:

- POST /api/manager/publication-packages/generate usa write source scoped.
- write_source=sqlite en Preview.
- dual_write_active=false.
- supabase_write_active=false.
- Caso cruzado clinica_dental + transporte bloqueado con HTTP=400 invalid_client_sector.
- No hubo generación real válida.
- No hubo publicación real.
- Producción no fue tocada.

Pendiente antes de mergear a main:

- Pulir contrato de respuesta existing_published_package_found para devolver write_source, sqlite_action y supabase_action.

Checkpoint asociado:

- checkpoint_publication_generate_write_switch_v1_real_preview_parcial_20260515_122500.md

---

## Actualización 2026-05-15 — Generate Write Switch V1 real Preview validado

Rama:

- publication-generate-write-switch-v1-real

Commit validado:

- 3b6abbe25c60e3ca5aa1b94459472a1936809651 Complete publication generate existing response contract

Preview validado:

- https://radar-gestion-elg6kbvbl-radar-asesoria-valencia.vercel.app

Estado validado:

- write_source=sqlite.
- dual_write_active=false.
- supabase_write_active=false.
- Caso cruzado clinica_dental + transporte bloqueado con HTTP=400 invalid_client_sector.
- Caso existing_published_package_found devuelve contrato completo: write_source, sqlite_action, supabase_action, client_sector_key y sector_matches_client.
- No hubo generación válida de borrador nuevo.
- No hubo publicación real.
- Producción no fue tocada.

Conclusión:

- El checkpoint parcial anterior queda superado.
- El bloque queda listo para decisión de merge controlado a main o para esperar si se quiere añadir transacción SQLite antes.

Checkpoint asociado:

- checkpoint_publication_generate_write_switch_v1_real_preview_validado_20260515_145019.md

---

## Actualización 2026-05-15 — Generate SQLite transaction Preview no-mutación validada

Rama:

- publication-generate-write-switch-v1-real

Commit validado:

- 7b44c4cfeaed453e31f4f512059298b4cbd07788 Add SQLite transaction to publication generate

Preview validado:

- https://radar-gestion-k22yy5oe0-radar-asesoria-valencia.vercel.app

Estado validado:

- write_source=sqlite.
- dual_write_active=false.
- supabase_write_active=false.
- Caso cruzado clinica_dental + transporte bloqueado con HTTP=400 invalid_client_sector.
- Caso existing_published_package_found mantiene contrato completo.
- Transacción SQLite añadida por código: BEGIN, COMMIT, ROLLBACK y DELETE preparado.
- No se ejercitó generación real nueva porque no hay candidato seguro sin paquete publicado.
- Producción no fue tocada.
- No hubo mutaciones.

Conclusión:

- El bloque queda listo para merge controlado a main con validación producción sin mutaciones.

Checkpoint asociado:

- checkpoint_publication_generate_sqlite_transaction_preview_no_mutation_20260515_150533.md

---

## Actualización 2026-05-15 — Generate Write Switch V1 real validado en producción

Producción:

- https://radar.aulagentia.eu

Commit main validado:

- c2649dcef48e2ce5898f4bb3465b35052e761820

Backup remoto previo:

- backup-main-before-generate-write-switch-real_20260515_151126

Estado validado:

- main alineado con origin/main.
- Endpoint POST /api/manager/publication-packages/generate mergeado a main.
- RADAR_PUBLICATION_GENERATE_WRITE_SOURCE en producción permanece en sqlite.
- dual_write_active=false.
- supabase_write_active=false.
- Caso cruzado clinica_dental + transporte bloqueado con HTTP=400 invalid_client_sector.
- Caso clinica_dental + clinicas_privadas devuelve existing_published_package_found con contrato completo.
- Transacción SQLite añadida por código: BEGIN, COMMIT, ROLLBACK y DELETE preparado.
- No se ejecutó generación válida nueva.
- No se creó borrador nuevo.
- No se ejecutó confirm_publish=true.
- No se ejecutó vercel --prod.
- No hubo mutaciones.

Conclusión operativa:

- Generate Write Switch V1 real queda validado en producción en modo seguro sqlite.
- No activar RADAR_PUBLICATION_GENERATE_WRITE_SOURCE=dual_write ni supabase hasta implementar escritura Supabase real para generación.

Checkpoint asociado:

- checkpoint_publication_generate_write_switch_v1_real_produccion_validado_20260515_152824.md

---

## Plan de cierre profesional definitivo

Se añade el documento:

- PLAN_CIERRE_PROFESIONAL_RADAR_GESTION_VALENCIA.md

Criterio actualizado del proyecto:

- El objetivo ya no es demo, MVP ni prototipo.
- El objetivo único es app profesional definitiva.
- Las validaciones futuras serán controles de aceptación profesional.
- Todo avance deberá cerrar arquitectura, UX, seguridad, operación o documentación final.

Siguiente bloque recomendado:

- Auditoría profesional funcional y visual V1.


---

# ACTUALIZACION_20260519_COMERCIAL_UX

## Estado general

Radar Gestion Valencia queda en estado demo-ready, con version white-label operativa, material comercial preparado y correcciones visuales UX desplegadas en produccion.

Produccion:
https://radar.aulagentia.eu

Rama:
main

## Bloque comercial incorporado

Documentos comerciales y operativos anadidos al repositorio:

- GUION_VENTA_RADAR_ASESORIAS.md
- PRESENTACION_1P_Y_SPEECH_RADAR_ASESORIAS.md
- SECTORES_OBJETIVO_RADAR_ASESORIAS.md
- DEMO_COMERCIAL_CHECKLIST.md
- WHITE_LABEL_REPLICATION_CHECKLIST.md
- CHECKPOINT_PRODUCTO_DEMO_READY_20260519.md

Commits principales:

- 1320643 Add sales script for Radar advisory demo
- d646dd2 Add one-page sales presentation and call speech
- a372da9 Add target sectors list for Radar advisory sales
- 62e8bf3 Add commercial demo checklist D1
- 4ca2be7 Add white-label replication checklist P1C
- 6a3b45a Document product demo-ready checkpoint D3

Criterio comercial:

- No prometer integraciones no implementadas.
- Separar disponible hoy, replica white-label operativa y modulos futuros bajo validacion tecnica, legal y operativa.
- Presentar ingresos recurrentes como oportunidad, no como garantia.
- DEHU, Sistema RED, WhatsApp, firma electronica, AEAT, VERI FACTU y factura electronica se tratan como posibles modulos futuros bajo estudio.

## Bloque white-label

Estado validado:

- Marca centralizada en src/brandConfig.js.
- index.html y public/manifest.json sincronizables mediante scripts/sync-brand-static-assets.cjs.
- Iconos PWA sustituibles en public/icon-192x192.png y public/icon-512x512.png.
- Checklist de replica disponible en WHITE_LABEL_REPLICATION_CHECKLIST.md.
- Replica white-label operativa como plantilla/configuracion estatica.

## Bloque UX y visual

Se corrigieron mojibakes visibles en App.jsx y se anadieron botones de retorno para mejorar navegacion:

- f7ac5e2 Fix UI mojibake and add manager back button
- ed14d15 Add portal back-to-top buttons

Correcciones:

- Textos visibles corregidos: sesion, informacion, asesoria, implantacion, atencion y otros textos afectados.
- Boton gestor: volver al panel principal en vistas secundarias del Entorno Gestor.
- Botones Portal Entidad: volver arriba en portal-normativas y portal-ayudas.

Validacion tecnica local:

- node --check server.js OK.
- node --check api/index.js OK.
- npm run build OK.
- Asset local final: index-eQulsy1C.js.

Validacion produccion:

- Home 200.
- Asset produccion: /assets/index-eQulsy1C.js.
- URL cliente transportes_levante 200.
- API portal sin sesion 401 CLIENT_PORTAL_AUTH_REQUIRED.

## Estado final

Repo limpio y sincronizado antes de esta actualizacion documental:

- main
- origin/main
- ultimo commit validado: ed14d15 Add portal back-to-top buttons

No se tocaron:

- Supabase.
- Datos de negocio.
- Feature flags.
- Endpoints de escritura.
- vercel --prod manual.

Siguiente paso recomendado:

- Revision visual manual final en navegador.
- Preparar primera ronda de prospeccion con 30 contactos.
- Intentar conseguir 5 reuniones discovery.
- No abrir nuevos desarrollos salvo bug real o peticion validada por asesorias piloto.

---

## ACTUALIZACION_20260527_ASISTENTE_FAQ_DERIVACION_REAL_UX_MOVIL_PROTECCION_BASE

**Fecha:** 2026-05-27  
**Producción:** https://radar.aulagentia.eu  
**Commit final validado:** `9277421 Scroll to selected client detail on mobile`

### Resumen

Se incorpora a Radar Gestión Valencia una primera versión funcional del asistente FAQ para Portal Entidad, con soporte de voz, respuestas predefinidas, filtro de consultas sensibles y derivación real al entorno gestor.

También se incorporan mejoras UX móvil en el entorno gestor y se define la base estratégica de protección de propiedad intelectual y explotación bajo licencia.

### Commits incluidos

- `b5b80d4 Add client portal FAQ assistant V1`
- `80281ac Connect client FAQ assistant derivation requests`
- `60202c8 Add top client selector to clients entities view`
- `7bdaa16 Improve mobile manager section navigation`
- `3f28ae4 Fix mobile manager navigation runtime blank`
- `9277421 Scroll to selected client detail on mobile`

### Funcionalidad incorporada

- Asistente FAQ visible en Portal Entidad.
- Entrada por texto y voz.
- Lectura de respuesta por voz.
- Filtro de consultas sensibles fiscales, laborales, legales y contables.
- Derivación real mediante `POST /api/portal/assistant-requests`.
- Registro en `client_interest_requests`.
- Visualización en Paquetes para cliente y Vista Comercial.
- Endpoint protegido por sesión cliente o gestor.
- Sin sesión devuelve `CLIENT_PORTAL_AUTH_REQUIRED`.

### Accesos demo móvil

- Transportes Levante SL: `12345678T`
- Clínica Dental Sonrisas: `12345678C`
- Inmobiliaria Turia: `12345678I`
- Industrias Metalúrgicas Turia: `12345678M`

Teléfono demo: `600000000`.

### Mejoras UX móvil

- Selector superior en Clientes / Entidades.
- Scroll automático a Ficha del Cliente.
- Botón “← Volver al selector de empresas”.
- Scroll automático al cambiar de sección del gestor.
- Botón “← Volver al panel principal”.
- Corrección de pantalla blanca en Preview.

### Protección IP / explotación

Se acuerda iniciar capa de protección comercial, legal y técnica:

- Radar debe explotarse como licencia de uso, no como venta de código.
- Aulagentia conserva propiedad intelectual, prompts, estructura funcional, documentación, know-how y backend.
- Se recomienda añadir avisos legales en la app, footer de titularidad y base futura de control de licencia por asesoría.
- Cualquier cesión de código fuente o explotación exclusiva debe tratarse como venta de activo tecnológico de alto valor.

### Pendientes derivados

- Implementar aviso legal visible en app.
- Hacer clicables las métricas del Portal Entidad con botón “Volver al inicio”.
- Corregir falso positivo del asistente FAQ en consultas sobre SL, montar empresa o sociedad limitada.
- Completar auditoría de botones accionables.

### Documento relacionado

`checkpoint_asistente_faq_derivacion_real_mejoras_mobile_20260527.md`

---

## CHECKPOINT_ASISTENTE_FAQ_INTENCIONES_PRIORITARIAS_PRODUCCION_VALIDADO_20260529

### Checkpoint — Asistente FAQ con intenciones prioritarias validado en producción

**Fecha:** 2026-05-29  
**Producción:** https://radar.aulagentia.eu  
**Commit validado:** `3e41698 Improve client assistant SL response tone`  
**Asset producción validado:** `/assets/index-d60uI9kJ.js`

Se valida en producción el ajuste del asistente FAQ del Portal Entidad para corregir respuestas ante preguntas de cliente sobre:

- Constitución de SL o creación de empresa.
- Plazos de entrega de documentación trimestral.
- Derivación a la asesoría cuando la consulta requiere revisión profesional.

Resultados validados:

- La pregunta sobre montar una empresa / documentación para una SL responde como **Constitución de SL o empresa**.
- La respuesta ya no menciona documentación trimestral.
- La pregunta sobre fecha de entrega de documentación trimestral responde como **Plazo para documentación trimestral**.
- Ambas consultas derivan correctamente a la asesoría.
- Producción validada con `PRODUCTION_ASSISTANT_FAQ_INTENTS_V1_OK=True`.
- Sin mojibakes.
- Sin textos internos visibles como `V2 accionable` o `Exportaciones MARC`.

Checkpoint técnico asociado:

`checkpoint_asistente_faq_intenciones_prioritarias_produccion_validado_20260529.md`

Estado:

`VALIDADO_EN_PRODUCCION`

