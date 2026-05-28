# Checkpoint — Asistente FAQ, derivación real, mejoras móviles y base de protección IP

**Fecha:** 2026-05-27  
**Producción:** https://radar.aulagentia.eu  
**Commit final validado:** `9277421 Scroll to selected client detail on mobile`  
**Rama final:** `main`  
**Estado:** Producción validada funcionalmente.

---

## 1. Resumen ejecutivo

Se incorpora a Radar Gestión Valencia una primera versión funcional del módulo de asistente FAQ para Portal Entidad, con soporte de voz, respuestas predefinidas, filtro de consultas sensibles y derivación real al entorno gestor.

Además, se corrigen y mejoran varios puntos de UX móvil del entorno gestor para que el uso en reuniones comerciales y desde móvil sea más claro, especialmente en la sección Clientes / Entidades.

---

## 2. Commits principales

- `b5b80d4 Add client portal FAQ assistant V1`
- `80281ac Connect client FAQ assistant derivation requests`
- `60202c8 Add top client selector to clients entities view`
- `7bdaa16 Improve mobile manager section navigation`
- `3f28ae4 Fix mobile manager navigation runtime blank`
- `9277421 Scroll to selected client detail on mobile`

---

## 3. Asistente FAQ en Portal Entidad

Funcionalidad incorporada:

- Asistente visible dentro del Portal Entidad.
- Entrada por texto.
- Botón de voz: “Hablar con el asistente”.
- Lectura de respuestas por voz.
- Respuestas FAQ predefinidas.
- Clasificación básica por palabras clave y scoring.
- Filtro de consultas sensibles.
- Derivación segura de preguntas fiscales, laborales, legales o contables.

Ejemplos validados:

- “¿Qué documentación tengo que enviar este trimestre?” → Documentación trimestral.
- “¿Qué hago si una normativa aparece pendiente?” → Normativas y obligaciones.
- “¿Puedo desgravarme los gastos médicos que no hayan cubierto la Seguridad Social?” → Derivación profesional.
- “¿Puedo despedir a un trabajador de baja?” → Derivación profesional.

---

## 4. Derivación real al entorno gestor

Se implementa endpoint:

`POST /api/portal/assistant-requests`

Comportamiento:

- Registra una consulta real del cliente.
- Usa `client_interest_requests`.
- Crea solicitud con tipo `CONSULTA_ASISTENTE_FAQ`.
- Estado inicial: `pending_contact`.
- Prioridad: `high`.
- Origen: `assistant_faq`.
- Visible en:
  - Paquetes para cliente / Solicitudes recibidas desde Portal Entidad.
  - Vista Comercial / Solicitudes comerciales.

Validación funcional:

- El cliente pulsa “Preparar derivación”.
- La app confirma: “Consulta registrada correctamente. Tu asesoría la revisará.”
- La solicitud aparece en gestor.
- La solicitud aparece en Vista Comercial.

---

## 5. Seguridad del endpoint

Estado validado:

- El endpoint `/api/portal/assistant-requests` requiere sesión cliente o gestor.
- Sin sesión devuelve `CLIENT_PORTAL_AUTH_REQUIRED`.
- No se permite registrar derivaciones anónimas.
- El asistente no ofrece asesoramiento personalizado en materias sensibles.
- Las preguntas fiscales, laborales, legales o contables se derivan a revisión profesional.

Validación producción:

- `ASSISTANT_POST_NOAUTH_HTTP=401`
- `HAS_CLIENT_AUTH_REQUIRED=True`
- `PRODUCTION_ASSISTANT_ENDPOINT_NOAUTH_PROTECTED=True`

---

## 6. Accesos demo configurados para móvil

Se configuraron claves demo en producción para probar desde móvil:

| Empresa | URL | Clave |
|---|---|---|
| Transportes Levante SL | `https://radar.aulagentia.eu/?portal_client=transportes_levante` | `12345678T` |
| Clínica Dental Sonrisas | `https://radar.aulagentia.eu/?portal_client=clinica_dental` | `12345678C` |
| Inmobiliaria Turia | `https://radar.aulagentia.eu/?portal_client=inmobiliaria_turia` | `12345678I` |
| Industrias Metalúrgicas Turia | `https://radar.aulagentia.eu/?portal_client=industrias_metalurgicas_turia` | `12345678M` |

Teléfono demo configurado:

`600000000`

Validación:

- `CONFIGURE_PHONE_HTTP=200`
- `SETUP_KEY_HTTP=200`
- `CLIENT_LOGIN_HTTP=200`
- `CLIENT_SUMMARY_HTTP=200`
- `CLIENT_SUMMARY_OK=True`

Nota: estas claves son únicamente demo/comercial. No deben usarse para clientes reales.

---

## 7. Mejoras UX móvil del entorno gestor

Se añadieron mejoras en móvil para evitar que el usuario se pierda al navegar:

### Clientes / Entidades

- Selector superior: “Seleccionar empresa / cliente”.
- Al seleccionar una empresa, la pantalla baja automáticamente hasta “Ficha del Cliente”.
- Botón “← Volver al selector de empresas”.
- Se mantiene el Directorio de empresas como navegación adicional.

### Navegación por secciones del gestor

- Al seleccionar secciones como Normativas, Ayudas, Paquetes, Vista Comercial o Portal Entidad, la app baja automáticamente al contenido.
- Se añade botón “← Volver al panel principal”.
- Se corrigió pantalla blanca en Preview causada por efecto de scroll móvil ejecutado antes de tiempo.

Validación móvil:

- Preview validado.
- Producción desplegada.
- Producción sirve asset nuevo.
- Elementos visibles confirmados:
  - “Seleccionar empresa / cliente”
  - “Volver al selector de empresas”
  - “Volver al panel principal”

---

## 8. Base de protección de propiedad intelectual y explotación

Se acuerda iniciar una capa de protección comercial, legal y técnica de Radar Gestión Valencia como producto.

Criterio estratégico:

- No vender el código fuente salvo operación de alto importe.
- Priorizar licencia de uso, implantación, mensualidad y módulos.
- Mantener prompts, arquitectura, reglas internas, documentación técnica y know-how como activos privados.
- Reforzar la app con avisos legales y control futuro de licencia por asesoría.

Medidas recomendadas para siguiente implementación:

- Aviso legal visible en login gestor.
- Aviso legal visible en Portal Entidad.
- Footer de titularidad.
- Texto de uso bajo licencia.
- Prohibición de copia, cesión, sublicencia, explotación no autorizada e ingeniería inversa.
- Endpoint futuro `/api/app/license/status`.
- Configuración futura por `LICENSE_ID`, `APP_INSTANCE_ID` y `tenant_id`.
- Contrato/licencia para asesorías.

---

## 9. Pendientes detectados para siguiente bloque

Quedan como ajustes pendientes:

- Añadir capa visible de protección legal/IP dentro de la app.
- Hacer clicables las métricas del Portal Entidad con botón “Volver al inicio”.
- Corregir asistente FAQ para que consultas sobre montar empresa, SL, sociedad limitada o alta de empresa deriven a revisión profesional.
- Pulir botón “Ver ficha” en Clientes / Entidades para que sea accionable de forma explícita.
- Revisar botones que parezcan accionables y convertirlos en acción real, navegación o aviso claro.

---

## 10. Estado final

Producción:

`https://radar.aulagentia.eu`

Commit final:

`9277421 Scroll to selected client detail on mobile`

Estado:

- Asistente FAQ operativo.
- Derivación real operativa.
- Solicitudes visibles en gestor.
- Accesos demo configurados.
- Mejoras móviles operativas.
- Base de protección IP definida para implementación posterior.
