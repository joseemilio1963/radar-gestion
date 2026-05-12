import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const dbPath = './database.sqlite';

if (!fs.existsSync(dbPath)) {
  console.log(JSON.stringify({
    ok: false,
    error: 'No existe ./database.sqlite'
  }, null, 2));
  process.exit(1);
}

const db = new DatabaseSync(dbPath, { readOnly: true });

const targetTables = [
  'User_Clients',
  'compliance_obligations',
  'aid_items',
  'radar_items',
  'client_publication_packages',
  'client_publication_package_items',
  'client_interest_requests',
  'radar_documents',
  'radar_review_logs'
];

const suspiciousRegex = /Ã|Â|â€|├|▒|║|¡|¢|£|¤|¥|¦|§|¨|©|ª|«|¬|®|¯|°|±|²|³|´|µ|¶|·|¸|¹|º|»|¼|½|¾|¿/;

const result = {
  ok: true,
  db_path: dbPath,
  scanned_tables: [],
  total_suspicious_cells: 0,
  recommendation: null,
  notes: [
    'Diagnóstico read-only. No modifica SQLite.',
    'Si hay mojibake real, el seed debe normalizar textos antes de cargar a Supabase.'
  ]
};

for (const table of targetTables) {
  const exists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(table);

  if (!exists) {
    result.scanned_tables.push({
      table,
      exists: false,
      suspicious_cells: 0,
      samples: []
    });
    continue;
  }

  const columns = db.prepare(`PRAGMA table_info("${table}")`).all();
  const textColumns = columns
    .filter(col => String(col.type || '').toUpperCase().includes('TEXT') || String(col.type || '').toUpperCase().includes('DATETIME') || String(col.type || '').toUpperCase().includes('DATE'))
    .map(col => col.name);

  const rows = db.prepare(`SELECT * FROM "${table}"`).all();

  const tableResult = {
    table,
    exists: true,
    rows: rows.length,
    text_columns: textColumns,
    suspicious_cells: 0,
    samples: []
  };

  for (const row of rows) {
    const rowId = row.id ?? row.client_id ?? null;

    for (const col of textColumns) {
      const value = row[col];

      if (typeof value === 'string' && suspiciousRegex.test(value)) {
        tableResult.suspicious_cells += 1;
        result.total_suspicious_cells += 1;

        if (tableResult.samples.length < 8) {
          tableResult.samples.push({
            id: rowId,
            column: col,
            value: value.length > 220 ? `${value.slice(0, 220)}...` : value
          });
        }
      }
    }
  }

  result.scanned_tables.push(tableResult);
}

db.close();

result.recommendation = result.total_suspicious_cells > 0
  ? 'Detectado posible mojibake real en SQLite. Generar seed con normalización controlada y revisar muestras antes de importar a Supabase.'
  : 'No se detecta mojibake real en campos críticos. Se puede generar seed directo con transformaciones de tipos.';

console.log(JSON.stringify(result, null, 2));
