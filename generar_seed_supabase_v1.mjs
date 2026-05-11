import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const dbPath = './database.sqlite';
const outPath = './supabase/seeds/001_seed_demo_v1.sql';

if (!fs.existsSync(dbPath)) {
  console.error(JSON.stringify({ ok: false, error: 'No existe ./database.sqlite' }, null, 2));
  process.exit(1);
}

fs.mkdirSync('./supabase/seeds', { recursive: true });

const db = new DatabaseSync(dbPath, { readOnly: true });

const suspiciousRegex = /Ã|Â|â€|├|▒|║|┬/;

function normalizeText(value) {
  if (typeof value !== 'string') return value;

  return value
    .split('n┬║').join('n.º')
    .split('N┬║').join('N.º')
    .split('formaci├│n').join('formación')
    .split('Formaci├│n').join('Formación')
    .split('revisi├│n').join('revisión')
    .split('Revisi├│n').join('Revisión')
    .split('validaci├│n').join('validación')
    .split('Validaci├│n').join('Validación')
    .split('prevenci├│n').join('prevención')
    .split('Prevenci├│n').join('Prevención')
    .split('finalizaci├│n').join('finalización')
    .split('Finalizaci├│n').join('Finalización')
    .split('bonificaci├│n').join('bonificación')
    .split('Bonificaci├│n').join('Bonificación')
    .split('tutorizaci├│n').join('tutorización')
    .split('Tutorizaci├│n').join('Tutorización')
    .split('cuant├¡a').join('cuantía')
    .split('Cuant├¡a').join('Cuantía')
    .split('p├║blico').join('público')
    .split('P├║blico').join('Público')
    .split('Espa├▒a').join('España')
    .split('Aut├│nomos').join('Autónomos')
    .split('aut├│nomos').join('autónomos')
    .split('subvenci├│n').join('subvención')
    .split('Subvenci├│n').join('Subvención')
    .split('├║nicamente').join('únicamente')
    .split('art├¡culo').join('artículo')
    .split('Bolet├¡n').join('Boletín')
    .split('electr├│nica').join('electrónica')
    .split('administraci├│n').join('administración')
    .split('aprobaci├│n').join('aprobación')
    .split('n├║m.').join('núm.')
    .split('l├¡nea').join('línea')
    .split('espa├▒ol').join('español');
}

function normalizeRow(row) {
  const next = {};
  for (const [key, value] of Object.entries(row)) {
    next[key] = normalizeText(value);
  }
  return next;
}

function parseJsonValue(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(normalizeText(value));
  } catch {
    return value;
  }
}

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBool(value) {
  return Number(value) === 1 || value === true ? 'true' : 'false';
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === '') return 'null';
  const num = Number(value);
  return Number.isFinite(num) ? String(num) : 'null';
}

function sqlJson(value) {
  const parsed = parseJsonValue(value);
  if (parsed === null || parsed === undefined || parsed === '') return 'null';
  return `${sqlString(JSON.stringify(parsed))}::jsonb`;
}

function sqlTs(value) {
  if (!value) return 'null';
  return `${sqlString(value)}::timestamptz`;
}

function insertStatement(table, columns, rows, mapValue) {
  if (!rows.length) return '';

  const lines = [];

  lines.push(`insert into public.${table} (${columns.join(', ')}) values`);

  rows.forEach((row, index) => {
    const values = columns.map(col => mapValue(col, row));
    const suffix = index === rows.length - 1 ? '' : ',';
    lines.push(`  (${values.join(', ')})${suffix}`);
  });

  lines.push(`on conflict (id) do nothing;`);

  return lines.join('\n');
}

function selectAll(table) {
  const exists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(table);

  if (!exists) return [];

  return db.prepare(`SELECT * FROM "${table}"`).all().map(normalizeRow);
}

const userClientsRaw = selectAll('User_Clients');

const knownClientKeys = new Map([
  ['Transportes Levante SL', 'transportes_levante'],
  ['Clínica Dental Sonrisas', 'clinica_dental'],
  ['Inmobiliaria Turia', 'inmobiliaria_turia'],
  ['Industrias Metalúrgicas Turia', 'industrias_metalurgicas_turia']
]);

