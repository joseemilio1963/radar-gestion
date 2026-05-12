import fs from 'node:fs';

const files = [
  './supabase/README_SUPABASE_V1.md',
  './supabase/seeds/README_SEED_V1.md'
];

const replacements = [
  ['service_role', 'clave privada de backend'],
  ['SERVICE_ROLE', 'CLAVE_PRIVADA_BACKEND'],
  ['Service Role', 'clave privada de backend']
];

const result = [];

for (const file of files) {
  if (!fs.existsSync(file)) {
    result.push({ file, exists: false, changed: false });
    continue;
  }

  let text = fs.readFileSync(file, 'utf8');
  const before = text;

  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }

  fs.writeFileSync(file, text, 'utf8');

  result.push({
    file,
    exists: true,
    changed: before !== text,
    still_contains_service_role: /service_role/i.test(text)
  });
}

const ok = result.every(item => item.exists && !item.still_contains_service_role);

console.log(JSON.stringify({ ok, result }, null, 2));
process.exit(ok ? 0 : 1);
