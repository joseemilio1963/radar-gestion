# Radar Gestión Valencia — Producción operativa con AUTH GESTOR V1

**Fecha de validación:** 2026-05-10
**Ámbito:** Producción cloud → Vercel → radar.aulagentia.eu → autenticación Entorno Gestor → Portal Entidad público
**Estado:** PRODUCCIÓN OPERATIVA CON AUTH GESTOR V1 VALIDADA
**Dominio producción:** https://radar.aulagentia.eu
**Rama producción:** main
**Commit producción validado:** 4bfc073 Merge auth gestor V1 into main
**Backup previo de main:** backup-main-before-auth-gestor-v1-20260510_205351
**Repositorio local:** C:\Users\User\Desktop\radar-gestion_SYNC

---

## 1. Objetivo del bloque

Se ha implementado, validado en Preview y promocionado a producción el primer control real de acceso para el Entorno Gestor de Radar Gestión Valencia.

El objetivo de AUTH GESTOR V1 es impedir que las vistas internas del gestor queden accesibles públicamente, manteniendo al mismo tiempo el Portal Entidad disponible sin PIN para clientes.

---

## 2. Alcance funcional validado

- Pantalla de acceso por PIN para el Entorno Gestor.
- Validación del PIN en backend.
- Uso de hash SHA-256 mediante variable de entorno.
- Sesión mediante cookie HttpOnly.
- Logout funcional.
- Protección de endpoints internos del gestor.
- Portal Entidad accesible sin PIN.
- Compatibilidad con Vercel serverless.
- Sin nuevas dependencias npm.
- Sin modificación de datos de clientes, paquetes ni solicitudes.

---

## 3. Variables de entorno configuradas en Vercel

- MANAGER_ACCESS_PIN_HASH_SHA256
- MANAGER_SESSION_SECRET
- MANAGER_SESSION_TTL_HOURS

Nota de seguridad: no se documenta el PIN, no se documenta el hash real y no se documenta el secret.

---

## 4. Endpoints nuevos de autenticación

- POST /api/auth/manager/login
- GET /api/auth/manager/session
- POST /api/auth/manager/logout

Comportamiento validado:

- Login correcto devuelve authenticated=true.
- Sesión sin login devuelve authenticated=false.
- Logout devuelve authenticated=false.
- Si falta PIN, devuelve MANAGER_PIN_REQUIRED.
- Si el PIN es incorrecto, devuelve INVALID_MANAGER_PIN.
- Si faltan variables de entorno, devuelve MANAGER_AUTH_NOT_CONFIGURED.

---

## 5. Namespaces protegidos

Quedan protegidos por autenticación de gestor:

- /api/manager/
- /api/radar/
- /api/aids/
- /api/compliance/

Respuesta esperada sin sesión:

{
  "status": "error",
  "error_code": "MANAGER_AUTH_REQUIRED",
  "message": "Acceso gestor requerido."
}

---

## 6. Namespaces no protegidos

No se protegen:

- /api/auth/manager/
- /api/portal/
- /api/clients/entities

Motivo operativo:

- /api/auth/manager/ debe estar disponible para login, sesión y logout.
- /api/portal/ debe seguir siendo público para el Portal Entidad.
- /api/clients/entities se mantiene público temporalmente porque el Portal Entidad actual lo usa para selección de cliente demo.

Pendiente para AUTH V2: sustituir el acceso público a /api/clients/entities por client_id controlado, token de portal, magic link o endpoint público reducido.

---

## 7. Validación en Preview

Rama validada: auth-gestor-v1

Commits relevantes:

- 829b68a Add manager PIN auth gate
- 66ced08 Trigger auth gestor V1 preview redeploy with env vars

Resultado visual confirmado:

- Preview carga correctamente.
- Entorno Gestor pide PIN.
- PIN fijo entra correctamente.
- Botón Salir vuelve a pantalla de PIN.
- Portal Entidad abre sin PIN.

