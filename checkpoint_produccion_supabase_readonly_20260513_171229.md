# Radar Gestión Valencia — Checkpoint producción Supabase readonly activada

**Fecha:** 2026-05-13 17:12:30
**Repositorio:** joseemilio1963/radar-gestion
**Ruta local:** C:\Users\User\Desktop\radar-gestion_SYNC
**Dominio producción:** https://radar.aulagentia.eu
**Rama producción:** main
**Commit producción:** d6ee14d Add Supabase read switch V1
**Estado:** PRODUCCIÓN OPERANDO CON SUPABASE READONLY COMO FUENTE DE LECTURA

---

## 1. Estado operativo actual

Producción queda activada con:

RADAR_READ_SOURCE=supabase_readonly

La variable está configurada en Vercel Production y se realizó redeploy productivo.

## 2. Endpoints switchados a Supabase readonly

Endpoints operativos bajo el switch:

- GET /api/clients/entities
- GET /api/portal/packages?client_id=...
- GET /api/manager/commercial-dashboard
- GET /api/manager/read-source/status

El endpoint /api/manager/read-source/status está protegido por autenticación gestor.

## 3. Validación post-switch confirmada

Resultado validado:

PRODUCTION_SUPABASE_READONLY_SWITCH_OK=True
CLIENTS_HTTP=200
CLIENTS_READ_SOURCE=supabase_readonly
READ_SOURCE_STATUS_READ_SOURCE=supabase_readonly
READ_SOURCE_STATUS_ENABLED=true
READ_SOURCE_STATUS_CONFIGURED=true
READ_SOURCE_STATUS_URL_PRESENT=true
READ_SOURCE_STATUS_KEY_PRESENT=true
DASHBOARD_HTTP=200
DASHBOARD_MODE=supabase_read_switch_v1
DASHBOARD_READ_SOURCE=supabase_readonly

Datos funcionales confirmados:

Clientes totales: 4
Paquetes publicados: 4
Items publicados: 33
Solicitudes totales: 8
Pendientes contacto: 0
Contactadas: 0
Gestionadas: 8
Descartadas: 0

Portal Entidad validado:

transportes_levante: 8 items
clinica_dental: 8 items
inmobiliaria_turia: 7 items
industrias_metalurgicas_turia: 10 items

## 4. Estado Git

Estado final confirmado:

main...origin/main

Último commit operativo:

d6ee14d Add Supabase read switch V1

## 5. Rollback rápido a SQLite

Si hay que volver a SQLite, no hay que tocar código.

Opción recomendada: eliminar RADAR_READ_SOURCE de Production y redeployar.

Comandos rollback:

cd C:\Users\User\Desktop\radar-gestion_SYNC
npx vercel env rm RADAR_READ_SOURCE production --yes --scope radar-asesoria-valencia
npx vercel deploy --prod --yes --scope radar-asesoria-valencia

Resultado esperado tras rollback:

READ_SOURCE_STATUS_READ_SOURCE=sqlite

## 6. Rollback explícito a SQLite

Alternativa si se prefiere dejar la variable explícita:

cd C:\Users\User\Desktop\radar-gestion_SYNC
npx vercel env rm RADAR_READ_SOURCE production --yes --scope radar-asesoria-valencia
echo sqlite| npx vercel env add RADAR_READ_SOURCE production --scope radar-asesoria-valencia
npx vercel deploy --prod --yes --scope radar-asesoria-valencia

Resultado esperado:

READ_SOURCE_STATUS_READ_SOURCE=sqlite

## 7. Nota técnica

La app ya lee desde Supabase readonly para los endpoints switchados.
El cambio es reversible mediante variable de entorno.
No se han activado escrituras contra Supabase en este bloque.
Este checkpoint corresponde solo al cambio de fuente de lectura controlada.

## 8. Próximo bloque recomendado

1. Mantener producción en observación.
2. Validar navegación visual real en Portal Entidad y Entorno Gestor.
3. Preparar auditoría de endpoints todavía dependientes de SQLite.
4. Diseñar Supabase Write Switch V1 solo cuando la lectura lleve estable.
