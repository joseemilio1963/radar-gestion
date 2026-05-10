import fs from 'node:fs';

const errors = [];

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    errors.push('No se puede leer ' + file);
    return '';
  }
}

const server = read('server.js');
const app = read('src/App.jsx');

const requiredServerTokens = [
  '/api/auth/manager/login',
  '/api/auth/manager/session',
  '/api/auth/manager/logout',
  'node:crypto',
  'HttpOnly',
  'createHmac',
  'timingSafeEqual',
  'sha256Hex',
  'MANAGER_ACCESS_PIN_HASH_SHA256',
  'MANAGER_SESSION_SECRET',
  'rgv_manager_session',
  'MANAGER_AUTH_REQUIRED',
  'isProtectedManagerApiPath'
];

for (const token of requiredServerTokens) {
  if (!server.includes(token)) {
    errors.push('server.js no contiene: ' + token);
  }
}

const requiredAppTokens = [
  'ManagerLoginGate',
  '/api/auth/manager/login',
  '/api/auth/manager/logout',
  '/api/auth/manager/session',
  'managerAuthenticated',
  'authLoading',
  'authError',
  'type="password"',
  'onClick={handleManagerLogout}'
];

for (const token of requiredAppTokens) {
  if (!app.includes(token)) {
    errors.push('src/App.jsx no contiene: ' + token);
  }
}

if (/localStorage\s*\./.test(app)) {
  errors.push('src/App.jsx usa localStorage');
}

if (/sessionStorage\s*\./.test(app)) {
  errors.push('src/App.jsx usa sessionStorage');
}

if (/(PIN|pin|managerPin|accessPin)\s*[:=]\s*['"]\d{4,8}['"]/.test(app)) {
  errors.push('src/App.jsx parece contener un PIN numérico hardcodeado');
}

if (!fs.existsSync('dist/index.html')) {
  errors.push('No existe dist/index.html después del build');
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  errors
}, null, 2));

process.exit(errors.length === 0 ? 0 : 1);
