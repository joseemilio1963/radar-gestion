# Checkpoint — Asistente FAQ con intenciones prioritarias validado en producción

**Fecha:** 2026-05-29  
**Producción:** https://radar.aulagentia.eu  
**Commit validado:** `3e41698 Improve client assistant SL response tone`  
**Asset producción validado:** `/assets/index-d60uI9kJ.js`  
**Marcador:** `CHECKPOINT_ASISTENTE_FAQ_INTENCIONES_PRIORITARIAS_PRODUCCION_VALIDADO_20260529`

---

## 1. Objetivo del bloque

Se corrige el comportamiento del asistente FAQ del Portal Entidad para evitar respuestas incorrectas o confusas ante preguntas de cliente que no deben resolverse como documentación trimestral genérica.

Casos corregidos:

1. Consulta sobre montar empresa o constituir una SL.
2. Consulta sobre fecha o plazo para entregar documentación trimestral.
3. Eliminación de una frase interna que sonaba defensiva o técnica para el cliente final.

---

## 2. Problema detectado

Antes de la corrección, el asistente podía interpretar preguntas amplias sobre documentación como si fueran siempre consultas de documentación trimestral.

Ejemplo problemático:

> Hola, si quiero montar una empresa, ¿qué documentación necesitaría aportar para una SL?

La respuesta podía mezclarse con documentación trimestral, cuando realmente se trata de una consulta de constitución societaria que debe derivarse al despacho.

También se detectó que una respuesta inicial decía:

> La creación de una SL o la constitución de una empresa no es una consulta de documentación trimestral.

Aunque era técnicamente cierta, se eliminó porque no era adecuada para cliente final.

---

## 3. Implementación realizada

Se añadió una capa de intenciones prioritarias antes del FAQ genérico:

- `CLIENT_ASSISTANT_PRIORITY_INTENTS_V2`
- `CLIENT_ASSISTANT_PRIORITY_INTENTS_CALL_V2`

La lógica prioriza:

### 3.1 Constitución de SL o empresa

Preguntas relacionadas con:

- Crear una SL.
- Montar una empresa.
- Constituir una sociedad limitada.
- Documentación para crear una SL.
- Alta de empresa o sociedad.

Respuesta esperada:

- Título: **Constitución de SL o empresa**
- Respuesta orientativa y prudente.
- Derivación a la asesoría.
- Sin mencionar documentación trimestral.

### 3.2 Plazos de documentación trimestral

Preguntas relacionadas con:

- Fecha para entregar documentación trimestral.
- Plazo para enviar documentación.
- Último día.
- Modelos trimestrales.
- IVA / IRPF / modelos 303, 130, 131, 111, 115.

Respuesta esperada:

- Título: **Plazo para documentación trimestral**
- Respuesta orientativa sobre margen interno.
- Derivación a la asesoría para confirmar fecha exacta.

---

## 4. Validación técnica en producción

Validación ejecutada contra:

`https://radar.aulagentia.eu`

Resultado:

- `HOME_HTTP=200`
- `ASSET_HTTP=200`
- `HAS_SL_TITLE=True`
- `HAS_SL_TEXT=True`
- `HAS_QUARTER_DEADLINE=True`
- `HAS_QUARTER_DEADLINE_TEXT=True`
- `HAS_NEW_QUICK_QUESTION=True`
- `HAS_FORBIDDEN_SL_TEXT=False`
- `HAS_COPYRIGHT_OK=True`
- `HAS_MOJIBAKE=False`
- `HAS_SEGUIMIENTO_COMERCIAL=True`
- `HAS_EXPORTACIONES_GENERADAS=True`
- `HAS_EXPORTACIONES_MARC=False`
- `HAS_V2_ACCIONABLE=False`
- `PRODUCTION_ASSISTANT_FAQ_INTENTS_V1_OK=True`

---

## 5. Validación visual

Validación visual realizada en producción desde Portal Entidad.

URL validada:

`https://radar.aulagentia.eu/?portal_client=transportes_levante`

Clave usada:

`12345678T`

Pruebas realizadas:

### Pregunta 1

`Hola, si quiero montar una empresa, ¿qué documentación necesitaría aportar para una SL?`

Resultado esperado y validado:

- Responde como **Constitución de SL o empresa**.
- No menciona documentación trimestral.
- Deriva correctamente a la asesoría.

### Pregunta 2

`¿En qué fecha tengo que entregar la documentación para realizar el trimestre?`

Resultado esperado y validado:

- Responde como **Plazo para documentación trimestral**.
- Orienta sobre plazos internos.
- Deriva correctamente a la asesoría para confirmar fecha exacta.

---

## 6. Estado final

Estado del bloque:

`VALIDADO_EN_PRODUCCION`

Este checkpoint cierra el ajuste del asistente FAQ en Portal Entidad para los casos de:

- Constitución de SL / creación de empresa.
- Plazos de documentación trimestral.
- Eliminación de frases internas no adecuadas para cliente final.

