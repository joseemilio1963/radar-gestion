\---



\## Checkpoint P0 — Portal Entidad exclusivo por cliente validado en producción



\*\*Fecha:\*\* 2026-05-17  

\*\*Producción:\*\* `https://radar.aulagentia.eu`  

\*\*Rama final:\*\* `main`  

\*\*Commit final validado:\*\* `9caece7f70ff47885ca811faa3377eb962451437`  

\*\*Commit corto:\*\* `9caece7 Add exclusive client portal access mode`  

\*\*Asset producción validado:\*\* `/assets/index-CksLSBsx.js`



\### 1. Objetivo del bloque



Este checkpoint forma parte del cierre profesional P0 de Radar Gestión Valencia.



El objetivo era abandonar cualquier comportamiento de portal tipo demo y dejar implementado un \*\*Portal Entidad exclusivo por cliente\*\*, apto para uso profesional.



El cliente de una asesoría no debe acceder a una vista con selector de empresas, navegación de gestor ni elementos internos. Cada cliente debe entrar únicamente a su propio portal mediante una URL específica.



\### 2. Problema detectado antes del bloque



Antes de este checkpoint, el Portal Entidad podía abrirse sin PIN, pero mantenía comportamiento de selector interno:



\- Existía botón genérico “Abrir Portal Entidad sin PIN”.

\- El Portal Entidad mostraba texto “Vista demo del Portal Entidad”.

\- El usuario podía seleccionar entre varias empresas.

\- El endpoint público `/api/clients/entities` devolvía las 4 entidades.

\- El portal no estaba cerrado como vista exclusiva real de cliente.

\- El cliente podía ver una interfaz pensada para validación interna, no para uso final profesional.



Esto no era aceptable para una app profesional final.



\### 3. Decisión profesional



Se definió como bloque P0 obligatorio:



\*\*Portal Entidad exclusivo por cliente\*\*



Criterio operativo:



\- Cada cliente accede por una URL propia.

\- El cliente solo ve su entidad.

\- No existe selector de otras empresas.

\- No aparece navegación del gestor.

\- No aparece Vista Comercial.

\- No aparecen Ayudas internas.

\- No aparecen Paquetes para cliente.

\- No aparece texto de demo.

\- No aparece botón genérico de acceso sin PIN.

\- Solo se muestra información publicada y revisada por la asesoría.



\### 4. URLs profesionales de cliente validadas



Se validaron en producción las siguientes URLs:



\- `https://radar.aulagentia.eu/?portal\_client=transportes\_levante`

\- `https://radar.aulagentia.eu/?portal\_client=clinica\_dental`

\- `https://radar.aulagentia.eu/?portal\_client=inmobiliaria\_turia`

\- `https://radar.aulagentia.eu/?portal\_client=industrias\_metalurgicas\_turia`



Cada URL abre directamente el Portal Entidad del cliente correspondiente.



\### 5. Implementación técnica



Se implementó el commit:



`9caece7f70ff47885ca811faa3377eb962451437 Add exclusive client portal access mode`



Cambios principales en `src/App.jsx`:



\- `PortalEntidadPanel` acepta parámetros:

&#x20; - `fixedClientId`

&#x20; - `exclusiveClientPortal`



\- La app detecta el parámetro de URL:

&#x20; - `portal\_client=<client\_id>`



\- Si existe `portal\_client`, la app fuerza el modo Portal Entidad exclusivo.



\- Se carga únicamente el cliente indicado en la URL.



\- En modo cliente exclusivo:

&#x20; - se oculta el selector de empresas;

&#x20; - se elimina el texto “Vista demo del Portal Entidad”;

&#x20; - se oculta la navegación del gestor;

&#x20; - se elimina el acceso genérico “Abrir Portal Entidad sin PIN”;

&#x20; - se muestra un shell visual solo de Portal Entidad;

&#x20; - se mantiene únicamente la información publicada de la entidad correspondiente.



\- El gestor conserva su entorno interno separado.



\### 6. Validación técnica