---

## 8. Promoción a producción

Se ejecutó merge controlado desde auth-gestor-v1 hacia main.

Commit de merge:

- 4bfc073 Merge auth gestor V1 into main

Backup previo de main:

- backup-main-before-auth-gestor-v1-20260510_205351

Validaciones antes y después del merge:

- node .\validate_auth_gestor_v1.mjs
- node --check .\server.js
- node --check .\api\index.js
- npm run build

Resultado validate_auth_gestor_v1.mjs:

{
  "ok": true,
  "errors": []
}

Estado Git final:

- ## main...origin/main

---

## 9. Validación producción

Dominio validado:

- https://radar.aulagentia.eu

Resultados confirmados:

- GET / → HTTP 200
- GET /api/auth/manager/session sin login → HTTP 200 authenticated=false
- GET /api/manager/commercial-dashboard sin login → HTTP 401 MANAGER_AUTH_REQUIRED
- GET /api/portal/packages?client_id=transportes_levante sin login → HTTP 200
- POST /api/auth/manager/login con PIN fijo → HTTP 200 authenticated=true
- GET /api/auth/manager/session tras login → HTTP 200 authenticated=true
- GET /api/manager/commercial-dashboard tras login → HTTP 200
- POST /api/auth/manager/logout → HTTP 200 authenticated=false

Counts del dashboard validados:

{
  "clients_total": 4,
  "packages_published": 4,
  "package_items_total": 33,
  "interest_requests_total": 8,
  "pending_contact": 0,
  "contacted": 0,
  "handled": 8,
  "dismissed": 0
}

---

## 10. Estado funcional final

AUTH GESTOR V1 queda validado en producción.

Estado:

- Producción operativa.
- Portal Entidad público operativo.
- Entorno Gestor protegido por PIN.
- Dashboard gestor bloqueado sin sesión.
- Login backend funcional.
- Cookie HttpOnly funcional.
- Logout funcional.
- Build correcto.
- Git limpio.

---

## 11. Observaciones técnicas

SQLite sigue funcionando en Vercel serverless con copia runtime a /tmp.

Esto es válido para demo/preview funcional, pero no debe considerarse persistencia productiva definitiva para uso comercial real con datos vivos.

Pendiente recomendado:

- Migrar persistencia a base gestionada antes de operación comercial real.

Opciones posibles:

- Supabase Postgres.
- Neon Postgres.
- Turso/libSQL.
- PostgreSQL gestionado.
- Backend propio con almacenamiento persistente.

AUTH GESTOR V1 es una protección mínima real y funcional, pero no es todavía un sistema completo de usuarios.

Pendientes para AUTH V2:

- Usuario/contraseña o multiusuario.
- Roles.
- Auditoría de accesos.
- Rate limiting.
- Bloqueo temporal por intentos fallidos.
- Rotación controlada de secret.
- Login cliente separado del login gestor.
- Acceso público del Portal mediante token o magic link.

---

## 12. Próximo paso recomendado

Con producción ya protegida, el siguiente bloque lógico puede ser:

### Opción A — Vista Comercial V2 accionable

- Marcar solicitud como contactada.
- Marcar solicitud como gestionada.
- Descartar solicitud.
- Notas internas.
- Próxima acción.
- Fecha de seguimiento.
- Semáforo comercial.
- Histórico por cliente.

### Opción B — Persistencia productiva

Migrar SQLite demo a base de datos gestionada antes de uso comercial real.

### Opción C — AUTH V2

Endurecer acceso con roles, usuarios, cliente/portal separado, auditoría, rate limiting y control por asesoría/cliente.

---

## 13. Checkpoint final

RADAR GESTIÓN VALENCIA
PRODUCCIÓN OPERATIVA CON AUTH GESTOR V1
VALIDADO EL 2026-05-10
COMMIT: 4bfc073
DOMINIO: https://radar.aulagentia.eu
ESTADO: ESTABLE