const knownSectorKeys = new Map([
  ['Transportes Levante SL', 'transporte'],
  ['Clínica Dental Sonrisas', 'clinicas_privadas'],
  ['Inmobiliaria Turia', 'oficinas'],
  ['Industrias Metalúrgicas Turia', 'metal']
]);

function slugClientName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/sl\b/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const userClients = userClientsRaw.map(row => ({
  ...row,
  client_key: knownClientKeys.get(row.nombre) || slugClientName(row.nombre),
  sector_key: knownSectorKeys.get(row.nombre) || null
}));

const tables = {
  user_clients: userClients,
  compliance_obligations: selectAll('compliance_obligations'),
  aid_items: selectAll('aid_items'),
  radar_items: selectAll('radar_items'),
  client_publication_packages: selectAll('client_publication_packages'),
  client_publication_package_items: selectAll('client_publication_package_items'),
  client_interest_requests: selectAll('client_interest_requests'),
  radar_documents: selectAll('radar_documents'),
  radar_review_logs: selectAll('radar_review_logs')
};

const sqlParts = [];

sqlParts.push(`-- Radar Gestión Valencia — Seed demo V1`);
sqlParts.push(`-- Generado desde SQLite local.`);
sqlParts.push(`-- No contiene claves ni secretos.`);
sqlParts.push(`-- Revisión obligatoria antes de ejecutar en Supabase.`);
sqlParts.push(``);
sqlParts.push(`begin;`);
sqlParts.push(``);

