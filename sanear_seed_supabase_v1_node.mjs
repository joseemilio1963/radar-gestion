import fs from 'node:fs';

const seedPath = './supabase/seeds/001_seed_demo_v1.sql';

if (!fs.existsSync(seedPath)) {
  console.log(JSON.stringify({
    ok: false,
    error: `No existe ${seedPath}`
  }, null, 2));
  process.exit(1);
}

let sql = fs.readFileSync(seedPath, 'utf8');
const before = sql;

const technicalTexts = [
  'Validación automática: solicitud de prueba idempotente.',
  'Validación automática de cambio a handled',
  'Solicitud marcada como gestionada desde panel gestor.',
  'Cliente marcado como contactado desde panel gestor.',
  'Solicitud marcada como gestionada desde Vista Comercial.',
  'Cliente marcado como contactado desde Vista Comercial.',
  'Solicitud descartada desde Vista Comercial.'
];

for (const text of technicalTexts) {
  const quoted = `'${text.replace(/'/g, "''")}'`;
  sql = sql.split(quoted).join('null');
}

fs.writeFileSync(seedPath, sql, 'utf8');

const suspiciousRegex = /Ã|Â|â€|├|▒|║|┬/g;
const technicalRegex = /Validación automática|cambio a handled|panel gestor|Vista Comercial/g;

const suspiciousMatches = [...sql.matchAll(suspiciousRegex)].map(match => ({
  index: match.index,
  char: match[0],
  context: sql.slice(Math.max(0, match.index - 80), match.index + 120)
}));

const technicalMatches = [...sql.matchAll(technicalRegex)].map(match => ({
  index: match.index,
  value: match[0],
  context: sql.slice(Math.max(0, match.index - 80), match.index + 120)
}));

const checks = {
  ok: suspiciousMatches.length === 0 && technicalMatches.length === 0,
  seed_path: seedPath,
  changed_by_sanitizer: before !== sql,
  file_size_bytes: Buffer.byteLength(sql, 'utf8'),
  suspicious_hits: suspiciousMatches.length,
  technical_hits: technicalMatches.length,
  sample_spanish_texts_present: {
    gestion: sql.includes('Gestión'),
    clinica: sql.includes('Clínica Dental Sonrisas'),
    formacion: sql.includes('formación'),
    revision: sql.includes('revisión'),
    numero_abbrev: sql.includes('n.º')
  },
  suspicious_samples: suspiciousMatches.slice(0, 5),
  technical_samples: technicalMatches.slice(0, 5)
};

console.log(JSON.stringify(checks, null, 2));
process.exit(checks.ok ? 0 : 1);
