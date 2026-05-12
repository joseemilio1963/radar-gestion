import fs from 'node:fs';
import path from 'node:path';

const roots = [
  './supabase',
  './diagnostico_sqlite_para_supabase.mjs',
  './diagnostico_mojibake_sqlite_supabase.mjs',
  './generar_seed_supabase_v1.mjs',
  './sanear_seed_supabase_v1_node.mjs',
  './validacion_pre_supabase_v1.mjs'
];

const suspiciousPatterns = [
  { name: 'service_role', regex: /service[_-]?role/i },
  { name: 'private_key', regex: /private[_-]?key/i },
  { name: 'jwt_secret', regex: /jwt[_-]?secret/i },
  { name: 'password_assignment', regex: /\bpassword\s*[:=]/i },
  { name: 'api_key_assignment', regex: /\bapi[_-]?key\s*[:=]/i },
  { name: 'bearer_token', regex: /bearer\s+[a-z0-9._-]{20,}/i },
  { name: 'openai_key_like', regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'supabase_jwt_like', regex: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/ }
];

function listFiles(target) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  const out = [];
  for (const entry of fs.readdirSync(target)) {
    const full = path.join(target, entry);
    const childStat = fs.statSync(full);
    if (childStat.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const files = roots.flatMap(listFiles).filter(file =>
  /\.(sql|md|mjs|js|json|txt)$/i.test(file)
);

const findings = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');

  for (const pattern of suspiciousPatterns) {
    if (pattern.regex.test(text)) {
      findings.push({
        file,
        pattern: pattern.name
      });
    }
  }
}

const result = {
  ok: findings.length === 0,
  scanned_files: files.length,
  findings
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
