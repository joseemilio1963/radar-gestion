# Radar Gestión Valencia — Plan de cierre profesional definitivo

Fecha de creación: 2026-05-15
Producción: https://radar.aulagentia.eu
Rama base: main
Commit base: 13a365e163f59b73d720454079dd22f9d8eb6267

## 1. Principio rector

A partir de este punto, el objetivo único del proyecto es cerrar Radar Gestión Valencia como app profesional definitiva.

No se trabajará con enfoque de demo, prototipo o MVP.

Toda intervención debe estar dirigida a producto final:

- arquitectura definitiva;
- seguridad real;
- UX profesional en escritorio y móvil;
- flujo funcional completo;
- limpieza de deuda técnica;
- documentación operativa;
- validación de aceptación para entrega.

Las validaciones que se ejecuten no tendrán carácter experimental. Serán controles de aceptación profesional antes de cierre o despliegue.

## 2. Estado operativo actual

La aplicación está operativa en producción.

Estado técnico actual:

- Lectura principal: Supabase readonly.
- Solicitudes comerciales: dual_write validado.
- Publicación de paquetes: scoped seguro en sqlite.
- Generación de paquetes: scoped seguro en sqlite.
- Documento Maestro versionado en repo.
- Checkpoints técnicos recientes documentados.

Flags relevantes:

- RADAR_READ_SOURCE=supabase_readonly.
- RADAR_WRITE_SOURCE=dual_write para solicitudes.
- RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=sqlite.
- RADAR_PUBLICATION_GENERATE_WRITE_SOURCE=sqlite.

Regla operativa vigente:

- No activar RADAR_PUBLICATION_GENERATE_WRITE_SOURCE=dual_write ni supabase hasta implementar escritura Supabase real para generate.
- No activar RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE=dual_write ni supabase hasta cerrar flujo final de publicación con datos seguros, rollback y aceptación profesional.

## 3. Criterio de app profesional terminada

La app solo podrá considerarse profesionalmente terminada cuando cumpla todos estos criterios:

### 3.1 Arquitectura

- Fuente de verdad definida sin ambigüedad.
- Escrituras críticas documentadas.
- Endpoints legacy clasificados, migrados, protegidos o eliminados.
- Rollback claro por cada cambio crítico.
- Sin dependencias operativas no documentadas.

### 3.2 Seguridad

- Autenticación gestor robusta.
- Protección de endpoints internos.
- Separación efectiva entre clientes.
- Imposibilidad de acceso cruzado por manipulación de client_id.
- Payloads validados de forma estricta.
- Acciones críticas registradas.
- Revisión de CORS, cabeceras y exposición pública.

### 3.3 Funcionalidad

- Gestor operativo de extremo a extremo.
- Portal Entidad operativo para cada cliente.
- Paquetes publicados visibles solo al cliente correcto.
- Solicitudes comerciales creadas, gestionadas y reflejadas en dashboard.
- Generación y publicación controladas por revisión humana.
- Estados vacíos y errores tratados de forma profesional.

### 3.4 UX profesional

- Interfaz limpia, coherente y entendible.
- Jerarquía visual clara.
- Botones y llamadas a la acción inequívocos.
- Tablas, tarjetas y estados legibles.
- Mensajes humanos, no técnicos.
- Sin pantallas con apariencia de prototipo.

### 3.5 Móvil

- Portal Entidad usable desde móvil.
- Gestor usable desde móvil para consulta y gestión básica.
- Sin scroll horizontal innecesario.
- Botones no cortados.
- Tabs y menús accesibles.
- CTA principal visible.

### 3.6 Operación

- Procedimiento de despliegue.
- Procedimiento de rollback.
- Política de backup.
- Registro de incidencias.
- Checklist post-deploy.
- Documentación de mantenimiento.

## 4. Bloques de cierre profesional

### P0 — Bloques obligatorios antes de considerar entrega profesional

#### P0.1 Auditoría funcional real de producto

Objetivo: verificar todos los flujos reales de la app, no como prueba aislada, sino como control de aceptación.

Alcance:

- Login gestor.
- Dashboard gestor.
- Vista de clientes.
- Vista de paquetes.
- Portal Entidad por cliente.
- Solicitudes desde Portal Entidad.
- Gestión de solicitudes desde gestor.
- Validación de que cada cliente solo ve su información.
- Validación de que los estados comerciales son coherentes.

Clientes a incluir:

- transportes_levante.
- clinica_dental.
- inmobiliaria_turia.
- industrias_metalurgicas_turia.

Criterio de cierre:

- Ningún flujo principal roto.
- Ningún acceso cruzado.
- Ninguna acción crítica sin respuesta controlada.

#### P0.2 Auditoría visual escritorio

Objetivo: cerrar apariencia profesional en ordenador.

Resoluciones objetivo:

- 1366x768.
- 1440x900.
- 1920x1080.

Revisión:

