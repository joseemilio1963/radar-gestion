import fs from 'node:fs';
import { execSync } from 'node:child_process';

const errors = [];

const read = (path) => {
  try { return fs.readFileSync(path, 'utf8'); }
  catch { errors.push(`No se puede leer ${path}`); return ''; }
};

let branch = '';
try {
  branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
} catch {
  errors.push('No se pudo leer la rama actual');
}

if (branch !== 'vista-comercial-v2-accionable') {
  errors.push(`Rama incorrecta: ${branch}`);
}

const app = read('./src/App.jsx');
const server = read('./server.js');

[
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
  'mobile-manager-section',
  'OfficialReferenceBlock',
  'legal_reference',
  'source_name',
  'source_url'
].forEach(pattern => {
  if (!app.includes(pattern)) errors.push(`src/App.jsx no contiene: ${pattern}`);
});

[
  'LEFT JOIN client_publication_package_items i ON i.id = r.package_item_id',
  'legal_reference',
  'source_name',
  'source_url',
  'amount_summary',
  'deadline_label',
  'eligibility_summary'
].forEach(pattern => {
  if (!server.includes(pattern)) errors.push(`server.js no contiene: ${pattern}`);
});

// CHECK_V2_STABLE_MARKERS
if (!app.includes('mobile-manager-section')) {
  errors.push('No se detecta selector móvil de sección del gestor');
}

if (!app.includes('OfficialReferenceBlock')) {
  errors.push('No se detecta bloque de referencia oficial');
}

if (!app.includes('Ver fuente oficial')) {
  errors.push('No se detecta enlace/botón de fuente oficial');
}

if (!app.includes('Referencia legal')) {
  errors.push('No se detecta etiqueta de referencia legal');
}

if (!app.includes('Referencia oficial pendiente')) {
  errors.push('No se detecta aviso de referencia oficial pendiente');
}

if (/\{item\.source_id\}/.test(app)) {
  errors.push('src/App.jsx sigue mostrando item.source_id directamente');
}

console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
