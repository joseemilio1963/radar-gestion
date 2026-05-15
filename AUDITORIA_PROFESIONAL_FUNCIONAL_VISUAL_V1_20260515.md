# Radar Gestión Valencia — Auditoría profesional funcional y visual V1

Fecha: 2026-05-15  
Rama: p0-auditoria-profesional-funcional-visual-v1  
Commit base: 59624dbf9c6c5a9300ed1e36485d90705b6cd92c  
Producción objetivo: https://radar.aulagentia.eu

## 1. Criterio profesional

Esta auditoría forma parte del cierre profesional definitivo de Radar Gestión Valencia.

No tiene carácter de demo, prototipo ni simulación. Es una auditoría de producto real para identificar y cerrar lo que impide considerar la app terminada profesionalmente.

## 2. Objetivo

Validar y cerrar, con criterio de producto final:

- funcionalidad real del gestor;
- funcionalidad real del Portal Entidad;
- UX profesional en escritorio;
- UX profesional en móvil;
- seguridad de acceso cliente;
- clasificación de endpoints oficiales y legacy;
- documentación operativa mínima.

## 3. Áreas P0 obligatorias

### P0.1 Auditoría funcional real

Flujos a revisar:

- login gestor;
- dashboard gestor;
- listado de clientes;
- paquetes publicados;
- Portal Entidad por cliente;
- solicitudes comerciales;
- gestión de estados de solicitud;
- coherencia del dashboard tras cambios;
- separación estricta entre clientes.

Clientes incluidos:

- transportes_levante;
- clinica_dental;
- inmobiliaria_turia;
- industrias_metalurgicas_turia.

### P0.2 Auditoría visual escritorio

Resoluciones objetivo:

- 1366x768;
- 1440x900;
- 1920x1080.

Pantallas a revisar:

- login gestor;
- dashboard gestor;
- vista comercial;
- paquetes;
- solicitudes;
- Portal Entidad;
- formularios;
- estados vacíos;
- mensajes de error.

### P0.3 Auditoría visual móvil

Resoluciones objetivo:

- 360x800;
- 390x844;
- 412x915;
- 768x1024.

Criterios móviles obligatorios:

- sin scroll horizontal innecesario;
- botones visibles y no cortados;
- tabs/menús accesibles;
- cards legibles;
- CTA principal visible;
- Portal Entidad usable desde móvil;
- gestor usable para consulta y gestión básica.

### P0.4 Seguridad de acceso cliente

Validar:

- ningún cliente accede a datos de otro;
- manipulación de client_id falla cerrado;
- endpoints gestor devuelven 401 sin sesión;
- endpoints públicos no exponen información interna;
- payloads ambiguos fallan de forma controlada.

### P0.5 Clasificación de endpoints

Cada endpoint deberá clasificarse como:

- oficial;
- interno;
- legacy;
- pendiente de migrar;
- candidato a eliminar.

Para cada endpoint se documentará:

- método;
- ruta;
- autenticación requerida;
- fuente de datos;
- uso frontend;
- estado final recomendado.

## 4. Matriz inicial de incidencias

| Código | Área | Incidencia | Prioridad | Estado |
|---|---|---|---|---|
| P0-FUNC-001 | Funcional | Ejecutar aceptación funcional completa en navegador | P0 | Pendiente |
| P0-UXD-001 | UX escritorio | Revisar pantallas principales en resoluciones objetivo | P0 | Pendiente |
| P0-UXM-001 | UX móvil | Revisar Portal Entidad y gestor móvil sin scroll horizontal | P0 | Pendiente |
| P0-SEC-001 | Seguridad | Auditar acceso cruzado por client_id | P0 | Pendiente |
| P0-END-001 | Backend | Clasificar endpoints oficiales/legacy | P0 | Pendiente |
| P1-ARCH-001 | Arquitectura | Decidir escritura Supabase final para generate/publish | P1 | Pendiente |
| P1-OPS-001 | Operación | Crear checklist de despliegue, rollback y postdeploy | P1 | Pendiente |
| P2-DOC-001 | Documentación | Manual gestor y manual Portal Entidad | P2 | Pendiente |

## 5. Próxima acción

La siguiente acción será ampliar esta auditoría con datos reales de producción y revisión visual efectiva, sin ejecutar mutaciones de negocio.

## 6. Seguridad de este documento

- No se ejecutó Vercel.
- No se tocó producción.
- No se mutaron datos.
- No se imprimieron secretos.
- El documento está orientado exclusivamente al cierre profesional de producto.

---

## 12. P0.1 — Inventario funcional real read-only de producción

Fecha: 2026-05-15

Este bloque es un control profesional de aceptación funcional read-only sobre producción. No ejecuta mutaciones de negocio.

### 12.1 Protección y acceso

- Home producción HTTP: 200
- Clients entities HTTP: 200
- Read source status sin login HTTP: 401
- Generate write source status sin login HTTP: 401
- Publish write source status sin login HTTP: 401
- Login gestor HTTP: 200

### 12.2 Estado autenticado de fuentes

