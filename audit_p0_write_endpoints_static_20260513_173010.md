# Radar Gestión Valencia — Auditoría estática P0 write endpoints

**Fecha:** 2026-05-13 17:30:12
**Rama:** main
**Commit:** 5a14992 Document live endpoints audit V3
**Política:** análisis estático sin mutar producción

## Endpoints P0 revisados

### P0_portal_interest_requests_create

- Matches: 1
- Risk: HIGH_PUBLIC_WRITE
- Tables: client_publication_package_items, client_publication_packages, client_interest_requests
- Body fields detected: client_id, package_item_id, request_status, handled_at, handled_by, internal_notes, message
- Auth/gating markers: client_id, request_status, publish_to_client, needs_human_review, review_status, client_publish_status
- Recommendation: Primera candidata para Supabase Write Switch V1, pero requiere idempotencia, validación client_id/source_id y rollback.

SQL detected:

- `SELECT * FROM client_publication_package_items WHERE id = ? AND client_id = ? AND source_type = ?'`
- `SELECT * FROM client_publication_packages WHERE id = ?'`
- `SELECT * FROM client_interest_requests WHERE client_id = ? AND package_item_id = ? AND request_status = ?'`
- `Insert const requestId = generateId(`
- `INSERT INTO client_interest_requests (id, tenant_id, client_id, client_name, package_id, package_item_id, source_type, source_id, title, request_type, request_status, priority, message, created_at, updated_at, handled_at, handled_by, internal_notes`
- `SELECT * FROM client_interest_requests WHERE id = ?'`
- `UPDATE client_interest_requests SET request_status = ?, updated_at = ?, handled_at = ?, handled_by = ?, internal_notes = ? WHERE id = ? ``

### P0_manager_interest_request_status_update

- Matches: 1
- Risk: MEDIUM
- Tables: client_interest_requests, compliance_sectors
- Body fields detected: request_status, handled_at, handled_by, internal_notes
- Auth/gating markers: client_id, request_status
- Recommendation: Migrar con switch transaccional y validación previa.

SQL detected:

- `SELECT * FROM client_interest_requests WHERE id = ?'`
- `UPDATE client_interest_requests SET request_status = ?, updated_at = ?, handled_at = ?, handled_by = ?, internal_notes = ? WHERE id = ? ``
- `SELECT COUNT(*`
- `SELECT request_status, COUNT(*`
- `SELECT client_id, client_name, COUNT(*`
- `SELECT id, client_id, client_name, title, request_type, request_status, priority, message, created_at, updated_at, handled_at, handled_by FROM client_interest_requests ${baseWhere} ORDER BY created_at DESC LIMIT 10 ``
- `SELECT * FROM client_interest_requests WHERE 1=1'`
- `SELECT * FROM compliance_sectors ORDER BY sector_name ASC'`

### P0_manager_publication_package_publish

- Matches: 1
- Risk: MEDIUM
- Tables: client_publication_package_items, client_publication_logs, client_publication_packages, Alertas_Cumplimiento
- Body fields detected: confirm_publish, published_by, notes
- Auth/gating markers: client_id, publish_to_client, needs_human_review, review_status, client_publish_status
- Recommendation: Migrar con switch transaccional y validación previa.

SQL detected:

- `SELECT * FROM client_publication_package_items WHERE package_id = ? ORDER BY created_at ASC'`
- `SELECT * FROM client_publication_logs WHERE package_id = ? ORDER BY created_at DESC'`
- `SELECT * FROM client_publication_packages WHERE id = ?'`
- `SELECT id FROM client_publication_packages WHERE client_id = ? AND sector_key = ? AND package_type = ? AND id != ? AND package_status = 'published' AND review_status = 'approved' AND publish_to_client = 1 AND needs_human_review = 0 AND client_publish_status = ...`
- `UPDATE client_publication_packages SET package_status = 'published', review_status = 'approved', needs_human_review = 0, publish_to_client = 1, client_publish_status = 'published', approved_at = ?, approved_by = ?, published_at = ?, published_by = ?, updated_a...`
- `UPDATE client_publication_package_items SET review_status = 'approved', needs_human_review = 0, publish_to_client = 1, client_publish_status = 'published', updated_at = ? WHERE package_id = ? ``
- `INSERT INTO client_publication_logs (id, package_id, tenant_id, client_id, action, actor, notes, created_at`
- `SELECT count(*`
- `SELECT source_type, count(*`
- `SELECT * FROM client_publication_packages WHERE client_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND package_status = 'published' AND client_publish_status = 'published' ORDER BY published_at DESC"`
- `SELECT * FROM client_publication_package_items WHERE package_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 ORDER BY created_at ASC"`
- `SELECT * FROM client_publication_package_items WHERE client_id = ? AND source_type = 'compliance_obligation' AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 ...`
- `SELECT * FROM client_publication_package_items WHERE client_id = ? AND source_type = 'aid_item' AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 ORDER BY crea...`
- `UPDATE Alertas_Cumplimiento SET estado = ? WHERE id = ?'`

## Orden recomendado de migración

1. POST /api/portal/interest-requests
2. POST /api/manager/interest-requests/:id/status
3. POST /api/manager/publication-packages/:id/publish

## Condiciones antes de Write Switch V1

- Definir feature flag RADAR_WRITE_SOURCE=sqlite|supabase|dual_write.
- No tocar publicación hasta estabilizar solicitudes.
- Mantener rollback inmediato a SQLite.
- Validar en Preview antes de Production.
- No ejecutar mutaciones reales en auditoría.
