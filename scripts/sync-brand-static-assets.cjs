const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const brandConfigPath = path.join(rootDir, 'src', 'brandConfig.js');
const indexPath = path.join(rootDir, 'index.html');
const manifestPath = path.join(rootDir, 'public', 'manifest.json');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function extractString(source, key) {
  const pattern = new RegExp(`${key}:\\s*'([^']*)'`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Missing BRAND_CONFIG field: ${key}`);
  }
  return match[1];
}

function extractColor(source, key) {
  const pattern = new RegExp(`${key}:\\s*'([^']*)'`);
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Missing BRAND_CONFIG color: ${key}`);
  }
  return match[1];
}

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Pattern not found while updating ${label}`);
  }
  return source.replace(pattern, replacement);
}

const brandSource = read(brandConfigPath);

const appName = extractString(brandSource, 'appName');
const shortName = extractString(brandSource, 'shortName');
const description = extractString(brandSource, 'description');
const backgroundColor = extractColor(brandSource, 'background');
const themeColor = extractColor(brandSource, 'header');

let indexHtml = read(indexPath);

indexHtml = replaceRequired(
  indexHtml,
  /<title>[^<]*<\/title>/,
  `<title>${appName}</title>`,
  'index.html title'
);

indexHtml = replaceRequired(
  indexHtml,
  /<meta name="theme-color" content="[^"]*" \/>/,
  `<meta name="theme-color" content="${themeColor}" />`,
  'index.html theme-color'
);

indexHtml = replaceRequired(
  indexHtml,
  /<meta name="apple-mobile-web-app-title" content="[^"]*" \/>/,
  `<meta name="apple-mobile-web-app-title" content="${shortName}" />`,
  'index.html apple-mobile-web-app-title'
);

write(indexPath, indexHtml);

const manifest = JSON.parse(read(manifestPath));

manifest.name = appName;
manifest.short_name = shortName;
manifest.description = description;
manifest.background_color = backgroundColor;
manifest.theme_color = themeColor;

write(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log('SYNC_BRAND_STATIC_ASSETS_OK=True');
console.log(`APP_NAME=${appName}`);
console.log(`SHORT_NAME=${shortName}`);
console.log(`THEME_COLOR=${themeColor}`);
console.log(`BACKGROUND_COLOR=${backgroundColor}`);