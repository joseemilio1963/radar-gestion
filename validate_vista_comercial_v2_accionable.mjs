import fs from 'node:fs';
import { execSync } from 'node:child_process';

const errors = [];

const read = (path) => {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch {
    errors.push(`No se puede leer ${path}`);
    return '';
  }
};

let branch = '';
try {
  branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
} catch {
  errors.push('No se pudo leer la rama actual');
}

const allowedBranches = ['main', 'vista-comercial-v2-accionable'];

if (!allowedBranches.includes(branch)) {
  errors.push(`Rama incorrecta: ${branch}`);
}

const app = read('./src/App.jsx');
const server = read('./server.js');

const requiredAppPatterns = [
  'ManagerLoginGate',
  '/api/auth/manager/login',
  '/api/auth/manager/logout',
  '/api/auth/manager/session',
  '/api/manager/commercial-dashboard',
  '/api/manager/interest-requests/',
  'Vista Comercial V2 accionable',
  'Contactada',
  'Gestionada',
  'Descartar',
  'Nota interna',
  'displayCommercialNote',
  'isTechnicalCommercialNote',
  'Secciones del gestor',
  'OfficialReferenceBlock',
  'Referencia legal',
  'Ver fuente oficial',
  'Referencia oficial pendiente',
  'function formatHumanLabel',
  "clinicas_privadas: 'Clínicas privadas'"
];

for (const pattern of requiredAppPatterns) {
  if (!app.includes(pattern)) {
    errors.push(`src/App.jsx no contiene: ${pattern}`);
  }
}

const requiredServerPatterns = [
  'LEFT JOIN client_publication_package_items i ON i.id = r.package_item_id',
  'legal_reference',
  'source_name',
  'source_url',
  'amount_summary',
  'deadline_label',
  'eligibility_summary',
  'summary: row.source_summary || null'
];

for (const pattern of requiredServerPatterns) {
  if (!server.includes(pattern)) {
    errors.push(`server.js no contiene: ${pattern}`);
  }
}

if (/\{item\.source_id\}/.test(app)) {
  errors.push('src/App.jsx sigue mostrando item.source_id directamente');
}

if (app.includes('Vista Comercial Avanzada')) {
  errors.push('src/App.jsx todavía contiene Vista Comercial Avanzada');
}

if (app.includes('GestiÃ') || app.includes('revisiÃ') || app.includes('InspecciÃ') || app.includes('CATEGORÃ')) {
  errors.push('src/App.jsx contiene restos de mojibake');
}

console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