- Dashboard gestor.
- Vista comercial.
- Paquetes.
- Solicitudes.
- Portal Entidad.
- Formularios y botones.
- Estados vacíos.
- Errores.

Criterio de cierre:

- Sin textos cortados.
- Sin scroll horizontal innecesario.
- Sin botones ocultos.
- Sin apariencia visual improvisada.

#### P0.3 Auditoría visual móvil

Objetivo: cerrar experiencia profesional móvil.

Resoluciones objetivo:

- 360x800.
- 390x844.
- 412x915.
- 768x1024 tablet.

Criterio de cierre:

- Portal Entidad usable desde móvil.
- CTA visible.
- Cards legibles.
- Menús accesibles.
- Gestor consultable desde móvil.
- Sin ruptura de layout.

#### P0.4 Auditoría de seguridad de acceso cliente

Objetivo: garantizar que un cliente no puede acceder a datos de otro.

Revisión mínima:

- Manipulación de client_id en Portal Entidad.
- Acceso directo a endpoints públicos.
- Endpoints gestor sin sesión.
- Endpoints internos protegidos.
- Payloads inesperados.

Criterio de cierre:

- Fail-closed ante cualquier acceso ambiguo.
- Sin fuga de datos entre clientes.

#### P0.5 Clasificación de endpoints

Objetivo: separar rutas definitivas, legacy, internas y eliminables.

Salida esperada:

- Inventario de endpoints.
- Estado: oficial, interno, legacy, pendiente de migrar, candidato a eliminar.
- Fuente de datos usada por cada endpoint.
- Nivel de autenticación.

Criterio de cierre:

- Ningún endpoint crítico sin clasificación.

#### P0.6 Documentación operativa mínima

Objetivo: que la app pueda mantenerse y desplegarse sin depender de memoria informal.

Documentos requeridos:

- Manual operativo interno.
- Checklist de despliegue.
- Checklist de rollback.
- Checklist de validación post-deploy.
- Mapa de flags de entorno.
- Mapa de endpoints oficiales.

## 5. Bloques P1 — Cierre técnico de arquitectura

### P1.1 Decisión de arquitectura final de datos

Decidir formalmente una de estas opciones:

Opción A:

- Supabase como fuente final de lectura y escritura.

Opción B:

- Arquitectura híbrida oficial documentada y aceptada.

Recomendación técnica inicial:

- Avanzar hacia Supabase como backend final, pero sin activar dual_write/supabase en generate o publish hasta implementar escritura real y rollback.

### P1.2 Escritura Supabase real para generate

Endpoint:

- POST /api/manager/publication-packages/generate.

Tablas:

- client_publication_packages.
- client_publication_package_items.
- client_publication_logs.

Criterio profesional:

- Implementar helpers reales.
- Mantener fail-closed.
- No activar flag en producción hasta cierre controlado.

### P1.3 Escritura Supabase real para publish

Endpoint:

- POST /api/manager/publication-packages/:id/publish.

Criterio profesional:

- No forzar publicación real sin candidato controlado.
- Resolver primero flujo generate real.
- Mantener publicación scoped en sqlite mientras no exista cierre seguro.

### P1.4 Observabilidad

Añadir o documentar:

- logs de errores backend;
- logs de acciones críticas;
- request id;
- trazabilidad de generación/publicación;
- monitorización mínima de endpoints críticos.

## 6. Bloques P2 — Producto y entrega comercial

### P2.1 Manual de usuario gestor

Debe explicar:

- cómo acceder;
- cómo revisar clientes;
- cómo interpretar dashboard;
- cómo gestionar solicitudes;
- cómo revisar paquetes;
- qué significa cada estado.

### P2.2 Manual Portal Entidad

Debe explicar al cliente:

- qué está viendo;
- cómo solicitar asesoramiento;
- qué ocurre después de pulsar la CTA;
- qué no hace automáticamente la herramienta.

### P2.3 Textos legales y responsabilidad

Revisar:

- aviso legal;
- privacidad;
- tratamiento de datos;
- limitación de responsabilidad;
- disclaimer sobre ayudas y normativa;
- revisión humana por asesoría.

## 7. Definición de terminado

Radar Gestión Valencia solo se considerará app profesional terminada cuando:

- P0 esté cerrado completo.
- No existan incidencias visuales críticas en móvil ni escritorio.
- No existan rutas críticas sin protección.
- Los flujos reales estén aceptados.
- La arquitectura de datos esté decidida y documentada.
- Los procedimientos operativos estén escritos.
- La documentación de usuario esté lista.
- El Documento Maestro refleje el estado final.

## 8. Siguiente acción inmediata

La siguiente acción debe ser P0.1 + P0.2 + P0.3 agrupadas como:

Auditoría profesional funcional y visual V1.

No tendrá carácter de demo ni simulación. Será control de aceptación para detectar y cerrar lo que impide considerar la app profesional terminada.