- Read status HTTP: 200
- read_source: supabase_readonly
- configured: 
- Global write status HTTP: 200
- global write_source: dual_write
- global dual_write_active: True
- Generate status HTTP: 200
- generate write_source: sqlite
- generate dual_write_active: False
- generate supabase_write_active: False
- Publish status HTTP: 200
- publish write_source: sqlite
- publish dual_write_active: False
- publish supabase_write_active: False

### 12.3 Dashboard y paquetes

- Dashboard HTTP: 200
- clients_total: 
- packages_published: 
- package_items_total: 
- interest_requests_total: 
- pending_contact: 
- handled: 
- Publication packages HTTP: 200
- publication packages count: 4

### 12.4 Portal Entidad por cliente

| Cliente | HTTP | status | read_source | package_id | package_status | items |
|---|---:|---|---|---|---|---:|
| transportes_levante | 200 | ok | supabase_readonly |  |  | 0 |
| clinica_dental | 200 | ok | supabase_readonly |  |  | 0 |
| inmobiliaria_turia | 200 | ok | supabase_readonly |  |  | 0 |
| industrias_metalurgicas_turia | 200 | ok | supabase_readonly |  |  | 0 |

### 12.5 Lectura profesional inicial

- Producción responde.
- Endpoints internos principales mantienen protección sin login.
- Fuentes scoped siguen en estado seguro.
- Portal Entidad devuelve datos por los 4 clientes esperados.

### 12.6 Pendiente de cierre

- Revisión visual real escritorio.
- Revisión visual real móvil.
- Auditoría específica de acceso cruzado cliente.
- Clasificación completa de endpoints oficiales/legacy.

---

## 13. P0.1B — Corrección profesional de contrato real de respuestas

Fecha: 2026-05-15

Se inspeccionó la estructura real de las respuestas de producción para evitar conclusiones incorrectas por parsing incompleto.

### 13.1 Dashboard comercial

Endpoint:

- GET /api/manager/commercial-dashboard

Resultado:

- HTTP=200.
- TOP_LEVEL_KEYS=clients, counts, filters, mode, read_source, requests, resource, source_of_truth_current, status.
- mode=supabase_read_switch_v1.
- read_source=supabase_readonly.

Los contadores no están en el nivel raíz. Están dentro del objeto:

- counts.clients_total=4.
- counts.packages_published=4.
- counts.package_items_total=33.
- counts.interest_requests_total=9.
- counts.pending_contact=0.
- counts.contacted=0.
- counts.handled=9.
- counts.dismissed=0.

Conclusión profesional:

- El inventario anterior que mostraba campos dashboard vacíos no indica fallo funcional.
- La causa era lectura incorrecta del contrato JSON.

### 13.2 Publication packages

Endpoint:

- GET /api/manager/publication-packages

Resultado:

- HTTP=200.
- TOP_LEVEL_KEYS=count, packages, status.
- count=4.
- packages[0].id=lmaq9r54ryf6r5bhd8xa15.
- packages[0].client_id=industrias_metalurgicas_turia.
- packages[0].package_status=published.

Conclusión profesional:

- Existen 4 paquetes publicados gestionables desde entorno interno.

### 13.3 Portal Entidad

Endpoint inspeccionado:

- GET /api/portal/packages?client_id=clinica_dental

Resultado:

- HTTP=200.
- TOP_LEVEL_KEYS=client_id, mode, packages, read_source, resource, source_of_truth_current, status.
- client_id=clinica_dental.
- mode=supabase_read_switch_v1.
- read_source=supabase_readonly.
- packages=ARRAY_COUNT_1.

El contrato real del Portal Entidad es:

- packages[] contiene los paquetes visibles.
- Cada package contiene sus items anidados en package.items[].

Paquete detectado:

- package_id=hsc4tgy50msbz7s3xvsmn7.
- client_id=clinica_dental.
- sector_key=clinicas_privadas.
- package_status=published.
- review_status=approved.
- client_publish_status=published.
- total_items=8.

Conclusión profesional:

- El resultado anterior de items=0 en P0.1 era un error del parser de auditoría.
- No se detecta fallo funcional en el endpoint Portal Entidad para Clínica Dental.
- El contrato real debe documentarse y usarse correctamente en futuras auditorías y frontend.

### 13.4 Ajuste de criterio P0.1

La auditoría P0.1 queda corregida:

- Dashboard operativo con counts anidado.
- Portal Entidad operativo con packages[] e items anidados.
- Publication packages operativo con count=4.

Pendiente profesional:

- Repetir matriz de Portal Entidad para los 4 clientes usando el contrato correcto packages[].items[].
- Continuar con auditoría visual real escritorio/móvil.
- Auditar acceso cruzado cliente por manipulación de client_id.

### 13.5 Seguridad de esta inspección

- Solo lectura.
- No se ejecutó POST /generate.
- No se ejecutó confirm_publish=true.
- No hubo mutaciones de negocio.
- No se ejecutó Vercel.
- No se imprimieron secretos.
