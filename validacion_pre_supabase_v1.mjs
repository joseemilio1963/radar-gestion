import fs from 'node:fs';
import { execSync } from 'node:child_process';

const errors = [];
const warnings = [];

const files = {
  schema: './supabase/migrations/001_radar_schema_v1.sql',
  rls: './supabase/migrations/002_radar_rls_v1.sql',
  seed: './supabase/seeds/001_seed_demo_v1.sql'
};

function read(path) {
  if (!fs.existsSync(path)) {
    errors.push(`No existe ${path}`);
    return '';
  }
  return fs.readFileSync(path, 'utf8');
}

let branch = '';
try {
  branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
} catch {
  errors.push('No se pudo leer la rama actual.');
}

if (branch !== 'supabase-persistence-v1') {
  errors.push(`Rama incorrecta: ${branch}`);
}

const schema = read(files.schema);
const rls = read(files.rls);
const seed = read(files.seed);

const suspiciousRegex = /Ã|Â|â€|├|▒|║|┬/g;
const technicalRegex = /Validación automática|cambio a handled|panel gestor|Vista Comercial/g;

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

const suspicious = {
  schema: countMatches(schema, suspiciousRegex),
  rls: countMatches(rls, suspiciousRegex),
  seed: countMatches(seed, suspiciousRegex)
};

const technical = {
  schema: countMatches(schema, technicalRegex),
  rls: countMatches(rls, technicalRegex),
  seed: countMatches(seed, technicalRegex)
};

for (const [name, count] of Object.entries(suspicious)) {
  if (count > 0) errors.push(`${name} contiene mojibake: ${count} coincidencias`);
}

for (const [name, count] of Object.entries(technical)) {
  if (count > 0) errors.push(`${name} contiene textos técnicos: ${count} coincidencias`);
}

const requiredTables = [
  'user_clients',
  'compliance_obligations',
  'aid_items',
  'radar_items',
  'client_publication_packages',
  'client_publication_package_items',
  'client_interest_requests',
  'radar_documents',
  'radar_review_logs'
];

for (const table of requiredTables) {
  if (!schema.includes(`create table if not exists public.${table}`)) {
    errors.push(`Schema no crea tabla crítica: ${table}`);
  }

  if (!rls.includes(`alter table public.${table} enable row level security`)) {
    errors.push(`RLS no habilita row level security en: ${table}`);
  }
}

const requiredSeedInserts = [
  'insert into public.user_clients',
  'insert into public.compliance_obligations',
  'insert into public.aid_items',
  'insert into public.radar_items',
  'insert into public.client_publication_packages',
  'insert into public.client_publication_package_items',
  'insert into public.client_interest_requests',
  'insert into public.radar_documents',
  'insert into public.radar_review_logs'
];

for (const insert of requiredSeedInserts) {
  if (!seed.includes(insert)) {
    errors.push(`Seed no contiene: ${insert}`);
  }
}

const dangerousPatterns = [
  /\bdrop\s+table\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+database\b/i
];

for (const pattern of dangerousPatterns) {
  if (pattern.test(seed)) {
    errors.push(`Seed contiene patrón peligroso: ${pattern}`);
  }
}

if (!seed.includes('begin;')) errors.push('Seed no contiene begin;');
if (!seed.includes('commit;')) errors.push('Seed no contiene commit;');

if (!schema.includes('client_key text')) {
  errors.push('Schema user_clients no contiene client_key text.');
}

if (!schema.includes('sector_key text')) {
  errors.push('Schema no contiene sector_key text.');
}

if (!schema.includes('jsonb')) {
  errors.push('Schema no contiene campos jsonb.');
}

if (!schema.includes('on delete cascade')) {
  warnings.push('No se detecta on delete cascade en schema. Revisar si es intencionado.');
}

if (!seed.includes('Clínica Dental Sonrisas')) {
  errors.push('Seed no contiene Clínica Dental Sonrisas correctamente codificado.');
}

if (!seed.includes('Industrias Metalúrgicas Turia')) {
  errors.push('Seed no contiene Industrias Metalúrgicas Turia correctamente codificado.');
}

if (!seed.includes('formación')) {
  errors.push('Seed no contiene formación correctamente codificado.');
}

if (!seed.includes('revisión')) {
  errors.push('Seed no contiene revisión correctamente codificado.');
}

const numeroFormats = {
  n_punto_ord: seed.includes('n.º'),
  n_ord: seed.includes('nº'),
  numero_texto: seed.toLowerCase().includes('numero') || seed.toLowerCase().includes('número')
};

if (!numeroFormats.n_punto_ord && !numeroFormats.n_ord && !numeroFormats.numero_texto) {
  warnings.push('No se detectó formato de número normativo n.º/nº/número. No bloqueante.');
}

const insertCounts = {};
for (const table of requiredTables) {
  const marker = `insert into public.${table}`;
  insertCounts[table] = seed.includes(marker) ? 1 : 0;
}

const result = {
  ok: errors.length === 0,
  branch,
  files,
  file_sizes: {
    schema: Buffer.byteLength(schema, 'utf8'),
    rls: Buffer.byteLength(rls, 'utf8'),
    seed: Buffer.byteLength(seed, 'utf8')
  },
  suspicious,
  technical,
  numeroFormats,
  insertCounts,
  errors,
  warnings
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
