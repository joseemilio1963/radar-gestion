# Checkpoint Producto Demo Ready - Radar Gestion

Fecha: 2026-05-19
Produccion: https://radar.aulagentia.eu
Rama: main

Estado: producto base demo-ready y white-label operativo.

Commits clave:
- 62e8bf3 Add commercial demo checklist D1
- 4ca2be7 Add white-label replication checklist P1C
- e4dc1f6 Add brand static assets sync P1A
- a92b89f Add white-label brand config V1
- 88bff8c Document P0 client portal security checkpoint

Validacion produccion:
- Home 200
- URL cliente 200
- API portal sin sesion 401 CLIENT_PORTAL_AUTH_REQUIRED

Estado white-label:
- Marca centralizada en src/brandConfig.js
- index.html y manifest sincronizables con scripts/sync-brand-static-assets.cjs
- Iconos PWA sustituibles en public/icon-192x192.png y public/icon-512x512.png
- Checklist de replica disponible en WHITE_LABEL_REPLICATION_CHECKLIST.md

Estado demo comercial:
- Checklist disponible en DEMO_COMERCIAL_CHECKLIST.md
- Demo recomendada: Portal Entidad, Entorno Gestor y Vista Comercial
- No ejecutar escrituras ni cambios de configuracion durante demo salvo decision expresa

No se tocaron:
- Supabase
- Datos de negocio
- Feature flags
- vercel --prod

Pendiente futuro opcional:
- Runtime brand config
- Multitenant real
- Automatizacion alta asesorias
- Modulos opcionales bajo demanda
