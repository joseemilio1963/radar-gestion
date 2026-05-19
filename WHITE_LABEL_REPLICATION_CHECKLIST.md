# White-label Replication Checklist - Radar Gestion 
 
Objetivo: replicar la app para una nueva asesoria sin tocar codigo funcional. 
 
 
1. Cambiar marca en src/brandConfig.js 
Campos: appName, shortName, tagline, description, clientPortalTitle, clientPortalSubtitle, managerBadge, clientDisplayNames, colors.background, colors.header. 
No modificar src/App.jsx salvo necesidad tecnica validada. 
 
 
2. Sincronizar HTML y manifest despues de cambiar la marca: 
node scripts\sync-brand-static-assets.cjs 
 
 
3. Iconos por asesoria: sustituir public/icon-192x192.png y public/icon-512x512.png manteniendo nombre y tamano. 
icon-192x192.png debe ser 192x192. 
 
4. Validaciones antes de commit: 
node --check server.js 
node --check api/index.js 
node --check scripts\sync-brand-static-assets.cjs 
npm run build 
git status -sb 
git diff --name-only 
 
5. Archivos esperados en una replica de marca: src/brandConfig.js, index.html, public/manifest.json, public/icon-192x192.png, public/icon-512x512.png. 
 
6. Validacion produccion read-only: home 200, URL cliente 200, asset produccion igual a asset local, API portal sin sesion 401 CLIENT_PORTAL_AUTH_REQUIRED. 
 
7. No tocar en una replica de marca: Supabase, datos de negocio, endpoints de escritura, autenticacion cliente, autenticacion gestor, publicacion, solicitudes ni feature flags. 
 
Estado: version white-label operativa mediante brandConfig.js, sync de HTML/manifest e iconos PWA sustituibles. 
Futuro opcional: brand-config.json runtime, endpoint de configuracion, multitenant real y temas visuales avanzados. 
icon-512x512.png debe ser 512x512. 