Build local ejecutado correctamente:



`npm run build`



Asset generado localmente:



`assets/index-CksLSBsx.js`



Push a `main` correcto:



`c26db04..9caece7 main -> main`



Producción confirmó el asset final:



`/assets/index-CksLSBsx.js`



Repositorio local final:



`## main...origin/main`



Temporales locales eliminados:



\- `patch\_portal\_cliente\_exclusivo.cjs`

\- `patch\_portal\_cliente\_exclusivo\_fix.cjs`



\### 7. Validación visual en producción



Validación manual confirmada por el usuario en las 4 URLs de cliente:



\- Transportes Levante SL: OK.

\- Clínica Dental Sonrisas: OK.

\- Inmobiliaria Turia: OK.

\- Industrias Metalúrgicas Turia: OK.



Comprobaciones realizadas:



\- Entra directamente al Portal Entidad del cliente.

\- No aparece selector de empresas.

\- No aparece navegación del gestor.

\- No aparece texto “Vista demo”.

\- No aparece Vista Comercial.

\- No aparecen Ayudas internas.

\- No aparece Paquetes para cliente.

\- Solo se ve información publicada de la entidad correspondiente.

\- Producción sirve el asset correcto `/assets/index-CksLSBsx.js`.



\### 8. Seguridad operativa



Durante este bloque:



\- No se ejecutó `vercel --prod`.

\- No hubo mutaciones de datos.

\- No se ejecutó `POST /generate`.

\- No se ejecutó `confirm\_publish=true`.

\- No se publicaron paquetes.

\- No se tocaron datos de clientes.

\- No se limpiaron registros de base de datos.

\- No se imprimieron secretos.

\- El despliegue de producción se realizó por deployment automático tras push a `main`.



\### 9. Estado final del bloque



El Portal Entidad queda validado como acceso profesional exclusivo por cliente.



Estado final:



\- Producción: `https://radar.aulagentia.eu`

\- Commit validado: `9caece7f70ff47885ca811faa3377eb962451437`

\- Commit corto: `9caece7 Add exclusive client portal access mode`

\- Asset producción: `/assets/index-CksLSBsx.js`

\- Portal cliente exclusivo: OK.

\- Selector de empresas para cliente: eliminado en modo exclusivo.

\- Navegación gestor para cliente: no visible.

\- Texto demo: eliminado.

\- URLs por cliente: validadas.

\- Repo local: limpio.



\### 10. Ubicación dentro del Documento Maestro



Este checkpoint debe quedar incorporado en el \*\*Documento Maestro del Proyecto Radar Gestión Valencia\*\*, dentro de la sección de estado operativo, checkpoints o validaciones de producción.



Ubicación recomendada:



DOCUMENTO MAESTRO RADAR GESTIÓN VALENCIA  

→ Estado operativo / Checkpoints / Producción  

→ Último checkpoint validado



Este checkpoint sustituye cualquier referencia anterior al Portal Entidad como vista demo o selector interno.



A partir de este punto, el Portal Entidad profesional de cliente se considera validado únicamente mediante URLs específicas con `portal\_client`.



\### 11. Criterio para futuras iteraciones



No debe considerarse cerrada una futura iteración del Portal Entidad si no mantiene como mínimo este estado:



\- cliente aislado por URL;

\- sin selector de otras empresas;

\- sin navegación de gestor;

\- sin texto demo;

\- sin acceso a vistas internas;

\- solo información publicada por la asesoría;

\- funcionamiento validado en producción.



\### 12. Siguiente paso profesional



Tras este checkpoint, el siguiente bloque recomendado para el cierre profesional de Radar Gestión Valencia es la validación integral final de producción:



\- Entorno Gestor.

\- Portal Entidad exclusivo.

\- Vista Comercial.

\- Ayudas y subvenciones.

\- Paquetes para cliente.

\- Acceso móvil.

\- Acceso escritorio.

\- Consola sin errores críticos.

\- Checklist comercial para presentación a Grupo Avanza.



\---

