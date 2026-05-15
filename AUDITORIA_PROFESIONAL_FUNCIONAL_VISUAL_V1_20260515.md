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