sqlParts.push(insertStatement(
  'user_clients',
  ['id', 'org_id', 'client_key', 'nombre', 'nif', 'email', 'cnae', 'sector_key', 'tiene_empleados', 'numero_empleados', 'fecha_creacion'],
  tables.user_clients,
  (col, row) => {
    if (col === 'id' || col === 'org_id' || col === 'numero_empleados') return sqlNumber(row[col]);
    if (col === 'tiene_empleados') return sqlBool(row[col]);
    if (col === 'fecha_creacion') return sqlTs(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'compliance_obligations',
  ['id', 'sector_key', 'title', 'summary', 'obligation_type', 'legal_reference', 'source_name', 'source_url', 'territory', 'risk_level', 'status', 'review_status', 'needs_human_review', 'publish_to_client', 'last_reviewed_at', 'tags_json', 'created_at', 'updated_at'],
  tables.compliance_obligations,
  (col, row) => {
    if (['needs_human_review', 'publish_to_client'].includes(col)) return sqlBool(row[col]);
    if (['last_reviewed_at', 'created_at', 'updated_at'].includes(col)) return sqlTs(row[col]);
    if (col === 'tags_json') return sqlJson(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'aid_items',
  ['id', 'aid_type', 'title', 'summary', 'source_name', 'source_url', 'official_reference', 'official_published_at', 'territory', 'territory_name', 'deadline_at', 'deadline_label', 'amount_summary', 'recommended_action', 'request_type', 'business_fit_score', 'match_confidence', 'affected_sectors_json', 'affected_tags_json', 'affected_cnaes_json', 'requirements_json', 'review_status', 'needs_human_review', 'publish_to_client', 'data_quality_warning', 'created_at', 'updated_at'],
  tables.aid_items,
  (col, row) => {
    if (['business_fit_score'].includes(col)) return sqlNumber(row[col]);
    if (['match_confidence'].includes(col)) return sqlNumber(row[col]);
    if (['needs_human_review', 'publish_to_client', 'data_quality_warning'].includes(col)) return sqlBool(row[col]);
    if (['official_published_at', 'deadline_at', 'created_at', 'updated_at'].includes(col)) return sqlTs(row[col]);
    if (['affected_sectors_json', 'affected_tags_json', 'affected_cnaes_json', 'requirements_json'].includes(col)) return sqlJson(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'radar_items',
  ['id', 'tenant_id', 'title', 'source_name', 'source_url', 'document_type', 'category', 'territory', 'published_at', 'review_status', 'needs_human_review', 'publish_to_client', 'created_at', 'updated_at'],
  tables.radar_items,
  (col, row) => {
    if (['needs_human_review', 'publish_to_client'].includes(col)) return sqlBool(row[col]);
    if (['published_at', 'created_at', 'updated_at'].includes(col)) return sqlTs(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'client_publication_packages',
  ['id', 'tenant_id', 'client_id', 'client_name', 'sector_key', 'package_type', 'title', 'summary', 'package_status', 'review_status', 'needs_human_review', 'publish_to_client', 'client_publish_status', 'data_quality_warning', 'total_items', 'total_compliance_items', 'total_aid_items', 'total_radar_items', 'created_at', 'updated_at', 'approved_at', 'approved_by', 'published_at', 'published_by', 'notes'],
  tables.client_publication_packages,
  (col, row) => {
    if (['needs_human_review', 'publish_to_client', 'data_quality_warning'].includes(col)) return sqlBool(row[col]);
    if (['total_items', 'total_compliance_items', 'total_aid_items', 'total_radar_items'].includes(col)) return sqlNumber(row[col]);
    if (['created_at', 'updated_at', 'approved_at', 'published_at'].includes(col)) return sqlTs(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'client_publication_package_items',
  ['id', 'package_id', 'tenant_id', 'client_id', 'source_type', 'source_id', 'sector_key', 'title', 'summary', 'item_type', 'obligation_type', 'request_type', 'risk_level', 'territory', 'source_name', 'source_url', 'legal_reference', 'amount_summary', 'deadline_label', 'eligibility_summary', 'tags_json', 'confidence_level', 'include_in_package', 'review_status', 'needs_human_review', 'publish_to_client', 'client_publish_status', 'data_quality_warning', 'display_order', 'created_at', 'updated_at'],
  tables.client_publication_package_items,
  (col, row) => {
    if (['include_in_package', 'needs_human_review', 'publish_to_client', 'data_quality_warning'].includes(col)) return sqlBool(row[col]);
    if (col === 'display_order') return sqlNumber(row[col]);
    if (['created_at', 'updated_at'].includes(col)) return sqlTs(row[col]);
    if (col === 'tags_json') return sqlJson(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'client_interest_requests',
  ['id', 'tenant_id', 'client_id', 'client_name', 'package_id', 'package_item_id', 'source_type', 'source_id', 'title', 'request_type', 'request_status', 'priority', 'message', 'created_at', 'updated_at', 'handled_at', 'handled_by', 'internal_notes'],
  tables.client_interest_requests,
  (col, row) => {
    if (['created_at', 'updated_at', 'handled_at'].includes(col)) return sqlTs(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'radar_documents',
  ['id', 'radar_item_id', 'raw_input_json', 'lorena_json', 'marc_json', 'quality_control_json', 'created_at'],
  tables.radar_documents,
  (col, row) => {
    if (col === 'created_at') return sqlTs(row[col]);
    if (['raw_input_json', 'lorena_json', 'marc_json', 'quality_control_json'].includes(col)) return sqlJson(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(insertStatement(
  'radar_review_logs',
  ['id', 'radar_item_id', 'action', 'actor', 'notes', 'created_at'],
  tables.radar_review_logs,
  (col, row) => {
    if (col === 'created_at') return sqlTs(row[col]);
    return sqlString(row[col]);
  }
));

sqlParts.push(``);
sqlParts.push(`commit;`);
sqlParts.push(``);

const sql = sqlParts.filter(Boolean).join('\n\n');

fs.writeFileSync(outPath, sql, 'utf8');

const remainingSuspicious = (sql.match(suspiciousRegex) || []).length;

const result = {
  ok: remainingSuspicious === 0,
  seed_path: outPath,
  counts: Object.fromEntries(Object.entries(tables).map(([key, rows]) => [key, rows.length])),
  remaining_suspicious_hits: remainingSuspicious,
  warnings: remainingSuspicious === 0 ? [] : ['El seed contiene caracteres sospechosos. Revisar antes de importar.']
};

db.close();

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
