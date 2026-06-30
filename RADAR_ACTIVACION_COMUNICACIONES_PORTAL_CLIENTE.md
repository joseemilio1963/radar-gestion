# Radar Gestion Valencia - Activacion Comunicaciones Portal Cliente

Variable de activacion local: RADAR_CLIENT_PORTAL_COMMUNICATIONS_ENABLED=true

Estado validado: el formulario Nueva comunicacion aparece y el envio local funciona si el backend se arranca con la variable activa.

Si la variable no esta activa, el backend devuelve FEATURE_DISABLED y la interfaz indica que la funcionalidad todavia no esta activa.

Reglas: no activar en produccion sin orden expresa; no tocar .env real; no subir secretos; no activar archivos, OCR, IVA, WhatsApp, email, SMS, avisos ni acuses en esta fase.

Arranque local backend:
cd "C:\Users\User\Desktop\Nueva carpeta (2)\radar-gestion_SYNC"
$env:RADAR_CLIENT_PORTAL_COMMUNICATIONS_ENABLED="true"
$env:PORT="3000"
npm start

Arranque local frontend:
cd "C:\Users\User\Desktop\Nueva carpeta (2)\radar-gestion_SYNC"
npm run dev -- --host 127.0.0.1 --port 5173

URL local: http://localhost:5173/?portal_client=transportes_levante

Produccion no tocada. Push no. Deploy no.
