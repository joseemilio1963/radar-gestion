import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const dbCandidates = [
  './database.sqlite',
  './data/database.sqlite',
  './db/database.sqlite',
  './sqlite/database.sqlite'
];

const existingDb = dbCandidates.find(path => fs.existsSync(path));

if (!existingDb) {
  console.log(JSON.stringify({
    ok: false,
    error: 'No se encontró database.sqlite en rutas candidatas.',
    checked: dbCandidates
  }, null, 2));
  process.exit(1);
}

const db = new DatabaseSync(existingDb, { readOnly: true });

const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
  ORDER BY name ASC
`).all();

const criticalTables = [
  'User_Clients',
  'clients',
  'client_publication_packages',
  'client_publication_package_items',
  'client_interest_requests',
  'compliance_obligations',
  'aid_items',
  'radar_items',
  'radar_documents',
  'radar_review_logs'
];

const result = {
  ok: true,
  db_path: existingDb,
  total_tables: tables.length,
  tables: [],
  critical_table_presence: {},
  recommended_migration_order: [],
  warnings: [],
  notes: [
    'Diagnóstico read-only. No modifica SQLite.',
    'Objetivo: preparar esquema SQL Supabase/Postgres, seed demo y políticas RLS.'
  ]
};

for (const table of criticalTables) {
  result.critical_table_presence[table] = tables.some(row => row.name === table);
}

for (const row of tables) {
  const tableName = row.name;

  let count = null;
  let columns = [];
  let indexes = [];
  let foreignKeys = [];
  let sample = [];

  try {
    count = db.prepare(`SELECT COUNT(*) AS total FROM "${tableName}"`).get().total;
  } catch (err) {
    result.warnings.push(`No se pudo contar tabla ${tableName}: ${err.message}`);
  }

  try {
    columns = db.prepare(`PRAGMA table_info("${tableName}")`).all().map(col => ({
      cid: col.cid,
      name: col.name,
      type: col.type,
      notnull: col.notnull,
      default_value: col.dflt_value,
      pk: col.pk
    }));
  } catch (err) {
    result.warnings.push(`No se pudo leer columnas de ${tableName}: ${err.message}`);
  }

  try {
    indexes = db.prepare(`PRAGMA index_list("${tableName}")`).all().map(idx => ({
      name: idx.name,
      unique: idx.unique,
      origin: idx.origin,
      partial: idx.partial
    }));
  } catch (err) {
    result.warnings.push(`No se pudo leer índices de ${tableName}: ${err.message}`);
  }

  try {
    foreignKeys = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all();
  } catch (err) {
    result.warnings.push(`No se pudo leer FKs de ${tableName}: ${err.message}`);
  }

  if (criticalTables.includes(tableName)) {
    try {
      sample = db.prepare(`SELECT * FROM "${tableName}" LIMIT 2`).all();
    } catch (err) {
      result.warnings.push(`No se pudo extraer muestra de ${tableName}: ${err.message}`);
    }
  }

  result.tables.push({
    name: tableName,
    count,
    columns,
    indexes,
    foreignKeys,
    sample
  });
}

const orderCandidates = [
  'User_Clients',
  'clients',
  'compliance_obligations',
  'aid_items',
  'radar_items',
  'client_publication_packages',
  'client_publication_package_items',
  'client_interest_requests',
  'radar_documents',
  'radar_review_logs'
];

result.recommended_migration_order = orderCandidates.filter(table => result.critical_table_presence[table]);

db.close();

console.log(JSON.stringify(result, null, 2));
