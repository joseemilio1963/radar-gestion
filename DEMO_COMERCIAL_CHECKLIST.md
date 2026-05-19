# Demo Comercial Checklist - Radar Gestion

Objetivo: preparar una demo comercial segura para asesorias o partners sin improvisar y sin tocar datos de negocio.

1. Estado tecnico previo.
Repo debe estar limpio: git status -sb.
Produccion debe responder home 200.
URL cliente debe responder 200.
API portal sin sesion debe responder 401 CLIENT_PORTAL_AUTH_REQUIRED.

2. URLs de demo.
Produccion: https://radar.aulagentia.eu
Portal cliente ejemplo: https://radar.aulagentia.eu/?portal_client=transportes_levante

3. Flujo recomendado de demo.
Primero explicar el problema: la asesoria necesita informar a sus clientes de normativas, ayudas y oportunidades.
Despues mostrar Portal Entidad desde vista cliente.
Mostrar acceso seguro con clave.
Mostrar paquetes publicados para cliente.
Mostrar boton de interes o consulta con la asesoria solo si procede.
Mostrar Entorno Gestor.
Mostrar Vista Comercial y seguimiento de solicitudes.
Explicar que nada llega al cliente sin publicacion/revision controlada.

4. Mensaje comercial corto.
Radar Gestion convierte normativas, ayudas y oportunidades en una vista privada por cliente para que la asesoria genere servicio, seguimiento y valor recurrente.

5. No tocar durante una demo.
No modificar Supabase.
No ejecutar escrituras de prueba sin decision expresa.
No cambiar variables de Vercel.
No ejecutar vercel --prod.
No tocar autenticacion cliente ni gestor.
No borrar ni publicar paquetes durante la demo.

6. White-label.
Para otra asesoria se cambia marca en src/brandConfig.js.
Se ejecuta node scripts\sync-brand-static-assets.cjs.
Se sustituyen iconos public/icon-192x192.png y public/icon-512x512.png.
Se valida build y produccion read-only.

7. Estado vendible.
Producto base operativo.
Portal cliente protegido.
Branding replicable por configuracion estatica.
Checklist white-label disponible en WHITE_LABEL_REPLICATION_CHECKLIST.md.

8. Pendiente futuro opcional.
Runtime brand config.
Multitenant real.
Automatizacion avanzada de alta de asesorias.
Modulos opcionales bajo demanda.
