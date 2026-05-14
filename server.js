import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const BUNDLED_DB_PATH = path.join(__dirname, 'database.sqlite');
const RUNTIME_DB_PATH = process.env.VERCEL ? path.join('/tmp', 'database.sqlite') : BUNDLED_DB_PATH;

if (process.env.VERCEL && fs.existsSync(BUNDLED_DB_PATH) && !fs.existsSync(RUNTIME_DB_PATH)) {
    fs.copyFileSync(BUNDLED_DB_PATH, RUNTIME_DB_PATH);
}

const DB_PATH = RUNTIME_DB_PATH;

// --- Supabase Read-Only Backend Helpers V1 ---
const SUPABASE_READONLY_TABLES = [
    { logical_name: 'user_clients', supabase_table: 'user_clients', sqlite_table: 'User_Clients' },
    { logical_name: 'compliance_obligations', supabase_table: 'compliance_obligations', sqlite_table: 'compliance_obligations' },
    { logical_name: 'aid_items', supabase_table: 'aid_items', sqlite_table: 'aid_items' },
    { logical_name: 'radar_items', supabase_table: 'radar_items', sqlite_table: 'radar_items' },
    { logical_name: 'client_publication_packages', supabase_table: 'client_publication_packages', sqlite_table: 'client_publication_packages' },
    { logical_name: 'client_publication_package_items', supabase_table: 'client_publication_package_items', sqlite_table: 'client_publication_package_items' },
    { logical_name: 'client_interest_requests', supabase_table: 'client_interest_requests', sqlite_table: 'client_interest_requests' },
    { logical_name: 'radar_documents', supabase_table: 'radar_documents', sqlite_table: 'radar_documents' },
    { logical_name: 'radar_review_logs', supabase_table: 'radar_review_logs', sqlite_table: 'radar_review_logs' }
];

let supabaseReadonlyClient = null;

function isSupabaseReadonlyEnabled() {
    return String(process.env.SUPABASE_READONLY_ENABLED || '').toLowerCase() === 'true';
}

function getSupabaseReadonlyEnvStatus() {
    const urlPresent = Boolean(process.env.SUPABASE_URL);
    const keyPresent = Boolean(process.env.SUPABASE_SERVER_KEY);
    const enabled = isSupabaseReadonlyEnabled();

    return {
        enabled,
        configured: enabled && urlPresent && keyPresent,
        url_present: urlPresent,
        key_present: keyPresent,
        key_is_server_side_only: true
    };
}

function getSupabaseReadonlyClient() {
    const envStatus = getSupabaseReadonlyEnvStatus();

    if (!envStatus.enabled) {
        return {
            ok: false,
            error_code: 'SUPABASE_READONLY_DISABLED',
            env_status: envStatus
        };
    }

    if (!envStatus.configured) {
        return {
            ok: false,
            error_code: 'SUPABASE_READONLY_ENV_MISSING',
            env_status: envStatus
        };
    }

    if (!supabaseReadonlyClient) {
        supabaseReadonlyClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVER_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );
    }

    return {
        ok: true,
        client: supabaseReadonlyClient,
        env_status: envStatus
    };
}

async function getSupabaseReadonlyCounts() {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return clientResult;
    }

    const counts = [];

    for (const table of SUPABASE_READONLY_TABLES) {
        const { count, error } = await clientResult.client
            .from(table.supabase_table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_COUNT_ERROR',
                table: table.supabase_table,
                message: error.message,
                env_status: clientResult.env_status
            };
        }

        counts.push({
            logical_name: table.logical_name,
            supabase_table: table.supabase_table,
            count: count ?? 0
        });
    }

    return {
        ok: true,
        env_status: clientResult.env_status,
        counts
    };
}

function getSqliteReferenceCounts() {
    const db = new DatabaseSync(DB_PATH);

    try {
        return {
            ok: true,
            db_path: DB_PATH,
            counts: SUPABASE_READONLY_TABLES.map(table => {
                const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table.sqlite_table}`).get();
                return {
                    logical_name: table.logical_name,
                    sqlite_table: table.sqlite_table,
                    count: Number(row?.total || 0)
                };
            })
        };
    } finally {
        try { db.close(); } catch (e) {}
    }
}


// --- Helper Functions ---
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function parseJsonSafe(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(Buffer.from(body, 'utf8'));
}

// --- MARC MRK Renderer ---
function marcFieldsToMrk(marcFieldsOrderJson, marcFieldsJson, field008ComponentsJson) {
    let order = [];
    let fields = [];
    let field008 = {};
    
    try { order = JSON.parse(marcFieldsOrderJson) || []; } catch(e){}
    try { fields = JSON.parse(marcFieldsJson) || []; } catch(e){}
    try { field008 = JSON.parse(field008ComponentsJson) || {}; } catch(e){}

    let mrkLines = [];

    for (const fieldId of order) {
        const field = fields.find(f => f.field_id === fieldId);
        if (!field) continue;

        const tag = String(field.tag).padStart(3, '0');

        if (tag === 'LDR' || tag === '001' || tag === '005') {
            mrkLines.push(`=${tag}  ${field.value || ''}`);
        } else if (tag === '008') {
            const gen_date = field008.generation_date_yymmdd || '      ';
            const type_date = field008.type_of_date || 's';
            const pub_year = field008.publication_year || '    ';
            const second_blank_count = parseInt(field008.second_date_blank_count) || 0;
            const place_code = field008.place_code || '  ';
            const place_trail = field008.place_trailing_blank === true ? ' ' : '';
            const middle_blank_count = parseInt(field008.middle_blank_count) || 0;
            const lang = field008.language || '   ';
            const source = field008.source || 'd';

            const line008 = gen_date + type_date + pub_year + ' '.repeat(Math.max(0, second_blank_count)) + place_code + place_trail + ' '.repeat(Math.max(0, middle_blank_count)) + lang + ' ' + source;
            mrkLines.push(`=008  ${line008}`);
        } else {
            let ind1 = field.ind1 || 'blank';
            let ind2 = field.ind2 || 'blank';
            
            let ind1_rendered = ind1 === 'blank' ? '\\' : String(ind1);
            let ind2_rendered = ind2 === 'blank' ? '\\' : String(ind2);

            let subfieldsStr = '';
            if (Array.isArray(field.subfields)) {
                for (const sub of field.subfields) {
                    subfieldsStr += `$${sub.code}${sub.value || ''}`;
                }
            }

            mrkLines.push(`=${tag}  ${ind1_rendered}${ind2_rendered}${subfieldsStr}`);
        }
    }

    return mrkLines.join('\n');
}

// --- Init Radar Tables ---
function initRadarTables() {
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS radar_items (
            id TEXT PRIMARY KEY,
            tenant_id TEXT,
            title TEXT,
            source_name TEXT,
            source_url TEXT,
            document_type TEXT,
            category TEXT,
            territory TEXT,
            published_at TEXT,
            review_status TEXT,
            needs_human_review INTEGER,
            publish_to_client INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS radar_documents (
            id TEXT PRIMARY KEY,
            radar_item_id TEXT,
            raw_input_json TEXT,
            lorena_json TEXT,
            marc_json TEXT,
            quality_control_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS radar_marc_records (
            id TEXT PRIMARY KEY,
            radar_item_id TEXT,
            record_id TEXT,
            marc_fields_order_json TEXT,
            marc_fields_json TEXT,
            field_008_components_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS radar_exports (
            id TEXT PRIMARY KEY,
            radar_item_id TEXT,
            mrk_filename TEXT,
            txt_filename TEXT,
            rendering_method TEXT,
            download_ready INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS radar_review_logs (
            id TEXT PRIMARY KEY,
            radar_item_id TEXT,
            action TEXT,
            actor TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    db.close();
}
initRadarTables();

function initComplianceTables() {
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS compliance_sectors (
            id TEXT PRIMARY KEY,
            sector_key TEXT UNIQUE,
            sector_name TEXT,
            description TEXT,
            active INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS compliance_obligations (
            id TEXT PRIMARY KEY,
            sector_key TEXT,
            title TEXT,
            summary TEXT,
            obligation_type TEXT,
            legal_reference TEXT,
            source_name TEXT,
            source_url TEXT,
            territory TEXT,
            risk_level TEXT,
            status TEXT,
            review_status TEXT,
            needs_human_review INTEGER,
            publish_to_client INTEGER,
            last_reviewed_at TEXT,
            tags_json TEXT,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS compliance_sources (
            id TEXT PRIMARY KEY,
            obligation_id TEXT,
            source_name TEXT,
            source_url TEXT,
            source_type TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS compliance_review_logs (
            id TEXT PRIMARY KEY,
            obligation_id TEXT,
            action TEXT,
            actor TEXT,
            notes TEXT,
            created_at TEXT
        );
    `);
    db.close();
}

function seedComplianceSectorsIfEmpty() {
    const db = new DatabaseSync(DB_PATH);
    const count = db.prepare('SELECT COUNT(*) as c FROM compliance_sectors').get().c;
    if (count === 0) {
        const sectors = [
            { key: 'hosteleria', name: 'Hostelería' },
            { key: 'comercio', name: 'Comercio' },
            { key: 'metal', name: 'Metal' },
            { key: 'talleres', name: 'Talleres' },
            { key: 'oficinas', name: 'Oficinas' },
            { key: 'construccion', name: 'Construcción' },
            { key: 'peluqueria_estetica', name: 'Peluquería y Estética' },
            { key: 'transporte', name: 'Transporte' },
            { key: 'alimentacion', name: 'Alimentación' },
            { key: 'clinicas_privadas', name: 'Clínicas Privadas' }
        ];
        const stmt = db.prepare('INSERT INTO compliance_sectors (id, sector_key, sector_name, active, created_at, updated_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)');
        for (const s of sectors) {
            stmt.run(generateId(), s.key, s.name);
        }
    }
    db.close();
}

initComplianceTables();
seedComplianceSectorsIfEmpty();

function initAidTables() {
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS aid_items (
            id TEXT PRIMARY KEY,
            aid_type TEXT,
            title TEXT,
            summary TEXT,
            source_name TEXT,
            source_url TEXT,
            official_reference TEXT,
            official_published_at TEXT,
            territory TEXT,
            territory_name TEXT,
            deadline_at TEXT,
            deadline_label TEXT,
            amount_summary TEXT,
            recommended_action TEXT,
            request_type TEXT,
            business_fit_score INTEGER,
            match_confidence REAL,
            affected_sectors_json TEXT,
            affected_tags_json TEXT,
            affected_cnaes_json TEXT,
            requirements_json TEXT,
            review_status TEXT,
            needs_human_review INTEGER,
            publish_to_client INTEGER,
            data_quality_warning INTEGER,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS aid_sources (
            id TEXT PRIMARY KEY,
            aid_item_id TEXT,
            source_name TEXT,
            source_url TEXT,
            source_type TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS aid_review_logs (
            id TEXT PRIMARY KEY,
            aid_item_id TEXT,
            action TEXT,
            actor TEXT,
            notes TEXT,
            created_at TEXT
        );
    `);
    db.close();
}
initAidTables();


function initPublicationTables() {
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS client_publication_packages (
            id TEXT PRIMARY KEY,
            tenant_id TEXT,
            client_id TEXT,
            client_name TEXT,
            sector_key TEXT,
            package_type TEXT,
            title TEXT,
            summary TEXT,
            package_status TEXT,
            review_status TEXT,
            needs_human_review INTEGER,
            publish_to_client INTEGER,
            client_publish_status TEXT,
            data_quality_warning INTEGER,
            total_items INTEGER,
            total_compliance_items INTEGER,
            total_aid_items INTEGER,
            total_radar_items INTEGER,
            created_at TEXT,
            updated_at TEXT,
            approved_at TEXT,
            approved_by TEXT,
            published_at TEXT,
            published_by TEXT,
            notes TEXT
        );
        CREATE TABLE IF NOT EXISTS client_publication_package_items (
            id TEXT PRIMARY KEY,
            package_id TEXT,
            tenant_id TEXT,
            client_id TEXT,
            source_type TEXT,
            source_id TEXT,
            sector_key TEXT,
            title TEXT,
            summary TEXT,
            item_type TEXT,
            obligation_type TEXT,
            request_type TEXT,
            risk_level TEXT,
            territory TEXT,
            source_name TEXT,
            source_url TEXT,
            legal_reference TEXT,
            amount_summary TEXT,
            deadline_label TEXT,
            eligibility_summary TEXT,
            tags_json TEXT,
            confidence_level TEXT,
            include_in_package INTEGER,
            review_status TEXT,
            needs_human_review INTEGER,
            publish_to_client INTEGER,
            client_publish_status TEXT,
            data_quality_warning INTEGER,
            display_order INTEGER,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS client_publication_logs (
            id TEXT PRIMARY KEY,
            package_id TEXT,
            item_id TEXT,
            tenant_id TEXT,
            client_id TEXT,
            action TEXT,
            actor TEXT,
            notes TEXT,
            created_at TEXT
        );
    `);
    db.close();
}
initPublicationTables();

function initInterestRequestsTables() {
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS client_interest_requests (
            id TEXT PRIMARY KEY,
            tenant_id TEXT,
            client_id TEXT,
            client_name TEXT,
            package_id TEXT,
            package_item_id TEXT,
            source_type TEXT,
            source_id TEXT,
            title TEXT,
            request_type TEXT,
            request_status TEXT,
            priority TEXT,
            message TEXT,
            created_at TEXT,
            updated_at TEXT,
            handled_at TEXT,
            handled_by TEXT,
            internal_notes TEXT
        );
    `);
    db.close();
}
initInterestRequestsTables();

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
};

const DEMO_CLIENTS = [
    {
        id: 'transportes_levante',
        name: 'Transportes Levante SL',
        sector: 'Transporte de mercancías (CNAE 4941)',
        sector_key: 'transporte',
        employees: 45,
        globalStatus: 'yellow',
        alertsCount: 2,
        aidsCount: 1,
        complianceItems: [
            { id: 'c1', title: 'Registro de Jornada', status: 'ok', date: 'Vigente' },
            { id: 'c2', title: 'Registro Retributivo', status: 'warning', date: 'Pendiente actualización anual' },
            { id: 'c3', title: 'Protocolo Prevención Acoso', status: 'ok', date: 'Vigente' },
            { id: 'c4', title: 'Prevención Riesgos Laborales', status: 'ok', date: 'Vigente' },
            { id: 'c5', title: 'Control de Tacógrafo de Flota', status: 'warning', date: 'Requiere revisión mensual' }
        ],
        aidsItems: [
            { id: 'a1', title: 'Kit Digital Nivel III', type: 'Subvención', status: 'Solicitada', deadline: '2026-10-31', desc: 'Subvención a fondo perdido para digitalizar procesos de logística y facturación.' }
        ],
        observations: 'Empresa en crecimiento. Requiere atención a los tiempos de descanso de conductores y registro retributivo.'
    },
    {
        id: 'clinica_dental',
        name: 'Clínica Dental',
        sector: 'Actividades odontológicas (CNAE 8623)',
        sector_key: 'clinicas_privadas',
        employees: 8,
        globalStatus: 'green',
        alertsCount: 0,
        aidsCount: 1,
        complianceItems: [
            { id: 'c6', title: 'Protección de Datos (RGPD) Sanitario', status: 'ok', date: 'Vigente' },
            { id: 'c7', title: 'Gestión de Residuos Biosanitarios', status: 'ok', date: 'Vigente' },
            { id: 'c8', title: 'Licencia de Instalación de Rayos X', status: 'ok', date: 'Válida' }
        ],
        aidsItems: [
            { id: 'a2', title: 'Modernización Tecnológica Dental', type: 'Ayuda', status: 'Abierta', deadline: 'Sin fecha límite', desc: 'Ayuda para renovación de equipos y digitalización de gabinetes.' }
        ],
        observations: 'Cumplimiento normativo excelente. Focalizar esfuerzos en ayudas de digitalización e innovación.'
    }
];

function normalizeStableKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function getStableClientIdFromUserClient(row) {
    const explicitMap = {
        1: 'transportes_levante',
        2: 'clinica_dental',
        3: 'inmobiliaria_turia',
        4: 'industrias_metalurgicas_turia'
    };

    if (explicitMap[row.id]) {
        return explicitMap[row.id];
    }

    return normalizeStableKey(row.nombre);
}

function mapCnaeToSectorKey(cnae) {
    const value = String(cnae || '').trim();

    if (value.startsWith('49')) return 'transporte';
    if (value.startsWith('86')) return 'clinicas_privadas';
    if (value.startsWith('68')) return 'oficinas';
    if (value.startsWith('24') || value.startsWith('25')) return 'metal';

    return 'oficinas';
}

function getSectorLabelFromKey(sectorKey) {
    const labels = {
        transporte: 'Transporte',
        clinicas_privadas: 'Clinicas Privadas',
        oficinas: 'Oficinas',
        metal: 'Metal',
        comercio: 'Comercio',
        hosteleria: 'Hosteleria',
        alimentacion: 'Alimentacion',
        construccion: 'Construccion',
        talleres: 'Talleres',
        peluqueria_estetica: 'Peluqueria y Estetica'
    };

    return labels[sectorKey] || sectorKey || 'Sector pendiente';
}

function getClientCatalog() {
    let db;

    try {
        db = new DatabaseSync(DB_PATH);

        const rows = db.prepare(`
            SELECT
                id,
                org_id,
                nombre,
                nif,
                email,
                cnae,
                tiene_empleados,
                numero_empleados,
                fecha_creacion
            FROM User_Clients
            ORDER BY id ASC
        `).all();

        db.close();

        if (!rows || rows.length === 0) {
            return DEMO_CLIENTS;
        }

        const demoById = new Map(DEMO_CLIENTS.map(client => [client.id, client]));

        return rows.map(row => {
            const stableId = getStableClientIdFromUserClient(row);
            const demoClient = demoById.get(stableId);
            const sectorKey = mapCnaeToSectorKey(row.cnae);
            const sectorLabel = getSectorLabelFromKey(sectorKey);
            const employees = Number(row.numero_empleados || 0);

            return {
                id: stableId,
                source_table: 'User_Clients',
                source_numeric_id: row.id,
                org_id: row.org_id,
                name: row.nombre,
                nif: row.nif,
                email: row.email,
                cnae: row.cnae,
                sector: row.cnae ? `${sectorLabel} (CNAE ${row.cnae})` : sectorLabel,
                sector_key: sectorKey,
                employees,
                globalStatus: demoClient?.globalStatus || 'green',
                alertsCount: demoClient?.alertsCount || 0,
                aidsCount: demoClient?.aidsCount || 0,
                complianceItems: demoClient?.complianceItems || [],
                aidsItems: demoClient?.aidsItems || [],
                observations: demoClient?.observations || `Cliente importado desde User_Clients. CNAE: ${row.cnae || 'sin CNAE informado'}.`
            };
        });

    } catch (error) {
        if (db) {
            try { db.close(); } catch {}
        }

        console.error('getClientCatalog fallback to DEMO_CLIENTS:', error.message);
        return DEMO_CLIENTS;
    }
}

// --- Supabase Read Services V2: clients compare ---
function mapUserClientRowToClientCatalogShape(row, sourceTableName) {
    const stableId = row.client_key || getStableClientIdFromUserClient(row);
    const demoById = new Map(DEMO_CLIENTS.map(client => [client.id, client]));
    const demoClient = demoById.get(stableId);
    const sectorKey = row.sector_key || mapCnaeToSectorKey(row.cnae);
    const sectorLabel = getSectorLabelFromKey(sectorKey);
    const employees = Number(row.numero_empleados || 0);

    return {
        id: stableId,
        source_table: sourceTableName,
        source_numeric_id: row.id,
        org_id: row.org_id,
        name: row.nombre,
        nif: row.nif,
        email: row.email,
        cnae: row.cnae,
        sector: row.cnae ? String(sectorLabel) + ' (CNAE ' + row.cnae + ')' : sectorLabel,
        sector_key: sectorKey,
        employees,
        globalStatus: demoClient?.globalStatus || 'green',
        alertsCount: demoClient?.alertsCount || 0,
        aidsCount: demoClient?.aidsCount || 0,
        complianceItems: demoClient?.complianceItems || [],
        aidsItems: demoClient?.aidsItems || [],
        observations: demoClient?.observations || ('Cliente importado desde ' + sourceTableName + '. CNAE: ' + (row.cnae || 'sin CNAE informado') + '.')
    };
}

function normalizeClientForReadServicesCompare(client) {
    return {
        id: client.id,
        name: client.name,
        org_id: Number(client.org_id || 0),
        cnae: client.cnae || null,
        sector_key: client.sector_key || null,
        employees: Number(client.employees || 0)
    };
}

function sortClientsForReadServicesCompare(clients) {
    return [...clients].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

async function getSupabaseReadServicesClientsCatalog() {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return clientResult;
    }

    const { data, error } = await clientResult.client
        .from('user_clients')
        .select('id, org_id, client_key, nombre, nif, email, cnae, sector_key, tiene_empleados, numero_empleados, fecha_creacion')
        .order('id', { ascending: true });

    if (error) {
        return {
            ok: false,
            error_code: 'SUPABASE_READ_SERVICES_CLIENTS_ERROR',
            message: error.message,
            env_status: clientResult.env_status
        };
    }

    return {
        ok: true,
        env_status: clientResult.env_status,
        clients: (data || []).map(row => mapUserClientRowToClientCatalogShape(row, 'user_clients'))
    };
}

function compareReadServicesClients(sqliteClients, supabaseClients) {
    const sqliteNormalized = sortClientsForReadServicesCompare(sqliteClients.map(normalizeClientForReadServicesCompare));
    const supabaseNormalized = sortClientsForReadServicesCompare(supabaseClients.map(normalizeClientForReadServicesCompare));

    const sqliteIds = sqliteNormalized.map(client => client.id);
    const supabaseIds = supabaseNormalized.map(client => client.id);

    const sqliteById = new Map(sqliteNormalized.map(client => [client.id, client]));
    const supabaseById = new Map(supabaseNormalized.map(client => [client.id, client]));

    const missing_in_supabase = sqliteIds.filter(id => !supabaseById.has(id));
    const extra_in_supabase = supabaseIds.filter(id => !sqliteById.has(id));

    const field_mismatches = [];

    for (const id of sqliteIds) {
        if (!supabaseById.has(id)) continue;

        const sqliteClient = sqliteById.get(id);
        const supabaseClient = supabaseById.get(id);

        for (const field of ['name', 'org_id', 'cnae', 'sector_key', 'employees']) {
            if (String(sqliteClient[field] ?? '') !== String(supabaseClient[field] ?? '')) {
                field_mismatches.push({
                    id,
                    field,
                    sqlite_value: sqliteClient[field] ?? null,
                    supabase_value: supabaseClient[field] ?? null
                });
            }
        }
    }

    return {
        sqlite_count: sqliteNormalized.length,
        supabase_count: supabaseNormalized.length,
        sqlite_ids: sqliteIds,
        supabase_ids: supabaseIds,
        missing_in_supabase,
        extra_in_supabase,
        field_mismatches,
        counts_match: sqliteNormalized.length === supabaseNormalized.length,
        ids_match: missing_in_supabase.length === 0 && extra_in_supabase.length === 0,
        fields_match: field_mismatches.length === 0,
        all_match: sqliteNormalized.length === supabaseNormalized.length &&
            missing_in_supabase.length === 0 &&
            extra_in_supabase.length === 0 &&
            field_mismatches.length === 0
    };
}
// --- /Supabase Read Services V2: clients compare ---


// --- Supabase Read Services V2: portal packages compare ---
function toReadServicesBool(value) {
    return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

function toReadServicesNumber(value) {
    return Number(value || 0);
}

function isVisiblePortalPackageRow(pkg) {
    return pkg
        && pkg.package_status === 'published'
        && pkg.review_status === 'approved'
        && !toReadServicesBool(pkg.needs_human_review)
        && toReadServicesBool(pkg.publish_to_client)
        && pkg.client_publish_status === 'published';
}

function isVisiblePortalPackageItemRow(item) {
    return item
        && item.review_status === 'approved'
        && !toReadServicesBool(item.needs_human_review)
        && toReadServicesBool(item.publish_to_client)
        && item.client_publish_status === 'published'
        && toReadServicesBool(item.include_in_package);
}

function sortPortalItemsForReadServicesCompare(items) {
    return [...items].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function sortPortalPackagesForReadServicesCompare(packages) {
    return [...packages].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function normalizePortalItemForReadServicesCompare(item) {
    return {
        id: String(item.id || ''),
        package_id: item.package_id || null,
        client_id: item.client_id || null,
        source_type: item.source_type || null,
        source_id: item.source_id || null,
        title: item.title || null,
        review_status: item.review_status || null,
        needs_human_review: toReadServicesBool(item.needs_human_review),
        publish_to_client: toReadServicesBool(item.publish_to_client),
        client_publish_status: item.client_publish_status || null,
        include_in_package: toReadServicesBool(item.include_in_package),
        legal_reference: item.legal_reference || null,
        source_name: item.source_name || null,
        source_url: item.source_url || null,
        amount_summary: item.amount_summary || null,
        deadline_label: item.deadline_label || null
    };
}

function normalizePortalPackageForReadServicesCompare(pkg) {
    return {
        id: String(pkg.id || ''),
        client_id: pkg.client_id || null,
        client_name: pkg.client_name || null,
        sector_key: pkg.sector_key || null,
        package_type: pkg.package_type || null,
        title: pkg.title || null,
        package_status: pkg.package_status || null,
        review_status: pkg.review_status || null,
        needs_human_review: toReadServicesBool(pkg.needs_human_review),
        publish_to_client: toReadServicesBool(pkg.publish_to_client),
        client_publish_status: pkg.client_publish_status || null,
        total_items: toReadServicesNumber(pkg.total_items),
        total_compliance_items: toReadServicesNumber(pkg.total_compliance_items),
        total_aid_items: toReadServicesNumber(pkg.total_aid_items),
        total_radar_items: toReadServicesNumber(pkg.total_radar_items),
        items: sortPortalItemsForReadServicesCompare((pkg.items || []).map(normalizePortalItemForReadServicesCompare))
    };
}

function getSqliteReadServicesPortalPackages(clientId) {
    let db;

    try {
        db = new DatabaseSync(DB_PATH);

        const packages = db.prepare(
            "SELECT * FROM client_publication_packages WHERE client_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND package_status = 'published' AND client_publish_status = 'published' ORDER BY published_at DESC"
        ).all(clientId);

        for (const pkg of packages) {
            pkg.items = db.prepare(
                "SELECT * FROM client_publication_package_items WHERE package_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 ORDER BY created_at ASC"
            ).all(pkg.id);
        }

        return {
            ok: true,
            source: 'sqlite',
            packages
        };
    } catch (error) {
        return {
            ok: false,
            error_code: 'SQLITE_READ_SERVICES_PORTAL_PACKAGES_ERROR',
            message: error.message
        };
    } finally {
        if (db) {
            try { db.close(); } catch {}
        }
    }
}

async function getSupabaseReadServicesPortalPackages(clientId) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return clientResult;
    }

    const { data: packageRows, error: packageError } = await clientResult.client
        .from('client_publication_packages')
        .select('*')
        .eq('client_id', clientId)
        .order('published_at', { ascending: false });

    if (packageError) {
        return {
            ok: false,
            error_code: 'SUPABASE_READ_SERVICES_PORTAL_PACKAGES_ERROR',
            message: packageError.message,
            env_status: clientResult.env_status
        };
    }

    const visiblePackages = (packageRows || []).filter(isVisiblePortalPackageRow);

    for (const pkg of visiblePackages) {
        const { data: itemRows, error: itemError } = await clientResult.client
            .from('client_publication_package_items')
            .select('*')
            .eq('package_id', pkg.id)
            .order('created_at', { ascending: true });

        if (itemError) {
            return {
                ok: false,
                error_code: 'SUPABASE_READ_SERVICES_PORTAL_PACKAGE_ITEMS_ERROR',
                package_id: pkg.id,
                message: itemError.message,
                env_status: clientResult.env_status
            };
        }

        pkg.items = (itemRows || []).filter(isVisiblePortalPackageItemRow);
    }

    return {
        ok: true,
        source: 'supabase',
        env_status: clientResult.env_status,
        packages: visiblePackages
    };
}

function compareReadServicesPortalPackages(sqlitePackages, supabasePackages) {
    const sqliteNormalized = sortPortalPackagesForReadServicesCompare(sqlitePackages.map(normalizePortalPackageForReadServicesCompare));
    const supabaseNormalized = sortPortalPackagesForReadServicesCompare(supabasePackages.map(normalizePortalPackageForReadServicesCompare));

    const sqlitePackageIds = sqliteNormalized.map(pkg => pkg.id);
    const supabasePackageIds = supabaseNormalized.map(pkg => pkg.id);

    const sqliteById = new Map(sqliteNormalized.map(pkg => [pkg.id, pkg]));
    const supabaseById = new Map(supabaseNormalized.map(pkg => [pkg.id, pkg]));

    const missing_packages_in_supabase = sqlitePackageIds.filter(id => !supabaseById.has(id));
    const extra_packages_in_supabase = supabasePackageIds.filter(id => !sqliteById.has(id));

    const package_field_mismatches = [];
    const item_count_mismatches = [];
    const item_id_mismatches = [];
    const item_field_mismatches = [];

    const packageFields = [
        'client_id',
        'client_name',
        'sector_key',
        'package_type',
        'title',
        'package_status',
        'review_status',
        'needs_human_review',
        'publish_to_client',
        'client_publish_status',
        'total_items',
        'total_compliance_items',
        'total_aid_items',
        'total_radar_items'
    ];

    const itemFields = [
        'package_id',
        'client_id',
        'source_type',
        'source_id',
        'title',
        'review_status',
        'needs_human_review',
        'publish_to_client',
        'client_publish_status',
        'include_in_package',
        'legal_reference',
        'source_name',
        'source_url',
        'amount_summary',
        'deadline_label'
    ];

    for (const packageId of sqlitePackageIds) {
        if (!supabaseById.has(packageId)) continue;

        const sqlitePkg = sqliteById.get(packageId);
        const supabasePkg = supabaseById.get(packageId);

        for (const field of packageFields) {
            if (String(sqlitePkg[field] ?? '') !== String(supabasePkg[field] ?? '')) {
                package_field_mismatches.push({
                    package_id: packageId,
                    field,
                    sqlite_value: sqlitePkg[field] ?? null,
                    supabase_value: supabasePkg[field] ?? null
                });
            }
        }

        if (sqlitePkg.items.length !== supabasePkg.items.length) {
            item_count_mismatches.push({
                package_id: packageId,
                sqlite_count: sqlitePkg.items.length,
                supabase_count: supabasePkg.items.length
            });
        }

        const sqliteItemIds = sqlitePkg.items.map(item => item.id);
        const supabaseItemIds = supabasePkg.items.map(item => item.id);
        const sqliteItemsById = new Map(sqlitePkg.items.map(item => [item.id, item]));
        const supabaseItemsById = new Map(supabasePkg.items.map(item => [item.id, item]));

        const missingItems = sqliteItemIds.filter(id => !supabaseItemsById.has(id));
        const extraItems = supabaseItemIds.filter(id => !sqliteItemsById.has(id));

        if (missingItems.length > 0 || extraItems.length > 0) {
            item_id_mismatches.push({
                package_id: packageId,
                missing_in_supabase: missingItems,
                extra_in_supabase: extraItems
            });
        }

        for (const itemId of sqliteItemIds) {
            if (!supabaseItemsById.has(itemId)) continue;

            const sqliteItem = sqliteItemsById.get(itemId);
            const supabaseItem = supabaseItemsById.get(itemId);

            for (const field of itemFields) {
                if (String(sqliteItem[field] ?? '') !== String(supabaseItem[field] ?? '')) {
                    item_field_mismatches.push({
                        package_id: packageId,
                        item_id: itemId,
                        field,
                        sqlite_value: sqliteItem[field] ?? null,
                        supabase_value: supabaseItem[field] ?? null
                    });
                }
            }
        }
    }

    const sqlite_total_items = sqliteNormalized.reduce((total, pkg) => total + pkg.items.length, 0);
    const supabase_total_items = supabaseNormalized.reduce((total, pkg) => total + pkg.items.length, 0);

    const package_ids_match = missing_packages_in_supabase.length === 0 && extra_packages_in_supabase.length === 0;
    const package_fields_match = package_field_mismatches.length === 0;
    const item_counts_match = item_count_mismatches.length === 0;
    const item_ids_match = item_id_mismatches.length === 0;
    const item_fields_match = item_field_mismatches.length === 0;
    const counts_match = sqliteNormalized.length === supabaseNormalized.length && sqlite_total_items === supabase_total_items;

    return {
        sqlite_count: sqliteNormalized.length,
        supabase_count: supabaseNormalized.length,
        sqlite_total_items,
        supabase_total_items,
        sqlite_package_ids: sqlitePackageIds,
        supabase_package_ids: supabasePackageIds,
        missing_packages_in_supabase,
        extra_packages_in_supabase,
        package_field_mismatches,
        item_count_mismatches,
        item_id_mismatches,
        item_field_mismatches,
        counts_match,
        package_ids_match,
        package_fields_match,
        item_counts_match,
        item_ids_match,
        item_fields_match,
        all_match: counts_match
            && package_ids_match
            && package_fields_match
            && item_counts_match
            && item_ids_match
            && item_fields_match
    };
}
// --- /Supabase Read Services V2: portal packages compare ---

// --- Supabase Read Services V2: commercial dashboard compare ---
// supabase_read_services_v2_commercial_dashboard_compare

function extractReadServicesClientId(client) {
    if (!client) return '';

    const raw = client.client_id ?? client.client_key ?? client.clientId ?? null;

    if (raw !== null && raw !== undefined && String(raw).trim() !== '') {
        return String(raw);
    }

    if (client.id !== null && client.id !== undefined && String(client.id).trim() !== '' && Number.isNaN(Number(client.id))) {
        return String(client.id);
    }

    return '';
}

function extractReadServicesClientName(client, fallbackId = '') {
    if (!client) return fallbackId || null;

    return client.client_name
        || client.nombre
        || client.name
        || client.company_name
        || fallbackId
        || null;
}

function nextReadServicesActionForCommercialClient(client) {
    if (toReadServicesNumber(client.pending_contact) > 0) return 'Contactar cliente';
    if (toReadServicesNumber(client.contacted) > 0) return 'Hacer seguimiento';

    const totalRequests = toReadServicesNumber(client.interest_requests_total);
    const handled = toReadServicesNumber(client.handled);
    const dismissed = toReadServicesNumber(client.dismissed);

    if (handled === totalRequests && totalRequests > 0) return 'Sin acción pendiente';
    if (totalRequests === 0) return 'Sin solicitudes todavía';
    if (dismissed > 0 && toReadServicesNumber(client.pending_contact) === 0 && toReadServicesNumber(client.contacted) === 0) return 'Revisar descartadas';

    return 'Revisar manualmente';
}

function nextReadServicesActionForCommercialRequest(status) {
    if (status === 'pending_contact') return 'Contactar cliente';
    if (status === 'contacted') return 'Hacer seguimiento';
    if (status === 'handled') return 'Sin acción pendiente';
    if (status === 'dismissed') return 'Descartada';
    return 'Revisar manualmente';
}

function emptyReadServicesCommercialClient(clientId, clientName = null) {
    return {
        client_id: String(clientId || ''),
        client_name: clientName || String(clientId || ''),
        packages_total: 0,
        packages_published: 0,
        total_package_items: 0,
        total_compliance_items: 0,
        total_aid_items: 0,
        total_radar_items: 0,
        interest_requests_total: 0,
        pending_contact: 0,
        contacted: 0,
        handled: 0,
        dismissed: 0,
        next_action_recommended: 'Revisar manualmente'
    };
}

function ensureReadServicesCommercialClient(clientMap, clientId, clientName = null) {
    const normalizedClientId = String(clientId || '');

    if (!normalizedClientId) return null;

    if (!clientMap.has(normalizedClientId)) {
        clientMap.set(normalizedClientId, emptyReadServicesCommercialClient(normalizedClientId, clientName));
    }

    const client = clientMap.get(normalizedClientId);

    if (clientName && (!client.client_name || client.client_name === normalizedClientId)) {
        client.client_name = clientName;
    }

    return client;
}

function normalizeReadServicesCommercialClient(client) {
    const normalized = {
        client_id: String(client.client_id || ''),
        client_name: client.client_name || null,
        packages_total: toReadServicesNumber(client.packages_total),
        packages_published: toReadServicesNumber(client.packages_published),
        total_package_items: toReadServicesNumber(client.total_package_items),
        total_compliance_items: toReadServicesNumber(client.total_compliance_items),
        total_aid_items: toReadServicesNumber(client.total_aid_items),
        total_radar_items: toReadServicesNumber(client.total_radar_items),
        interest_requests_total: toReadServicesNumber(client.interest_requests_total),
        pending_contact: toReadServicesNumber(client.pending_contact),
        contacted: toReadServicesNumber(client.contacted),
        handled: toReadServicesNumber(client.handled),
        dismissed: toReadServicesNumber(client.dismissed),
        next_action_recommended: client.next_action_recommended || nextReadServicesActionForCommercialClient(client)
    };

    return normalized;
}

function normalizeReadServicesCommercialRequest(request) {
    return {
        id: String(request.id || ''),
        client_id: request.client_id || null,
        client_name: request.client_name || null,
        package_id: request.package_id || null,
        package_item_id: request.package_item_id || null,
        source_type: request.source_type || null,
        source_id: request.source_id || null,
        title: request.title || null,
        request_type: request.request_type || null,
        request_status: request.request_status || null,
        priority: request.priority || null,
        handled_by: request.handled_by || null,
        next_action_recommended: nextReadServicesActionForCommercialRequest(request.request_status)
    };
}

function sortReadServicesCommercialClients(clients) {
    return [...clients].sort((a, b) => String(a.client_id).localeCompare(String(b.client_id)));
}

function sortReadServicesCommercialRequests(requests) {
    return [...requests].sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function buildReadServicesCommercialDashboardFromRows({ clientsCatalog = [], packages = [], requests = [] }) {
    const clientMap = new Map();

    for (const catalogClient of clientsCatalog || []) {
        const clientId = extractReadServicesClientId(catalogClient);
        if (!clientId) continue;

        ensureReadServicesCommercialClient(
            clientMap,
            clientId,
            extractReadServicesClientName(catalogClient, clientId)
        );
    }

    for (const pkg of packages || []) {
        const clientId = String(pkg.client_id || '');
        if (!clientId) continue;

        const client = ensureReadServicesCommercialClient(clientMap, clientId, pkg.client_name || clientId);
        if (!client) continue;

        client.packages_total += 1;

        if (isVisiblePortalPackageRow(pkg)) {
            client.packages_published += 1;
            client.total_package_items += toReadServicesNumber(pkg.total_items);
            client.total_compliance_items += toReadServicesNumber(pkg.total_compliance_items);
            client.total_aid_items += toReadServicesNumber(pkg.total_aid_items);
            client.total_radar_items += toReadServicesNumber(pkg.total_radar_items);
        }
    }

    const normalizedRequests = [];

    for (const request of requests || []) {
        const clientId = String(request.client_id || '');
        const client = ensureReadServicesCommercialClient(clientMap, clientId, request.client_name || clientId);

        if (client) {
            client.interest_requests_total += 1;

            if (request.request_status === 'pending_contact') client.pending_contact += 1;
            if (request.request_status === 'contacted') client.contacted += 1;
            if (request.request_status === 'handled') client.handled += 1;
            if (request.request_status === 'dismissed') client.dismissed += 1;
        }

        normalizedRequests.push(normalizeReadServicesCommercialRequest(request));
    }

    const clients = sortReadServicesCommercialClients(
        [...clientMap.values()].map((client) => normalizeReadServicesCommercialClient({
            ...client,
            next_action_recommended: nextReadServicesActionForCommercialClient(client)
        }))
    );

    const requestsSorted = sortReadServicesCommercialRequests(normalizedRequests);

    const requestStatuses = new Map();
    const requestTypes = new Map();
    const priorities = new Map();

    for (const request of requestsSorted) {
        const statusKey = request.request_status || 'unknown';
        const typeKey = request.request_type || 'unknown';
        const priorityKey = request.priority || 'unknown';

        requestStatuses.set(statusKey, (requestStatuses.get(statusKey) || 0) + 1);
        requestTypes.set(typeKey, (requestTypes.get(typeKey) || 0) + 1);
        priorities.set(priorityKey, (priorities.get(priorityKey) || 0) + 1);
    }

    const counts = {
        clients_total: clients.length,
        packages_published: clients.reduce((total, client) => total + toReadServicesNumber(client.packages_published), 0),
        package_items_total: clients.reduce((total, client) => total + toReadServicesNumber(client.total_package_items), 0),
        interest_requests_total: clients.reduce((total, client) => total + toReadServicesNumber(client.interest_requests_total), 0),
        pending_contact: clients.reduce((total, client) => total + toReadServicesNumber(client.pending_contact), 0),
        contacted: clients.reduce((total, client) => total + toReadServicesNumber(client.contacted), 0),
        handled: clients.reduce((total, client) => total + toReadServicesNumber(client.handled), 0),
        dismissed: clients.reduce((total, client) => total + toReadServicesNumber(client.dismissed), 0)
    };

    return {
        counts,
        clients,
        requests: requestsSorted,
        filters: {
            request_statuses: [...requestStatuses.entries()].map(([request_status, total]) => ({ request_status, total })).sort((a, b) => String(a.request_status).localeCompare(String(b.request_status))),
            request_types: [...requestTypes.entries()].map(([request_type, total]) => ({ request_type, total })).sort((a, b) => String(a.request_type).localeCompare(String(b.request_type))),
            priorities: [...priorities.entries()].map(([priority, total]) => ({ priority, total })).sort((a, b) => String(a.priority).localeCompare(String(b.priority)))
        }
    };
}

function getSqliteReadServicesCommercialDashboard() {
    let db;

    try {
        db = new DatabaseSync(DB_PATH);

        const packages = db.prepare(
            "SELECT * FROM client_publication_packages ORDER BY client_id ASC, published_at DESC"
        ).all();

        const requests = db.prepare(
            "SELECT * FROM client_interest_requests ORDER BY created_at DESC"
        ).all();

        const dashboard = buildReadServicesCommercialDashboardFromRows({
            clientsCatalog: getClientCatalog(),
            packages,
            requests
        });

        return {
            ok: true,
            source: 'sqlite',
            dashboard
        };
    } catch (error) {
        return {
            ok: false,
            error_code: 'SQLITE_READ_SERVICES_COMMERCIAL_DASHBOARD_ERROR',
            message: error.message
        };
    } finally {
        if (db) {
            try { db.close(); } catch {}
        }
    }
}

async function getSupabaseReadServicesCommercialDashboard() {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return clientResult;
    }

    const supabaseClients = await getSupabaseReadServicesClientsCatalog();

    if (!supabaseClients.ok) {
        return {
            ...supabaseClients,
            error_code: supabaseClients.error_code || 'SUPABASE_READ_SERVICES_COMMERCIAL_CLIENTS_ERROR'
        };
    }

    const { data: packageRows, error: packageError } = await clientResult.client
        .from('client_publication_packages')
        .select('*')
        .order('client_id', { ascending: true });

    if (packageError) {
        return {
            ok: false,
            error_code: 'SUPABASE_READ_SERVICES_COMMERCIAL_PACKAGES_ERROR',
            message: packageError.message,
            env_status: clientResult.env_status
        };
    }

    const { data: requestRows, error: requestError } = await clientResult.client
        .from('client_interest_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (requestError) {
        return {
            ok: false,
            error_code: 'SUPABASE_READ_SERVICES_COMMERCIAL_REQUESTS_ERROR',
            message: requestError.message,
            env_status: clientResult.env_status
        };
    }

    const dashboard = buildReadServicesCommercialDashboardFromRows({
        clientsCatalog: supabaseClients.clients || [],
        packages: packageRows || [],
        requests: requestRows || []
    });

    return {
        ok: true,
        source: 'supabase',
        env_status: clientResult.env_status,
        dashboard
    };
}

function compareReadServicesCommercialDashboard(sqliteDashboard, supabaseDashboard) {
    const countFields = [
        'clients_total',
        'packages_published',
        'package_items_total',
        'interest_requests_total',
        'pending_contact',
        'contacted',
        'handled',
        'dismissed'
    ];

    const clientFields = [
        'client_name',
        'packages_total',
        'packages_published',
        'total_package_items',
        'total_compliance_items',
        'total_aid_items',
        'total_radar_items',
        'interest_requests_total',
        'pending_contact',
        'contacted',
        'handled',
        'dismissed',
        'next_action_recommended'
    ];

    const requestFields = [
        'client_id',
        'client_name',
        'package_id',
        'package_item_id',
        'source_type',
        'source_id',
        'title',
        'request_type',
        'request_status',
        'priority',
        'handled_by',
        'next_action_recommended'
    ];

    const sqliteCounts = sqliteDashboard.counts || {};
    const supabaseCounts = supabaseDashboard.counts || {};

    const count_mismatches = [];

    for (const field of countFields) {
        if (toReadServicesNumber(sqliteCounts[field]) !== toReadServicesNumber(supabaseCounts[field])) {
            count_mismatches.push({
                field,
                sqlite_value: sqliteCounts[field] ?? null,
                supabase_value: supabaseCounts[field] ?? null
            });
        }
    }

    const sqliteClients = sortReadServicesCommercialClients((sqliteDashboard.clients || []).map(normalizeReadServicesCommercialClient));
    const supabaseClients = sortReadServicesCommercialClients((supabaseDashboard.clients || []).map(normalizeReadServicesCommercialClient));

    const sqliteClientIds = sqliteClients.map((client) => client.client_id);
    const supabaseClientIds = supabaseClients.map((client) => client.client_id);

    const sqliteClientsById = new Map(sqliteClients.map((client) => [client.client_id, client]));
    const supabaseClientsById = new Map(supabaseClients.map((client) => [client.client_id, client]));

    const missing_clients_in_supabase = sqliteClientIds.filter((id) => !supabaseClientsById.has(id));
    const extra_clients_in_supabase = supabaseClientIds.filter((id) => !sqliteClientsById.has(id));

    const client_field_mismatches = [];

    for (const clientId of sqliteClientIds) {
        if (!supabaseClientsById.has(clientId)) continue;

        const sqliteClient = sqliteClientsById.get(clientId);
        const supabaseClient = supabaseClientsById.get(clientId);

        for (const field of clientFields) {
            if (String(sqliteClient[field] ?? '') !== String(supabaseClient[field] ?? '')) {
                client_field_mismatches.push({
                    client_id: clientId,
                    field,
                    sqlite_value: sqliteClient[field] ?? null,
                    supabase_value: supabaseClient[field] ?? null
                });
            }
        }
    }

    const sqliteRequests = sortReadServicesCommercialRequests((sqliteDashboard.requests || []).map(normalizeReadServicesCommercialRequest));
    const supabaseRequests = sortReadServicesCommercialRequests((supabaseDashboard.requests || []).map(normalizeReadServicesCommercialRequest));

    const sqliteRequestIds = sqliteRequests.map((request) => request.id);
    const supabaseRequestIds = supabaseRequests.map((request) => request.id);

    const sqliteRequestsById = new Map(sqliteRequests.map((request) => [request.id, request]));
    const supabaseRequestsById = new Map(supabaseRequests.map((request) => [request.id, request]));

    const missing_requests_in_supabase = sqliteRequestIds.filter((id) => !supabaseRequestsById.has(id));
    const extra_requests_in_supabase = supabaseRequestIds.filter((id) => !sqliteRequestsById.has(id));

    const request_field_mismatches = [];

    for (const requestId of sqliteRequestIds) {
        if (!supabaseRequestsById.has(requestId)) continue;

        const sqliteRequest = sqliteRequestsById.get(requestId);
        const supabaseRequest = supabaseRequestsById.get(requestId);

        for (const field of requestFields) {
            if (String(sqliteRequest[field] ?? '') !== String(supabaseRequest[field] ?? '')) {
                request_field_mismatches.push({
                    request_id: requestId,
                    field,
                    sqlite_value: sqliteRequest[field] ?? null,
                    supabase_value: supabaseRequest[field] ?? null
                });
            }
        }
    }

    const counts_match = count_mismatches.length === 0;
    const client_ids_match = missing_clients_in_supabase.length === 0 && extra_clients_in_supabase.length === 0;
    const client_fields_match = client_field_mismatches.length === 0;
    const request_ids_match = missing_requests_in_supabase.length === 0 && extra_requests_in_supabase.length === 0;
    const request_fields_match = request_field_mismatches.length === 0;

    const sqliteTransportes = sqliteClientsById.get('transportes_levante');
    const supabaseTransportes = supabaseClientsById.get('transportes_levante');

    const transportes_not_multiplied_ok = Boolean(
        sqliteTransportes
        && supabaseTransportes
        && toReadServicesNumber(sqliteTransportes.packages_total) === 1
        && toReadServicesNumber(sqliteTransportes.packages_published) === 1
        && toReadServicesNumber(sqliteTransportes.total_package_items) === 8
        && toReadServicesNumber(sqliteTransportes.total_compliance_items) === 6
        && toReadServicesNumber(sqliteTransportes.total_aid_items) === 2
        && toReadServicesNumber(sqliteTransportes.total_radar_items) === 0
        && toReadServicesNumber(supabaseTransportes.packages_total) === 1
        && toReadServicesNumber(supabaseTransportes.packages_published) === 1
        && toReadServicesNumber(supabaseTransportes.total_package_items) === 8
        && toReadServicesNumber(supabaseTransportes.total_compliance_items) === 6
        && toReadServicesNumber(supabaseTransportes.total_aid_items) === 2
        && toReadServicesNumber(supabaseTransportes.total_radar_items) === 0
    );

    return {
        sqlite_counts: sqliteCounts,
        supabase_counts: supabaseCounts,
        sqlite_client_ids: sqliteClientIds,
        supabase_client_ids: supabaseClientIds,
        sqlite_request_ids: sqliteRequestIds,
        supabase_request_ids: supabaseRequestIds,
        count_mismatches,
        missing_clients_in_supabase,
        extra_clients_in_supabase,
        client_field_mismatches,
        missing_requests_in_supabase,
        extra_requests_in_supabase,
        request_field_mismatches,
        counts_match,
        client_ids_match,
        client_fields_match,
        request_ids_match,
        request_fields_match,
        transportes_not_multiplied_ok,
        all_match: counts_match
            && client_ids_match
            && client_fields_match
            && request_ids_match
            && request_fields_match
            && transportes_not_multiplied_ok
    };
}
// --- /Supabase Read Services V2: commercial dashboard compare ---

// --- Supabase Read Switch V1 ---
// supabase_read_switch_v1

const RADAR_READ_SOURCE_SQLITE = 'sqlite';
const RADAR_READ_SOURCE_SUPABASE_READONLY = 'supabase_readonly';

function getRadarReadSource() {
    const rawValue = String(process.env.RADAR_READ_SOURCE || '').trim().toLowerCase();

    if (rawValue === RADAR_READ_SOURCE_SUPABASE_READONLY) {
        return RADAR_READ_SOURCE_SUPABASE_READONLY;
    }

    return RADAR_READ_SOURCE_SQLITE;
}


// write_switch_v1_portal_interest
const RADAR_WRITE_SOURCE_SQLITE = 'sqlite';
const RADAR_WRITE_SOURCE_DUAL_WRITE = 'dual_write';
const RADAR_WRITE_SOURCE_SUPABASE = 'supabase';

function getRadarWriteSource() {
  const rawValue = String(process.env.RADAR_WRITE_SOURCE || '').trim().toLowerCase();

  if (rawValue === RADAR_WRITE_SOURCE_DUAL_WRITE) {
    return RADAR_WRITE_SOURCE_DUAL_WRITE;
  }

  if (rawValue === RADAR_WRITE_SOURCE_SUPABASE) {
    return RADAR_WRITE_SOURCE_SUPABASE;
  }

  return RADAR_WRITE_SOURCE_SQLITE;
}

function getRadarWriteSourceStatus() {
  const writeSource = getRadarWriteSource();
  const supabaseEnvStatus = getSupabaseReadonlyEnvStatus();

  return {
    write_source: writeSource,
    allowed_sources: [
      RADAR_WRITE_SOURCE_SQLITE,
      RADAR_WRITE_SOURCE_DUAL_WRITE,
      RADAR_WRITE_SOURCE_SUPABASE
    ],
    default_source: RADAR_WRITE_SOURCE_SQLITE,
    env_var: 'RADAR_WRITE_SOURCE',
    switch_scope: 'POST /api/portal/interest-requests',
    production_safe_default: writeSource === RADAR_WRITE_SOURCE_SQLITE,
    dual_write_active: writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE,
    supabase_write_active: writeSource === RADAR_WRITE_SOURCE_SUPABASE,
    supabase_readonly: supabaseEnvStatus,
    note: writeSource === RADAR_WRITE_SOURCE_SQLITE
      ? 'SQLite es la fuente efectiva de escritura.'
      : writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE
        ? 'Dual write activo: SQLite y Supabase.'
        : 'Supabase es la fuente efectiva de escritura.'
  };
}

function isPortalPublishedPackageItem(item) {
  return Boolean(
    item &&
    item.review_status === 'approved' &&
    Number(item.needs_human_review) === 0 &&
    Number(item.publish_to_client) === 1 &&
    item.client_publish_status === 'published' &&
    Number(item.include_in_package) === 1
  );
}

function isPortalPublishedPackage(pkg) {
  return Boolean(
    pkg &&
    pkg.package_status === 'published' &&
    pkg.review_status === 'approved' &&
    Number(pkg.needs_human_review) === 0 &&
    Number(pkg.publish_to_client) === 1 &&
    pkg.client_publish_status === 'published'
  );
}

function buildPortalInterestRequest({ requestId, item, client_id, clientName, package_item_id, message, now }) {
  return {
    id: requestId,
    tenant_id: item.tenant_id,
    client_id,
    client_name: clientName,
    package_id: item.package_id,
    package_item_id,
    source_type: 'aid_item',
    source_id: item.source_id,
    title: item.title,
    request_type: item.request_type,
    request_status: 'pending_contact',
    priority: 'normal',
    message: message || 'El cliente solicita que su asesoría revise esta oportunidad.',
    created_at: now,
    updated_at: now,
    handled_at: null,
    handled_by: null,
    internal_notes: null
  };
}

async function getSupabasePortalInterestValidation({ client_id, package_item_id }) {
  const clientResult = getSupabaseReadonlyClient();

  if (!clientResult.ok) {
    return clientResult;
  }

  const { data: item, error: itemError } = await clientResult.client
    .from('client_publication_package_items')
    .select('*')
    .eq('id', package_item_id)
    .eq('client_id', client_id)
    .eq('source_type', 'aid_item')
    .maybeSingle();

  if (itemError) {
    return {
      ok: false,
      http_status: 500,
      error_code: 'SUPABASE_PORTAL_INTEREST_ITEM_ERROR',
      message: itemError.message
    };
  }

  if (!item) {
    return {
      ok: false,
      http_status: 403,
      error_code: 'PORTAL_INTEREST_ITEM_NOT_FOUND',
      message: 'Item not found, does not belong to client, or is not an aid_item'
    };
  }

  if (!isPortalPublishedPackageItem(item)) {
    return {
      ok: false,
      http_status: 403,
      error_code: 'PORTAL_INTEREST_ITEM_NOT_VISIBLE',
      message: 'Item is not visible in Portal Entidad'
    };
  }

  const { data: pkg, error: pkgError } = await clientResult.client
    .from('client_publication_packages')
    .select('*')
    .eq('id', item.package_id)
    .maybeSingle();

  if (pkgError) {
    return {
      ok: false,
      http_status: 500,
      error_code: 'SUPABASE_PORTAL_INTEREST_PACKAGE_ERROR',
      message: pkgError.message
    };
  }

  if (!isPortalPublishedPackage(pkg)) {
    return {
      ok: false,
      http_status: 403,
      error_code: 'PORTAL_INTEREST_PACKAGE_NOT_PUBLISHED',
      message: 'Parent package is not published'
    };
  }

  return {
    ok: true,
    item,
    package: pkg
  };
}

async function getSupabaseExistingPendingPortalInterestRequest({ client_id, package_item_id }) {
  const clientResult = getSupabaseReadonlyClient();

  if (!clientResult.ok) {
    return clientResult;
  }

  const { data, error } = await clientResult.client
    .from('client_interest_requests')
    .select('*')
    .eq('client_id', client_id)
    .eq('package_item_id', package_item_id)
    .eq('request_status', 'pending_contact')
    .limit(1);

  if (error) {
    return {
      ok: false,
      http_status: 500,
      error_code: 'SUPABASE_PORTAL_INTEREST_EXISTING_ERROR',
      message: error.message
    };
  }

  return {
    ok: true,
    request: Array.isArray(data) && data.length > 0 ? data[0] : null
  };
}


// write_switch_v1_manager_interest_status
async function getSupabaseInterestRequestByIdForStatusUpdate(requestId) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            message: clientResult.message || 'Supabase client unavailable.',
            request: null
        };
    }

    try {
        const { data, error } = await clientResult.client
            .from('client_interest_requests')
            .select('*')
            .eq('id', requestId)
            .limit(1);

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_INTEREST_REQUEST_STATUS_SELECT_ERROR',
                message: error.message,
                request: null
            };
        }

        const request = Array.isArray(data) ? data[0] : data;

        if (!request) {
            return {
                ok: false,
                error_code: 'SUPABASE_INTEREST_REQUEST_NOT_FOUND',
                message: 'Interest request not found in Supabase.',
                request: null
            };
        }

        return {
            ok: true,
            request
        };
    } catch (err) {
        return {
            ok: false,
            error_code: 'SUPABASE_INTEREST_REQUEST_STATUS_SELECT_EXCEPTION',
            message: err.message,
            request: null
        };
    }
}

async function updateSupabaseInterestRequestStatusForApi(requestId, updatePayload) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            message: clientResult.message || 'Supabase client unavailable.',
            request: null
        };
    }

    try {
        const { data, error } = await clientResult.client
            .from('client_interest_requests')
            .update(updatePayload)
            .eq('id', requestId)
            .select('*');

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_INTEREST_REQUEST_STATUS_UPDATE_ERROR',
                message: error.message,
                request: null
            };
        }

        const request = Array.isArray(data) ? data[0] : data;

        if (!request) {
            return {
                ok: false,
                error_code: 'SUPABASE_INTEREST_REQUEST_STATUS_UPDATE_NOT_FOUND',
                message: 'Interest request status update returned no row.',
                request: null
            };
        }

        return {
            ok: true,
            request
        };
    } catch (err) {
        return {
            ok: false,
            error_code: 'SUPABASE_INTEREST_REQUEST_STATUS_UPDATE_EXCEPTION',
            message: err.message,
            request: null
        };
    }
}

async function createSupabasePortalInterestRequest(request) {
  const clientResult = getSupabaseReadonlyClient();

  if (!clientResult.ok) {
    return clientResult;
  }

  const { data, error } = await clientResult.client
    .from('client_interest_requests')
    .insert(request)
    .select('*')
    .single();

  if (error) {
    return {
      ok: false,
      http_status: 500,
      error_code: 'SUPABASE_PORTAL_INTEREST_INSERT_ERROR',
      message: error.message
    };
  }

  return {
    ok: true,
    request: data
  };
}


function getRadarReadSourceStatus() {
    const readSource = getRadarReadSource();
    const supabaseEnvStatus = getSupabaseReadonlyEnvStatus();

    return {
        read_source: readSource,
        source_of_truth_current: readSource,
        allowed_values: [
            RADAR_READ_SOURCE_SQLITE,
            RADAR_READ_SOURCE_SUPABASE_READONLY
        ],
        default_source: RADAR_READ_SOURCE_SQLITE,
        env_var: 'RADAR_READ_SOURCE',
        supabase_readonly: supabaseEnvStatus,
        safe_mode: readSource === RADAR_READ_SOURCE_SQLITE,
        note: readSource === RADAR_READ_SOURCE_SQLITE
            ? 'SQLite sigue siendo la fuente operativa actual.'
            : 'Supabase readonly activado para endpoints de lectura compatibles.'
    };
}

function readSwitchFlagToBoolean(value) {
    if (value === true) return true;
    if (value === false || value === null || value === undefined) return false;

    const normalized = String(value).trim().toLowerCase();

    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function readSwitchBooleanToInteger(value) {
    return readSwitchFlagToBoolean(value) ? 1 : 0;
}
function normalizeReadSwitchClientForApi(client) {
    const clientId = extractReadServicesClientId(client);

    return {
        ...client,
        id: clientId || client.id || client.client_id || client.client_key || null,
        client_id: clientId || client.client_id || client.client_key || client.id || null,
        client_key: client.client_key || clientId || client.client_id || client.id || null,
        name: client.name || client.nombre || client.client_name || null,
        nombre: client.nombre || client.client_name || client.name || null,
        client_name: client.client_name || client.nombre || client.name || null
    };
}

function normalizeReadSwitchPackageForPortalApi(pkg, items) {
    return {
        ...pkg,
        needs_human_review: readSwitchBooleanToInteger(pkg.needs_human_review),
        publish_to_client: readSwitchBooleanToInteger(pkg.publish_to_client),
        data_quality_warning: readSwitchBooleanToInteger(pkg.data_quality_warning),
        total_items: toReadServicesNumber(pkg.total_items),
        total_compliance_items: toReadServicesNumber(pkg.total_compliance_items),
        total_aid_items: toReadServicesNumber(pkg.total_aid_items),
        total_radar_items: toReadServicesNumber(pkg.total_radar_items),
        items: (items || []).map((item) => ({
            ...item,
            include_in_package: readSwitchBooleanToInteger(item.include_in_package),
            needs_human_review: readSwitchBooleanToInteger(item.needs_human_review),
            publish_to_client: readSwitchBooleanToInteger(item.publish_to_client),
            data_quality_warning: readSwitchBooleanToInteger(item.data_quality_warning)
        }))
    };
}

async function getSupabaseReadSwitchClientsForApi() {
    const supabaseResult = await getSupabaseReadServicesClientsCatalog();

    if (!supabaseResult.ok) {
        return supabaseResult;
    }

    return {
        ok: true,
        source: RADAR_READ_SOURCE_SUPABASE_READONLY,
        clients: (supabaseResult.clients || []).map(normalizeReadSwitchClientForApi),
        env_status: supabaseResult.env_status || getSupabaseReadonlyEnvStatus()
    };
}

async function getSupabaseReadSwitchPortalPackagesForApi(clientId) {
    const cleanClientId = String(clientId || '').trim();

    if (!cleanClientId) {
        return {
            ok: false,
            error_code: 'CLIENT_ID_REQUIRED',
            message: 'client_id es obligatorio.'
        };
    }

    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return clientResult;
    }

    const clientsResult = await getSupabaseReadSwitchClientsForApi();

    if (!clientsResult.ok) {
        return {
            ...clientsResult,
            error_code: clientsResult.error_code || 'SUPABASE_READ_SWITCH_CLIENTS_ERROR'
        };
    }

    const knownClient = (clientsResult.clients || []).find((client) => {
        return String(client.id || '') === cleanClientId
            || String(client.client_id || '') === cleanClientId
            || String(client.client_key || '') === cleanClientId;
    });

    if (!knownClient) {
        return {
            ok: true,
            source: RADAR_READ_SOURCE_SUPABASE_READONLY,
            client_id: cleanClientId,
            packages: [],
            env_status: clientResult.env_status
        };
    }

    const { data: packageRows, error: packageError } = await clientResult.client
        .from('client_publication_packages')
        .select('*')
        .eq('client_id', cleanClientId)
        .order('published_at', { ascending: false });

    if (packageError) {
        return {
            ok: false,
            error_code: 'SUPABASE_READ_SWITCH_PORTAL_PACKAGES_ERROR',
            message: packageError.message,
            env_status: clientResult.env_status
        };
    }

    const visiblePackages = (packageRows || []).filter(isVisiblePortalPackageRow);
    const packageIds = visiblePackages.map((pkg) => pkg.id).filter(Boolean);

    let itemRows = [];

    if (packageIds.length > 0) {
        const { data: rawItemRows, error: itemError } = await clientResult.client
            .from('client_publication_package_items')
            .select('*')
            .in('package_id', packageIds)
            .order('display_order', { ascending: true })
            .order('id', { ascending: true });

        if (itemError) {
            return {
                ok: false,
                error_code: 'SUPABASE_READ_SWITCH_PORTAL_PACKAGE_ITEMS_ERROR',
                message: itemError.message,
                env_status: clientResult.env_status
            };
        }

        itemRows = (rawItemRows || []).filter(isVisiblePortalPackageItemRow);
    }

    const itemsByPackageId = new Map();

    for (const item of itemRows) {
        const packageId = item.package_id;

        if (!itemsByPackageId.has(packageId)) {
            itemsByPackageId.set(packageId, []);
        }

        itemsByPackageId.get(packageId).push(item);
    }

    const packages = visiblePackages.map((pkg) => {
        return normalizeReadSwitchPackageForPortalApi(pkg, itemsByPackageId.get(pkg.id) || []);
    });

    return {
        ok: true,
        source: RADAR_READ_SOURCE_SUPABASE_READONLY,
        client_id: cleanClientId,
        packages,
        env_status: clientResult.env_status
    };
}

async function getSupabaseReadSwitchCommercialDashboardForApi() {
    const supabaseResult = await getSupabaseReadServicesCommercialDashboard();

    if (!supabaseResult.ok) {
        return supabaseResult;
    }

    return {
        ok: true,
        source: RADAR_READ_SOURCE_SUPABASE_READONLY,
        dashboard: supabaseResult.dashboard,
        env_status: supabaseResult.env_status || getSupabaseReadonlyEnvStatus()
    };
}
// --- /Supabase Read Switch V1 ---









// === AUTH GESTOR V1 START ===
function loadLocalEnvIfPresent() {
    try {
        const envPath = path.join(__dirname, '.env');
        if (!fs.existsSync(envPath)) return;

        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex <= 0) continue;

            const key = trimmed.slice(0, separatorIndex).trim();
            let value = trimmed.slice(separatorIndex + 1).trim();

            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            if (key && process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    } catch (error) {
        console.error('Local env loader error:', error.message);
    }
}

loadLocalEnvIfPresent();

const MANAGER_SESSION_COOKIE_NAME = 'rgv_manager_session';

function getManagerSessionTtlHours() {
    const parsed = Number(process.env.MANAGER_SESSION_TTL_HOURS || 8);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 8;
}

function isManagerAuthConfigured() {
    return Boolean(process.env.MANAGER_ACCESS_PIN_HASH_SHA256 && process.env.MANAGER_SESSION_SECRET);
}

function sha256Hex(value) {
    return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function safeEqualHex(a, b) {
    const left = String(a || '').trim();
    const right = String(b || '').trim();

    if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;

    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (leftBuffer.length !== rightBuffer.length) return false;

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function safeEqualText(a, b) {
    const leftBuffer = Buffer.from(String(a || ''), 'utf8');
    const rightBuffer = Buffer.from(String(b || ''), 'utf8');

    if (leftBuffer.length !== rightBuffer.length) return false;

    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(req) {
    const header = req.headers.cookie || '';
    const cookies = {};

    for (const part of header.split(';')) {
        const index = part.indexOf('=');
        if (index === -1) continue;

        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();

        if (!key) continue;

        try {
            cookies[key] = decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    }

    return cookies;
}

function serializeCookie(name, value, options = {}) {
    const parts = [name + '=' + encodeURIComponent(value)];

    if (options.maxAge !== undefined) parts.push('Max-Age=' + Math.floor(options.maxAge));
    if (options.httpOnly) parts.push('HttpOnly');
    if (options.secure) parts.push('Secure');
    if (options.sameSite) parts.push('SameSite=' + options.sameSite);
    if (options.path) parts.push('Path=' + options.path);

    return parts.join('; ');
}

function createManagerSessionToken() {
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = Math.floor(getManagerSessionTtlHours() * 60 * 60);

    const payload = {
        scope: 'manager',
        iat: now,
        exp: now + ttlSeconds
    };

    const payloadEncoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

    const signature = crypto
        .createHmac('sha256', process.env.MANAGER_SESSION_SECRET || '')
        .update(payloadEncoded)
        .digest('base64url');

    return payloadEncoded + '.' + signature;
}

function verifyManagerSessionToken(token) {
    try {
        if (!isManagerAuthConfigured()) return false;

        const parts = String(token || '').split('.');
        if (parts.length !== 2) return false;

        const payloadEncoded = parts[0];
        const signature = parts[1];

        if (!payloadEncoded || !signature) return false;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.MANAGER_SESSION_SECRET || '')
            .update(payloadEncoded)
            .digest('base64url');

        if (!safeEqualText(signature, expectedSignature)) return false;

        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));

        if (!payload || payload.scope !== 'manager') return false;

        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || Number(payload.exp) <= now) return false;

        return true;
    } catch {
        return false;
    }
}

function setManagerSessionCookie(res) {
    const ttlSeconds = Math.floor(getManagerSessionTtlHours() * 60 * 60);
    const token = createManagerSessionToken();

    res.setHeader('Set-Cookie', serializeCookie(MANAGER_SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production'),
        sameSite: 'Lax',
        path: '/',
        maxAge: ttlSeconds
    }));
}

function clearManagerSessionCookie(res) {
    res.setHeader('Set-Cookie', serializeCookie(MANAGER_SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production'),
        sameSite: 'Lax',
        path: '/',
        maxAge: 0
    }));
}

function isManagerAuthenticated(req) {
    const cookies = parseCookies(req);
    return verifyManagerSessionToken(cookies[MANAGER_SESSION_COOKIE_NAME]);
}

function requireManagerAuth(req, res) {
    return sendJson(res, 401, {
        status: 'error',
        error_code: 'MANAGER_AUTH_REQUIRED',
        message: 'Acceso gestor requerido.'
    });
}

function isManagerAuthApiPath(pathname) {
    return pathname === '/api/manager/auth/login' ||
        pathname === '/api/manager/auth/session' ||
        pathname === '/api/manager/auth/logout';
}

function isProtectedManagerApiPath(pathname) {
    if (isManagerAuthApiPath(pathname)) {
        return false;
    }

    return (
        pathname === '/api/manager' ||
        pathname.startsWith('/api/manager/') ||
        pathname === '/api/radar' ||
        pathname.startsWith('/api/radar/') ||
        pathname === '/api/aids' ||
        pathname.startsWith('/api/aids/') ||
        pathname === '/api/compliance' ||
        pathname.startsWith('/api/compliance/')
    );
}

function readRequestJson(req, callback) {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString('utf8');
        if (body.length > 10000) req.destroy();
    });

    req.on('end', () => {
        callback(parseJsonSafe(body) || {});
    });

    req.on('error', () => {
        callback({});
    });
}

function handleManagerAuthRoute(req, res, pathname) {
    if (pathname === '/api/auth/manager/login') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, {
                status: 'error',
                error_code: 'METHOD_NOT_ALLOWED',
                message: 'Método no permitido.'
            });
        }

        if (!isManagerAuthConfigured()) {
            return sendJson(res, 503, {
                status: 'error',
                error_code: 'MANAGER_AUTH_NOT_CONFIGURED',
                message: 'Autenticación de gestor no configurada.'
            });
        }

        return readRequestJson(req, payload => {
            const pin = payload.pin;

            if (typeof pin !== 'string' || pin.length === 0) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'MANAGER_PIN_REQUIRED',
                    message: 'PIN requerido.'
                });
            }

            const receivedHash = sha256Hex(pin);
            const expectedHash = process.env.MANAGER_ACCESS_PIN_HASH_SHA256;

            if (!safeEqualHex(receivedHash, expectedHash)) {
                return sendJson(res, 401, {
                    status: 'error',
                    error_code: 'INVALID_MANAGER_PIN',
                    message: 'PIN incorrecto.'
                });
            }

            setManagerSessionCookie(res);

            return sendJson(res, 200, {
                status: 'ok',
                authenticated: true
            });
        });
    }

    if (pathname === '/api/auth/manager/session') {
        if (req.method !== 'GET') {
            return sendJson(res, 405, {
                status: 'error',
                error_code: 'METHOD_NOT_ALLOWED',
                message: 'Método no permitido.'
            });
        }

        return sendJson(res, 200, {
            status: 'ok',
            authenticated: isManagerAuthenticated(req)
        });
    }

    if (pathname === '/api/auth/manager/logout') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, {
                status: 'error',
                error_code: 'METHOD_NOT_ALLOWED',
                message: 'Método no permitido.'
            });
        }

        clearManagerSessionCookie(res);

        return sendJson(res, 200, {
            status: 'ok',
            authenticated: false
        });
    }

    return sendJson(res, 404, {
        status: 'error',
        error_code: 'AUTH_ROUTE_NOT_FOUND',
        message: 'Ruta de autenticación no encontrada.'
    });
}
// === AUTH GESTOR V1 END ===

const server = http.createServer(async (req, res) => {
    const pathname = req.url.split('?')[0];

    if (pathname.startsWith('/api/auth/manager/')) {
        handleManagerAuthRoute(req, res, pathname);
        return;
    }

    // AUTH V2 pendiente: /api/clients/entities queda público temporalmente para no romper Portal Entidad.
    // En producción debe sustituirse por client_id controlado, token de cliente, magic link o endpoint público limitado.
    if (isProtectedManagerApiPath(pathname) && !isManagerAuthenticated(req)) {
        requireManagerAuth(req, res);
        return;
    }


    // API Route: GET /api/radar/items
    if (req.url.split('?')[0] === '/api/radar/items' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const status = searchParams.get('status');
            let limit = parseInt(searchParams.get('limit'));
            if (isNaN(limit) || limit <= 0) limit = 50;
            if (limit > 100) limit = 100;

            const db = new DatabaseSync(DB_PATH);
            let items = [];
            
            if (status) {
                const stmt = db.prepare('SELECT * FROM radar_items WHERE review_status = ? ORDER BY created_at DESC LIMIT ?');
                items = stmt.all(status, limit);
            } else {
                const stmt = db.prepare('SELECT * FROM radar_items ORDER BY created_at DESC LIMIT ?');
                items = stmt.all(limit);
            }
            db.close();

            const formattedItems = items.map(item => ({
                ...item,
                exports: {
                    mrk_url: `/api/radar/items/${item.id}/export/mrk`,
                    txt_url: `/api/radar/items/${item.id}/export/txt`,
                    preview_url: `/api/radar/items/${item.id}/export/preview`
                }
            }));

            return sendJson(res, 200, {
                status: 'ok',
                count: formattedItems.length,
                items: formattedItems
            });
        } catch (err) {
            console.error('Database query error:', err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/radar/items/:id
    const radarItemDetailMatch = req.url.split('?')[0].match(/^\/api\/radar\/items\/([^/]+)$/);
    if (radarItemDetailMatch && req.method === 'GET') {
        const id = radarItemDetailMatch[1];
        
        try {
            const db = new DatabaseSync(DB_PATH);
            
            const item = db.prepare('SELECT * FROM radar_items WHERE id = ?').get(id);
            if (!item) {
                db.close();
                return sendJson(res, 404, { status: 'error', error_code: 'radar_item_not_found' });
            }

            const document = db.prepare('SELECT * FROM radar_documents WHERE radar_item_id = ? ORDER BY created_at DESC LIMIT 1').get(id) || {};
            const marc_record = db.prepare('SELECT * FROM radar_marc_records WHERE radar_item_id = ? ORDER BY created_at DESC LIMIT 1').get(id) || {};
            const export_record = db.prepare('SELECT * FROM radar_exports WHERE radar_item_id = ? ORDER BY created_at DESC LIMIT 1').get(id) || {};
            const review_logs = db.prepare('SELECT * FROM radar_review_logs WHERE radar_item_id = ? ORDER BY created_at DESC').all(id) || [];
            
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                item: item,
                document: document,
                marc_record: marc_record,
                export: export_record,
                review_logs: review_logs
            });
        } catch (err) {
            console.error('Database query error:', err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/radar/items/:id/export/(mrk|txt|preview)
    const radarExportMatch = req.url.match(/^\/api\/radar\/items\/([^/]+)\/export\/(mrk|txt|preview)$/);
    if (radarExportMatch && req.method === 'GET') {
        const id = radarExportMatch[1];
        const format = radarExportMatch[2];

        try {
            const db = new DatabaseSync(DB_PATH);
            const stmt = db.prepare('SELECT * FROM radar_marc_records WHERE radar_item_id = ? ORDER BY created_at DESC LIMIT 1');
            const record = stmt.get(id);
            db.close();

            if (!record) {
                return sendJson(res, 404, { status: 'error', error_code: 'marc_record_not_found' });
            }

            const mrkContent = marcFieldsToMrk(record.marc_fields_order_json, record.marc_fields_json, record.field_008_components_json);

            if (format === 'preview') {
                return sendJson(res, 200, {
                    status: 'ok',
                    radar_item_id: id,
                    record_id: record.record_id,
                    mrk_content: mrkContent
                });
            }

            const filename = `${record.record_id}.${format}`;
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            });
            return res.end(mrkContent);

        } catch (err) {
            console.error('Export error:', err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: POST /api/radar/intake
    if (req.url === '/api/radar/intake') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { error: 'method_not_allowed' });
        }

        let chunks = [];
        req.on('data', chunk => { chunks.push(chunk); });
        req.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const payload = parseJsonSafe(body);
            if (!payload || !payload.workflow_output) {
                return sendJson(res, 400, { error: 'invalid_payload', message: 'Missing workflow_output' });
            }

            try {
                const db = new DatabaseSync(DB_PATH);

                const source = payload.source || {};
                const workflow = payload.workflow_output || {};
                const control = payload.control || {};
                const lorena = workflow.lorena || {};
                const marc = workflow.marc || {};
                
                const marc_bib = marc.bibliographic_data || {};
                const lorena_marc = lorena.marc_input || {};
                const lorena_radar = lorena.radar_analysis || {};
                const raw_input = payload.raw_input || {};

                // 1. title
                const title = marc_bib.titulo_normalizado || 
                              lorena_marc.titulo || 
                              lorena_radar.titulo || 
                              raw_input.content || 
                              'Untitled';

                // 2. source_name
                const source_name = marc_bib.fuente_oficial || 
                                    lorena_marc.fuente_oficial || 
                                    lorena_radar.fuente_oficial || 
                                    'Unknown';

                // 7. published_at
                const published_at = marc_bib.fecha_publicacion || 
                                     lorena_marc.fecha_publicacion || 
                                     null;

                if (control.force_create !== true) {
                    const checkStmt = db.prepare('SELECT id FROM radar_items WHERE title = ? AND source_name = ? AND published_at = ?');
                    const existing = checkStmt.get(title, source_name, published_at);

                    if (existing) {
                        db.close();
                        return sendJson(res, 200, {
                            status: 'duplicate_detected',
                            radar_item_id: existing.id,
                            review_status: 'pending_review',
                            action_taken: 'existing_item_returned'
                        });
                    }
                }

                const radar_item_id = generateId();
                const tenant_id = source.tenant_id || null;

                // 3. source_url
                let extracted_url = lorena_marc.url || "";
                if (!extracted_url) {
                    const fieldsArray = marc.marc_fields || (marc.marc && marc.marc.marc_fields) || [];
                    if (Array.isArray(fieldsArray)) {
                        const field856 = fieldsArray.find(f => f.tag === "856" || f.tag === 856);
                        if (field856 && Array.isArray(field856.subfields)) {
                            const subU = field856.subfields.find(s => s.code === "u");
                            if (subU) extracted_url = subU.value || "";
                        }
                    }
                }
                const source_url = extracted_url;

                // 4. document_type
                const document_type = marc_bib.tipo_disposicion || 
                                      lorena_marc.tipo_disposicion || 
                                      'documento_oficial';

                // 5. category
                let raw_category = lorena_radar.categoria_radar || 
                                   lorena_radar.category || 
                                   lorena_marc.tipo_disposicion || 
                                   'documento_oficial';
                const category = Array.isArray(raw_category) ? raw_category.join('; ') : raw_category;

                // 6. territory
                const territory = marc_bib.ambito_territorial || 
                                  lorena_marc.ambito_territorial || 
                                  lorena_radar.ambito_territorial || 
                                  'dato_no_proporcionado';

                const stmtItem = db.prepare(`
                    INSERT INTO radar_items 
                    (id, tenant_id, title, source_name, source_url, document_type, category, territory, published_at, review_status, needs_human_review, publish_to_client) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                stmtItem.run(
                    radar_item_id, tenant_id, title, source_name, source_url, document_type, category, territory, published_at,
                    'pending_review', 1, 0
                );

                const docId = generateId();
                const stmtDoc = db.prepare(`
                    INSERT INTO radar_documents 
                    (id, radar_item_id, raw_input_json, lorena_json, marc_json, quality_control_json) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                stmtDoc.run(
                    docId, radar_item_id,
                    JSON.stringify(payload.raw_input || {}),
                    JSON.stringify(workflow.lorena || {}),
                    JSON.stringify(workflow.marc || {}),
                    JSON.stringify(workflow.quality_control || {})
                );

                const marcAgentOutput = workflow.marc || null;
                const marcData = marcAgentOutput?.marc || null;
                const marcFields = Array.isArray(marcData?.marc_fields) ? marcData.marc_fields : [];
                const marcFieldsOrder = Array.isArray(marcData?.marc_fields_order) ? marcData.marc_fields_order : [];
                const field008Components = marcData?.field_008_components || null;
                const recordId = marcData?.record_id || marcAgentOutput?.marc?.record_id || null;

                if (marcData && marcFields.length > 0) {
                    const marcId = generateId();
                    const stmtMarc = db.prepare(`
                        INSERT INTO radar_marc_records 
                        (id, radar_item_id, record_id, marc_fields_order_json, marc_fields_json, field_008_components_json) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `);
                    stmtMarc.run(
                        marcId, radar_item_id,
                        recordId || radar_item_id,
                        JSON.stringify(marcFieldsOrder),
                        JSON.stringify(marcFields),
                        JSON.stringify(field008Components)
                    );
                }

                let mrk_available = false;
                let txt_available = false;
                let mrk_filename = null;
                let txt_filename = null;

                if (workflow.marc && workflow.marc.exports) {
                    const exId = generateId();
                    const ex = workflow.marc.exports;
                    mrk_filename = ex.mrk_filename || null;
                    txt_filename = ex.txt_filename || null;
                    if (mrk_filename) mrk_available = true;
                    if (txt_filename) txt_available = true;

                    const stmtEx = db.prepare(`
                        INSERT INTO radar_exports 
                        (id, radar_item_id, mrk_filename, txt_filename, rendering_method, download_ready) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    `);
                    stmtEx.run(
                        exId, radar_item_id, mrk_filename, txt_filename,
                        ex.rendering_method || null,
                        ex.download_ready ? 1 : 0
                    );
                }

                const logId = generateId();
                const actor = source.submitted_by || 'system';
                const stmtLog = db.prepare(`
                    INSERT INTO radar_review_logs 
                    (id, radar_item_id, action, actor, notes) 
                    VALUES (?, ?, ?, ?, ?)
                `);
                stmtLog.run(
                    logId, radar_item_id, 'created_from_intake', actor,
                    'Hallazgo creado desde POST /api/radar/intake en estado pending_review'
                );

                db.close();

                return sendJson(res, 201, {
                    status: 'created',
                    radar_item_id: radar_item_id,
                    review_status: 'pending_review',
                    needs_human_review: true,
                    publish_to_client: false,
                    exports: {
                        mrk_available: mrk_available,
                        txt_available: txt_available,
                        mrk_filename: mrk_filename,
                        txt_filename: txt_filename
                    },
                    next_action: 'review_in_advisory_panel'
                });

            } catch (err) {
                console.error('SQLite Error:', err);
                return sendJson(res, 500, { error: 'internal_error', details: err.message });
            }
        });
        return;
    }

    // API Route: POST /api/portal/interest-requests
    // write_switch_v1_portal_interest
    if (req.url === '/api/portal/interest-requests') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { error: 'method_not_allowed' });
        }

        let chunks = [];
        req.on('data', chunk => { chunks.push(chunk); });
        req.on('end', async () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const payload = parseJsonSafe(body);

            if (!payload || !payload.client_id || !payload.package_item_id) {
                return sendJson(res, 400, { error: 'invalid_payload', message: 'client_id and package_item_id are required' });
            }

            const { client_id, package_item_id, message } = payload;

            const client = getClientCatalog().find(c => c.id === client_id);
            if (!client) {
                return sendJson(res, 403, { error: 'forbidden', message: 'Client not found' });
            }

            const writeSource = getRadarWriteSource();
            const shouldUseSqlite = writeSource === RADAR_WRITE_SOURCE_SQLITE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
            const shouldUseSupabase = writeSource === RADAR_WRITE_SOURCE_SUPABASE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;

            let db = null;

            try {
                let sqliteItem = null;
                let supabaseItem = null;
                let sqliteRequest = null;
                let supabaseRequest = null;

                if (shouldUseSqlite) {
                    db = new DatabaseSync(DB_PATH);

                    const itemStmt = db.prepare('SELECT * FROM client_publication_package_items WHERE id = ? AND client_id = ? AND source_type = ?');
                    sqliteItem = itemStmt.get(package_item_id, client_id, 'aid_item');

                    if (!sqliteItem) {
                        return sendJson(res, 403, { error: 'forbidden', message: 'Item not found, does not belong to client, or is not an aid_item', write_source: writeSource });
                    }

                    if (!isPortalPublishedPackageItem(sqliteItem)) {
                        return sendJson(res, 403, { error: 'forbidden', message: 'Item is not visible in Portal Entidad', write_source: writeSource });
                    }

                    const pkgStmt = db.prepare('SELECT * FROM client_publication_packages WHERE id = ?');
                    const pkg = pkgStmt.get(sqliteItem.package_id);

                    if (!isPortalPublishedPackage(pkg)) {
                        return sendJson(res, 403, { error: 'forbidden', message: 'Parent package is not published', write_source: writeSource });
                    }

                    const existingStmt = db.prepare('SELECT * FROM client_interest_requests WHERE client_id = ? AND package_item_id = ? AND request_status = ?');
                    const existing = existingStmt.get(client_id, package_item_id, 'pending_contact');

                    if (existing) {
                        return sendJson(res, 200, {
                            status: 'ok',
                            action: 'existing_pending_request_found',
                            message: 'Ya tienes una solicitud pendiente para esta oportunidad.',
                            request: existing,
                            write_source: writeSource,
                            sqlite_action: 'existing_pending_request_found',
                            supabase_action: shouldUseSupabase ? 'not_attempted_existing_sqlite' : 'not_used'
                        });
                    }
                }

                if (shouldUseSupabase) {
                    const supabaseValidation = await getSupabasePortalInterestValidation({ client_id, package_item_id });

                    if (!supabaseValidation.ok) {
                        return sendJson(res, supabaseValidation.http_status || 500, {
                            error: supabaseValidation.error_code || 'supabase_validation_failed',
                            message: supabaseValidation.message || 'Supabase validation failed',
                            write_source: writeSource
                        });
                    }

                    supabaseItem = supabaseValidation.item;

                    const existingSupabase = await getSupabaseExistingPendingPortalInterestRequest({ client_id, package_item_id });

                    if (!existingSupabase.ok) {
                        return sendJson(res, existingSupabase.http_status || 500, {
                            error: existingSupabase.error_code || 'supabase_existing_check_failed',
                            message: existingSupabase.message || 'Supabase existing request check failed',
                            write_source: writeSource
                        });
                    }

                    if (existingSupabase.request) {
                        return sendJson(res, 200, {
                            status: 'ok',
                            action: 'existing_pending_request_found',
                            message: 'Ya tienes una solicitud pendiente para esta oportunidad.',
                            request: existingSupabase.request,
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_existing_supabase' : 'not_used',
                            supabase_action: 'existing_pending_request_found'
                        });
                    }
                }

                const item = supabaseItem || sqliteItem;
                const requestId = generateId();
                const now = new Date().toISOString();

                const request = buildPortalInterestRequest({
                    requestId,
                    item,
                    client_id,
                    clientName: client.name,
                    package_item_id,
                    message,
                    now
                });

                if (shouldUseSqlite) {
                    const insertStmt = db.prepare('INSERT INTO client_interest_requests (id, tenant_id, client_id, client_name, package_id, package_item_id, source_type, source_id, title, request_type, request_status, priority, message, created_at, updated_at, handled_at, handled_by, internal_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, null)');

                    insertStmt.run(
                        request.id,
                        request.tenant_id,
                        request.client_id,
                        request.client_name,
                        request.package_id,
                        request.package_item_id,
                        request.source_type,
                        request.source_id,
                        request.title,
                        request.request_type,
                        request.request_status,
                        request.priority,
                        request.message,
                        request.created_at,
                        request.updated_at
                    );

                    const newRequestStmt = db.prepare('SELECT * FROM client_interest_requests WHERE id = ?');
                    sqliteRequest = newRequestStmt.get(request.id);
                }

                if (shouldUseSupabase) {
                    const supabaseCreate = await createSupabasePortalInterestRequest(request);

                    if (!supabaseCreate.ok) {
                        return sendJson(res, supabaseCreate.http_status || 500, {
                            error: supabaseCreate.error_code || 'supabase_insert_failed',
                            message: supabaseCreate.message || 'Supabase insert failed',
                            write_source: writeSource,
                            sqlite_action: sqliteRequest ? 'created' : 'not_used',
                            supabase_action: 'failed'
                        });
                    }

                    supabaseRequest = supabaseCreate.request;
                }

                return sendJson(res, 200, {
                    status: 'ok',
                    action: 'created',
                    message: 'Solicitud registrada. Tu asesoría revisará esta oportunidad.',
                    request: supabaseRequest || sqliteRequest,
                    write_source: writeSource,
                    sqlite_action: shouldUseSqlite ? 'created' : 'not_used',
                    supabase_action: shouldUseSupabase ? 'created' : 'not_used'
                });

            } catch (err) {
                console.error('Portal interest request write switch error:', err);
                return sendJson(res, 500, {
                    error: 'internal_error',
                    message: 'Portal interest request could not be processed.',
                    write_source: writeSource
                });
            } finally {
                if (db) {
                    try { db.close(); } catch {}
                }
            }
        });
        return;
    }


    // API Route: POST /api/manager/interest-requests/:id/status
    // write_switch_v1_manager_interest_status
    // dual_write uses Supabase as primary reference and updates SQLite only if the row exists locally.
    if (req.url.split('?')[0].startsWith('/api/manager/interest-requests/') && req.url.split('?')[0].endsWith('/status')) {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { error: 'method_not_allowed' });
        }

        const pathParts = req.url.split('?')[0].split('/');
        const requestId = pathParts[4];

        if (!requestId) {
            return sendJson(res, 400, { error: 'missing_request_id', message: 'Missing interest request id' });
        }

        let chunks = [];
        req.on('data', chunk => { chunks.push(chunk); });
        req.on('end', async () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const payload = parseJsonSafe(body);

            if (!payload || !payload.request_status) {
                return sendJson(res, 400, { error: 'invalid_payload', message: 'request_status is required' });
            }

            const allowedStatuses = ['pending_contact', 'contacted', 'handled', 'dismissed'];

            if (!allowedStatuses.includes(payload.request_status)) {
                return sendJson(res, 400, {
                    error: 'invalid_request_status',
                    message: 'Invalid request_status',
                    allowed_statuses: allowedStatuses
                });
            }

            const writeSource = getRadarWriteSource();
            const shouldUseSqlite = writeSource === RADAR_WRITE_SOURCE_SQLITE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
            const shouldUseSupabase = writeSource === RADAR_WRITE_SOURCE_SUPABASE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;

            let db = null;

            try {
                let existing = null;
                let sqliteExisting = null;
                let supabaseExistingRequest = null;

                if (writeSource === RADAR_WRITE_SOURCE_SQLITE) {
                    db = new DatabaseSync(DB_PATH);
                    sqliteExisting = db.prepare('SELECT * FROM client_interest_requests WHERE id = ?').get(requestId);

                    if (!sqliteExisting) {
                        return sendJson(res, 404, {
                            error: 'not_found',
                            message: 'Interest request not found in SQLite.',
                            write_source: writeSource,
                            sqlite_action: 'not_found',
                            supabase_action: 'not_used'
                        });
                    }

                    existing = sqliteExisting;
                }

                if (shouldUseSupabase) {
                    const supabaseExisting = await getSupabaseInterestRequestByIdForStatusUpdate(requestId);

                    if (!supabaseExisting.ok) {
                        return sendJson(res, supabaseExisting.error_code === 'SUPABASE_INTEREST_REQUEST_NOT_FOUND' ? 404 : 503, {
                            error: 'supabase_interest_request_not_available',
                            error_code: supabaseExisting.error_code,
                            message: supabaseExisting.message,
                            write_source: writeSource,
                            sqlite_action: writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE ? 'not_attempted_after_supabase_select_failure' : 'not_used',
                            supabase_action: 'select_failed'
                        });
                    }

                    supabaseExistingRequest = supabaseExisting.request;
                    existing = supabaseExistingRequest;
                }

                const now = new Date().toISOString();
                const handledAt = ['handled', 'dismissed'].includes(payload.request_status)
                    ? (payload.handled_at || now)
                    : (existing.handled_at || null);

                const handledBy = payload.handled_by || existing.handled_by || 'gestor_demo';
                const internalNotes = payload.internal_notes ?? existing.internal_notes ?? null;

                const updatePayload = {
                    request_status: payload.request_status,
                    updated_at: now,
                    handled_at: handledAt,
                    handled_by: handledBy,
                    internal_notes: internalNotes
                };

                let supabaseUpdated = null;
                let sqliteUpdated = null;
                let sqliteAction = shouldUseSqlite ? 'not_attempted' : 'not_used';
                let supabaseAction = shouldUseSupabase ? 'not_attempted' : 'not_used';

                if (shouldUseSupabase) {
                    const supabaseUpdate = await updateSupabaseInterestRequestStatusForApi(requestId, updatePayload);

                    if (!supabaseUpdate.ok) {
                        return sendJson(res, 500, {
                            status: 'error',
                            error: 'supabase_update_failed',
                            error_code: supabaseUpdate.error_code,
                            message: supabaseUpdate.message,
                            action: 'interest_request_status_update_failed',
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_after_supabase_failure' : 'not_used',
                            supabase_action: 'failed',
                            request_id: requestId
                        });
                    }

                    supabaseUpdated = supabaseUpdate.request;
                    supabaseAction = 'updated';
                }

                if (shouldUseSqlite) {
                    if (!db) {
                        db = new DatabaseSync(DB_PATH);
                    }

                    sqliteExisting = sqliteExisting || db.prepare('SELECT * FROM client_interest_requests WHERE id = ?').get(requestId);

                    if (sqliteExisting) {
                        db.prepare(`
                            UPDATE client_interest_requests
                            SET
                                request_status = ?,
                                updated_at = ?,
                                handled_at = ?,
                                handled_by = ?,
                                internal_notes = ?
                            WHERE id = ?
                        `).run(
                            updatePayload.request_status,
                            updatePayload.updated_at,
                            updatePayload.handled_at,
                            updatePayload.handled_by,
                            updatePayload.internal_notes,
                            requestId
                        );

                        sqliteUpdated = db.prepare('SELECT * FROM client_interest_requests WHERE id = ?').get(requestId);
                        sqliteAction = 'updated';
                    } else if (writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE) {
                        sqliteAction = 'not_found_skipped';
                    } else {
                        sqliteAction = 'not_found';
                    }
                }

                const updated = supabaseUpdated || sqliteUpdated;

                return sendJson(res, 200, {
                    status: 'ok',
                    action: 'interest_request_status_updated',
                    write_source: writeSource,
                    sqlite_action: sqliteAction,
                    supabase_action: supabaseAction,
                    request: updated,
                    sqlite_request: sqliteUpdated,
                    supabase_request: supabaseUpdated
                });

            } catch (err) {
                console.error('Interest Request Status Write Switch Error:', err);
                return sendJson(res, 500, {
                    error: 'internal_error',
                    details: err.message,
                    write_source: getRadarWriteSource()
                });
            } finally {
                if (db) {
                    try { db.close(); } catch {}
                }
            }
        });

        return;
    }


    // API Route: GET /api/manager/supabase-read-services/clients/compare
    // supabase_read_services_v2_clients_compare
    if (req.url.split('?')[0] === '/api/manager/supabase-read-services/clients/compare' && req.method === 'GET') {
        const sqliteClients = getClientCatalog();
        const supabaseResult = await getSupabaseReadServicesClientsCatalog();

        if (!supabaseResult.ok) {
            return sendJson(res, 503, {
                status: 'error',
                mode: 'supabase_read_services_v2',
                resource: 'clients',
                sqlite: {
                    source: 'sqlite',
                    count: sqliteClients.length,
                    ids: sqliteClients.map(client => client.id)
                },
                supabase: supabaseResult
            });
        }

        const comparison = compareReadServicesClients(sqliteClients, supabaseResult.clients);

        return sendJson(res, 200, {
            status: comparison.all_match ? 'ok' : 'mismatch',
            mode: 'supabase_read_services_v2',
            resource: 'clients',
            source_of_truth_current: 'sqlite',
            supabase_usage: 'read_compare_only',
            sqlite: {
                source: 'sqlite',
                count: sqliteClients.length,
                clients: sortClientsForReadServicesCompare(sqliteClients.map(normalizeClientForReadServicesCompare))
            },
            supabase: {
                source: 'supabase',
                env_status: supabaseResult.env_status,
                count: supabaseResult.clients.length,
                clients: sortClientsForReadServicesCompare(supabaseResult.clients.map(normalizeClientForReadServicesCompare))
            },
            comparison
        });
    }



    // API Route: GET /api/manager/supabase-read-services/portal-packages/compare
    // supabase_read_services_v2_portal_packages_compare
    if (req.url.split('?')[0] === '/api/manager/supabase-read-services/portal-packages/compare' && req.method === 'GET') {
        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const clientId = searchParams.get('client_id');

        if (!clientId) {
            return sendJson(res, 400, {
                status: 'error',
                error_code: 'MISSING_CLIENT_ID',
                message: 'client_id is required'
            });
        }

        const sqliteResult = getSqliteReadServicesPortalPackages(clientId);

        if (!sqliteResult.ok) {
            return sendJson(res, 500, {
                status: 'error',
                mode: 'supabase_read_services_v2',
                resource: 'portal_packages',
                client_id: clientId,
                sqlite: sqliteResult
            });
        }

        const supabaseResult = await getSupabaseReadServicesPortalPackages(clientId);

        if (!supabaseResult.ok) {
            return sendJson(res, 503, {
                status: 'error',
                mode: 'supabase_read_services_v2',
                resource: 'portal_packages',
                client_id: clientId,
                sqlite: {
                    source: 'sqlite',
                    count: sqliteResult.packages.length,
                    package_ids: sqliteResult.packages.map(pkg => pkg.id)
                },
                supabase: supabaseResult
            });
        }

        const comparison = compareReadServicesPortalPackages(sqliteResult.packages, supabaseResult.packages);

        return sendJson(res, 200, {
            status: comparison.all_match ? 'ok' : 'mismatch',
            mode: 'supabase_read_services_v2',
            resource: 'portal_packages',
            client_id: clientId,
            source_of_truth_current: 'sqlite',
            supabase_usage: 'read_compare_only',
            sqlite_count: comparison.sqlite_count,
            supabase_count: comparison.supabase_count,
            sqlite_total_items: comparison.sqlite_total_items,
            supabase_total_items: comparison.supabase_total_items,
            counts_match: comparison.counts_match,
            package_ids_match: comparison.package_ids_match,
            package_fields_match: comparison.package_fields_match,
            item_counts_match: comparison.item_counts_match,
            item_ids_match: comparison.item_ids_match,
            item_fields_match: comparison.item_fields_match,
            all_match: comparison.all_match,
            sqlite_package_ids: comparison.sqlite_package_ids,
            supabase_package_ids: comparison.supabase_package_ids,
            missing_packages_in_supabase: comparison.missing_packages_in_supabase,
            extra_packages_in_supabase: comparison.extra_packages_in_supabase,
            package_field_mismatches: comparison.package_field_mismatches,
            item_count_mismatches: comparison.item_count_mismatches,
            item_id_mismatches: comparison.item_id_mismatches,
            item_field_mismatches: comparison.item_field_mismatches,
            sqlite: {
                source: 'sqlite',
                packages: sortPortalPackagesForReadServicesCompare(sqliteResult.packages.map(normalizePortalPackageForReadServicesCompare))
            },
            supabase: {
                source: 'supabase',
                env_status: supabaseResult.env_status,
                packages: sortPortalPackagesForReadServicesCompare(supabaseResult.packages.map(normalizePortalPackageForReadServicesCompare))
            }
        });
    }



    // API Route: GET /api/manager/supabase-read-services/commercial-dashboard/compare
    // supabase_read_services_v2_commercial_dashboard_compare
    if (req.url.split('?')[0] === '/api/manager/supabase-read-services/commercial-dashboard/compare' && req.method === 'GET') {
        const sqliteResult = getSqliteReadServicesCommercialDashboard();

        if (!sqliteResult.ok) {
            return sendJson(res, 500, {
                status: 'error',
                mode: 'supabase_read_services_v2',
                resource: 'commercial_dashboard',
                sqlite: sqliteResult
            });
        }

        const supabaseResult = await getSupabaseReadServicesCommercialDashboard();

        if (!supabaseResult.ok) {
            return sendJson(res, 503, {
                status: 'error',
                mode: 'supabase_read_services_v2',
                resource: 'commercial_dashboard',
                source_of_truth_current: 'sqlite',
                supabase_usage: 'read_compare_only',
                sqlite: {
                    source: 'sqlite',
                    counts: sqliteResult.dashboard.counts
                },
                supabase: supabaseResult
            });
        }

        const comparison = compareReadServicesCommercialDashboard(sqliteResult.dashboard, supabaseResult.dashboard);

        return sendJson(res, 200, {
            status: comparison.all_match ? 'ok' : 'mismatch',
            mode: 'supabase_read_services_v2',
            resource: 'commercial_dashboard',
            source_of_truth_current: 'sqlite',
            supabase_usage: 'read_compare_only',
            counts_match: comparison.counts_match,
            client_ids_match: comparison.client_ids_match,
            client_fields_match: comparison.client_fields_match,
            request_ids_match: comparison.request_ids_match,
            request_fields_match: comparison.request_fields_match,
            transportes_not_multiplied_ok: comparison.transportes_not_multiplied_ok,
            all_match: comparison.all_match,
            sqlite_counts: comparison.sqlite_counts,
            supabase_counts: comparison.supabase_counts,
            sqlite_client_ids: comparison.sqlite_client_ids,
            supabase_client_ids: comparison.supabase_client_ids,
            sqlite_request_ids: comparison.sqlite_request_ids,
            supabase_request_ids: comparison.supabase_request_ids,
            count_mismatches: comparison.count_mismatches,
            missing_clients_in_supabase: comparison.missing_clients_in_supabase,
            extra_clients_in_supabase: comparison.extra_clients_in_supabase,
            client_field_mismatches: comparison.client_field_mismatches,
            missing_requests_in_supabase: comparison.missing_requests_in_supabase,
            extra_requests_in_supabase: comparison.extra_requests_in_supabase,
            request_field_mismatches: comparison.request_field_mismatches,
            sqlite: {
                source: 'sqlite',
                dashboard: sqliteResult.dashboard
            },
            supabase: {
                source: 'supabase',
                env_status: supabaseResult.env_status,
                dashboard: supabaseResult.dashboard
            }
        });
    }


    // API Route: GET /api/manager/write-source/status
    // write_source_status_v1
    if (req.url.split('?')[0] === '/api/manager/write-source/status' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            mode: 'write_source_status_v1',
            ...getRadarWriteSourceStatus()
        });
    }


    // API Route: GET /api/manager/read-source/status
    // supabase_read_switch_v1
    if (req.url.split('?')[0] === '/api/manager/read-source/status' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            ...getRadarReadSourceStatus()
        });
    }

    // API Route: GET /api/manager/supabase-readonly/status
    if (req.url.split('?')[0] === '/api/manager/supabase-readonly/status' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            mode: 'supabase_backend_readonly_v1',
            supabase_readonly: getSupabaseReadonlyEnvStatus(),
            note: 'Read-only parallel integration. Current production endpoints still use SQLite.'
        });
    }

    // API Route: GET /api/manager/supabase-readonly/counts
    if (req.url.split('?')[0] === '/api/manager/supabase-readonly/counts' && req.method === 'GET') {
        const supabaseCounts = await getSupabaseReadonlyCounts();

        if (!supabaseCounts.ok) {
            return sendJson(res, 503, {
                status: 'error',
                ...supabaseCounts
            });
        }

        return sendJson(res, 200, {
            status: 'ok',
            mode: 'supabase_backend_readonly_v1',
            ...supabaseCounts
        });
    }

    // API Route: GET /api/manager/supabase-readonly/compare-counts
    if (req.url.split('?')[0] === '/api/manager/supabase-readonly/compare-counts' && req.method === 'GET') {
        const sqliteCounts = getSqliteReferenceCounts();
        const supabaseCounts = await getSupabaseReadonlyCounts();

        if (!supabaseCounts.ok) {
            return sendJson(res, 503, {
                status: 'error',
                sqlite: sqliteCounts,
                supabase: supabaseCounts
            });
        }

        const comparisons = SUPABASE_READONLY_TABLES.map(table => {
            const sqliteRow = sqliteCounts.counts.find(item => item.logical_name === table.logical_name);
            const supabaseRow = supabaseCounts.counts.find(item => item.logical_name === table.logical_name);
            const sqliteCount = Number(sqliteRow?.count || 0);
            const supabaseCount = Number(supabaseRow?.count || 0);

            return {
                logical_name: table.logical_name,
                sqlite_table: table.sqlite_table,
                supabase_table: table.supabase_table,
                sqlite_count: sqliteCount,
                supabase_count: supabaseCount,
                match: sqliteCount === supabaseCount
            };
        });

        return sendJson(res, 200, {
            status: comparisons.every(item => item.match) ? 'ok' : 'mismatch',
            mode: 'supabase_backend_readonly_v1',
            sqlite_db_path: sqliteCounts.db_path,
            supabase_env_status: supabaseCounts.env_status,
            comparisons
        });
    }

    // API Route: GET /api/manager/commercial-dashboard
    if (req.url.split('?')[0] === '/api/manager/commercial-dashboard' && req.method === 'GET') {

        if (getRadarReadSource() === RADAR_READ_SOURCE_SUPABASE_READONLY) {
            const supabaseDashboardResult = await getSupabaseReadSwitchCommercialDashboardForApi();

            if (!supabaseDashboardResult.ok) {
                return sendJson(res, 503, {
                    status: 'error',
                    mode: 'supabase_read_switch_v1',
                    resource: 'commercial_dashboard',
                    read_source: RADAR_READ_SOURCE_SUPABASE_READONLY,
                    source_of_truth_current: RADAR_READ_SOURCE_SUPABASE_READONLY,
                    error_code: supabaseDashboardResult.error_code || 'SUPABASE_READ_SWITCH_COMMERCIAL_DASHBOARD_ERROR',
                    message: supabaseDashboardResult.message || 'No se pudo leer dashboard comercial desde Supabase.',
                    supabase: supabaseDashboardResult
                });
            }

            return sendJson(res, 200, {
                status: 'ok',
                mode: 'supabase_read_switch_v1',
                resource: 'commercial_dashboard',
                read_source: RADAR_READ_SOURCE_SUPABASE_READONLY,
                source_of_truth_current: RADAR_READ_SOURCE_SUPABASE_READONLY,
                counts: supabaseDashboardResult.dashboard.counts,
                clients: supabaseDashboardResult.dashboard.clients,
                requests: supabaseDashboardResult.dashboard.requests,
                filters: supabaseDashboardResult.dashboard.filters
            });
        }

        let db;

        try {
            db = new DatabaseSync(DB_PATH);

            const packageRows = db.prepare(`
                SELECT
                    client_id,
                    client_name,
                    MAX(sector_key) AS sector_key,
                    COUNT(*) AS packages_total,
                    SUM(CASE
                        WHEN package_status = 'published'
                            AND review_status = 'approved'
                            AND needs_human_review = 0
                            AND publish_to_client = 1
                            AND client_publish_status = 'published'
                        THEN 1 ELSE 0
                    END) AS packages_published,
                    COALESCE(SUM(total_items), 0) AS total_package_items,
                    COALESCE(SUM(total_compliance_items), 0) AS total_compliance_items,
                    COALESCE(SUM(total_aid_items), 0) AS total_aid_items,
                    COALESCE(SUM(total_radar_items), 0) AS total_radar_items
                FROM client_publication_packages
                GROUP BY client_id, client_name
            `).all();

            const requestRows = db.prepare(`
                SELECT
                    client_id,
                    client_name,
                    COUNT(*) AS interest_requests_total,
                    SUM(CASE WHEN request_status = 'pending_contact' THEN 1 ELSE 0 END) AS pending_contact,
                    SUM(CASE WHEN request_status = 'contacted' THEN 1 ELSE 0 END) AS contacted,
                    SUM(CASE WHEN request_status = 'handled' THEN 1 ELSE 0 END) AS handled,
                    SUM(CASE WHEN request_status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed,
                    MAX(updated_at) AS last_request_update
                FROM client_interest_requests
                GROUP BY client_id, client_name
            `).all();

            const requestListRows = db.prepare(`
                SELECT
                    r.id,
                    r.client_id,
                    r.client_name,
                    r.package_id,
                    r.package_item_id,
                    r.source_type,
                    r.source_id,
                    r.title,
                    r.request_type,
                    r.request_status,
                    r.priority,
                    r.message,
                    r.created_at,
                    r.updated_at,
                    r.handled_at,
                    r.handled_by,
                    r.internal_notes,
                    p.sector_key AS sector_key,
                    p.package_status AS package_status,
                    p.client_publish_status AS client_publish_status,
                    i.summary AS source_summary,
                    i.legal_reference AS legal_reference,
                    i.source_name AS source_name,
                    i.source_url AS source_url,
                    i.amount_summary AS amount_summary,
                    i.deadline_label AS deadline_label,
                    i.eligibility_summary AS eligibility_summary
                FROM client_interest_requests r
                LEFT JOIN client_publication_packages p ON p.id = r.package_id
                LEFT JOIN client_publication_package_items i ON i.id = r.package_item_id
                ORDER BY COALESCE(r.updated_at, r.created_at) DESC, r.created_at DESC
            `).all();

            db.close();
            db = null;

            const catalogById = new Map(getClientCatalog().map(client => [client.id, client]));
            const toNumber = value => Number(value || 0);

            const nextActionForRequest = (status) => {
                if (status === 'pending_contact') return 'Contactar cliente';
                if (status === 'contacted') return 'Hacer seguimiento';
                if (status === 'handled') return 'Sin acción pendiente';
                if (status === 'dismissed') return 'No actuar';
                return 'Revisar manualmente';
            };

            const nextActionForClient = (client) => {
                if (client.pending_contact > 0) return 'Contactar cliente';
                if (client.contacted > 0) return 'Hacer seguimiento';
                if (client.handled === client.interest_requests_total && client.interest_requests_total > 0) return 'Sin acción pendiente';
                if (client.interest_requests_total === 0) return 'Sin solicitudes todavía';
                if (client.dismissed > 0 && client.pending_contact === 0 && client.contacted === 0) return 'Revisar descartadas';
                return 'Revisar manualmente';
            };

            const clientsById = new Map();
            const ensureClient = (clientId, clientName) => {
                const catalogClient = catalogById.get(clientId);

                if (!clientsById.has(clientId)) {
                    clientsById.set(clientId, {
                        client_id: clientId,
                        client_name: clientName || catalogClient?.name || clientId,
                        sector_key: catalogClient?.sector_key || null,
                        packages_total: 0,
                        packages_published: 0,
                        total_package_items: 0,
                        total_compliance_items: 0,
                        total_aid_items: 0,
                        total_radar_items: 0,
                        interest_requests_total: 0,
                        pending_contact: 0,
                        contacted: 0,
                        handled: 0,
                        dismissed: 0,
                        last_request_update: null,
                        next_action_recommended: 'Revisar manualmente'
                    });
                }

                return clientsById.get(clientId);
            };

            for (const row of packageRows) {
                const client = ensureClient(row.client_id, row.client_name);

                client.client_name = row.client_name || client.client_name;
                client.sector_key = row.sector_key || client.sector_key;
                client.packages_total += toNumber(row.packages_total);
                client.packages_published += toNumber(row.packages_published);
                client.total_package_items += toNumber(row.total_package_items);
                client.total_compliance_items += toNumber(row.total_compliance_items);
                client.total_aid_items += toNumber(row.total_aid_items);
                client.total_radar_items += toNumber(row.total_radar_items);
            }

            for (const row of requestRows) {
                const client = ensureClient(row.client_id, row.client_name);

                client.client_name = row.client_name || client.client_name;
                client.interest_requests_total += toNumber(row.interest_requests_total);
                client.pending_contact += toNumber(row.pending_contact);
                client.contacted += toNumber(row.contacted);
                client.handled += toNumber(row.handled);
                client.dismissed += toNumber(row.dismissed);

                if (!client.last_request_update || (row.last_request_update && row.last_request_update > client.last_request_update)) {
                    client.last_request_update = row.last_request_update || client.last_request_update;
                }
            }

            const clients = Array.from(clientsById.values())
                .map(client => ({
                    ...client,
                    next_action_recommended: nextActionForClient(client)
                }))
                .sort((a, b) => String(a.client_name).localeCompare(String(b.client_name)));

            const requests = requestListRows.map(row => {
                const catalogClient = catalogById.get(row.client_id);

                return {
                    id: row.id,
                    client_id: row.client_id,
                    client_name: row.client_name || catalogClient?.name || row.client_id,
                    package_id: row.package_id,
                    package_item_id: row.package_item_id,
                    source_type: row.source_type,
                    source_id: row.source_id,
                    title: row.title,
                    request_type: row.request_type,
                    request_status: row.request_status,
                    priority: row.priority,
                    message: row.message,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    handled_at: row.handled_at,
                    handled_by: row.handled_by,
                    internal_notes: row.internal_notes,
                    sector_key: row.sector_key || catalogClient?.sector_key || null,
                    package_status: row.package_status || null,
                    client_publish_status: row.client_publish_status || null,
                    summary: row.source_summary || null,
                    legal_reference: row.legal_reference || null,
                    source_name: row.source_name || null,
                    source_url: row.source_url || null,
                    amount_summary: row.amount_summary || null,
                    deadline_label: row.deadline_label || null,
                    eligibility_summary: row.eligibility_summary || null,
                    next_action_recommended: nextActionForRequest(row.request_status)
                };
            });

            const counts = {
                clients_total: clients.length,
                packages_published: clients.reduce((total, client) => total + client.packages_published, 0),
                package_items_total: clients.reduce((total, client) => total + client.total_package_items, 0),
                interest_requests_total: clients.reduce((total, client) => total + client.interest_requests_total, 0),
                pending_contact: clients.reduce((total, client) => total + client.pending_contact, 0),
                contacted: clients.reduce((total, client) => total + client.contacted, 0),
                handled: clients.reduce((total, client) => total + client.handled, 0),
                dismissed: clients.reduce((total, client) => total + client.dismissed, 0)
            };

            return sendJson(res, 200, {
                status: 'ok',
                counts,
                clients,
                requests,
                filters: {
                    clients: clients.map(client => ({
                        client_id: client.client_id,
                        client_name: client.client_name,
                        sector_key: client.sector_key
                    })),
                    statuses: ['pending_contact', 'contacted', 'handled', 'dismissed'],
                    request_types: Array.from(new Set(requests.map(item => item.request_type).filter(Boolean))).sort(),
                    priorities: Array.from(new Set(requests.map(item => item.priority).filter(Boolean))).sort()
                }
            });

        } catch (err) {
            if (db) {
                try { db.close(); } catch {}
            }

            console.error('Error loading commercial dashboard:', err);
            return sendJson(res, 500, {
                status: 'error',
                message: 'Error loading commercial dashboard',
                error: err.message
            });
        }
    }

    // API Route: GET /api/manager/interest-requests/summary
    if (req.url.split('?')[0] === '/api/manager/interest-requests/summary' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const clientId = searchParams.get('client_id');

            const db = new DatabaseSync(DB_PATH);

            let baseWhere = 'WHERE 1=1';
            const params = [];

            if (clientId) {
                baseWhere += ' AND client_id = ?';
                params.push(clientId);
            }

            const totalRow = db.prepare(`
                SELECT COUNT(*) AS total
                FROM client_interest_requests
                ${baseWhere}
            `).get(...params);

            const byStatusRows = db.prepare(`
                SELECT request_status, COUNT(*) AS total
                FROM client_interest_requests
                ${baseWhere}
                GROUP BY request_status
                ORDER BY request_status ASC
            `).all(...params);

            const byClientRows = db.prepare(`
                SELECT
                    client_id,
                    client_name,
                    COUNT(*) AS total,
                    SUM(CASE WHEN request_status = 'pending_contact' THEN 1 ELSE 0 END) AS pending_contact,
                    SUM(CASE WHEN request_status = 'contacted' THEN 1 ELSE 0 END) AS contacted,
                    SUM(CASE WHEN request_status = 'handled' THEN 1 ELSE 0 END) AS handled,
                    SUM(CASE WHEN request_status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed
                FROM client_interest_requests
                ${baseWhere}
                GROUP BY client_id, client_name
                ORDER BY total DESC, client_name ASC
            `).all(...params);

            const recentRows = db.prepare(`
                SELECT
                    id,
                    client_id,
                    client_name,
                    title,
                    request_type,
                    request_status,
                    priority,
                    message,
                    created_at,
                    updated_at,
                    handled_at,
                    handled_by
                FROM client_interest_requests
                ${baseWhere}
                ORDER BY created_at DESC
                LIMIT 10
            `).all(...params);

            const counts = {
                total: totalRow?.total || 0,
                pending_contact: 0,
                contacted: 0,
                handled: 0,
                dismissed: 0
            };

            for (const row of byStatusRows) {
                if (Object.prototype.hasOwnProperty.call(counts, row.request_status)) {
                    counts[row.request_status] = row.total;
                }
            }

            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                counts,
                by_status: byStatusRows,
                by_client: byClientRows,
                recent_requests: recentRows
            });

        } catch (err) {
            console.error('SQLite Error:', err);
            return sendJson(res, 500, { error: 'internal_error', details: err.message });
        }
    }

    // API Route: GET /api/manager/interest-requests
    if (req.url.split('?')[0] === '/api/manager/interest-requests' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const clientId = searchParams.get('client_id');
            const status = searchParams.get('status');
            let limit = parseInt(searchParams.get('limit'));
            if (isNaN(limit) || limit <= 0) limit = 50;
            if (limit > 100) limit = 100;

            const db = new DatabaseSync(DB_PATH);
            let query = 'SELECT * FROM client_interest_requests WHERE 1=1';
            const params = [];

            if (clientId) {
                query += ' AND client_id = ?';
                params.push(clientId);
            }
            if (status) {
                query += ' AND request_status = ?';
                params.push(status);
            }
            
            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const stmt = db.prepare(query);
            const requests = stmt.all(...params);
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                count: requests.length,
                requests: requests
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/clients/entities
    if (req.url.split('?')[0] === '/api/clients/entities' && req.method === 'GET') {

        if (getRadarReadSource() === RADAR_READ_SOURCE_SUPABASE_READONLY) {
            const supabaseClientsResult = await getSupabaseReadSwitchClientsForApi();

            if (!supabaseClientsResult.ok) {
                return sendJson(res, 503, {
                    status: 'error',
                    mode: 'supabase_read_switch_v1',
                    resource: 'clients',
                    read_source: RADAR_READ_SOURCE_SUPABASE_READONLY,
                    source_of_truth_current: RADAR_READ_SOURCE_SUPABASE_READONLY,
                    error_code: supabaseClientsResult.error_code || 'SUPABASE_READ_SWITCH_CLIENTS_ERROR',
                    message: supabaseClientsResult.message || 'No se pudo leer clientes desde Supabase.',
                    supabase: supabaseClientsResult
                });
            }

            return sendJson(res, 200, {
                status: 'ok',
                mode: 'supabase_read_switch_v1',
                resource: 'clients',
                read_source: RADAR_READ_SOURCE_SUPABASE_READONLY,
                source_of_truth_current: RADAR_READ_SOURCE_SUPABASE_READONLY,
                clients: supabaseClientsResult.clients
            });
        }

        const clients = getClientCatalog();

        return sendJson(res, 200, {
            status: 'ok',
            count: clients.length,
            clients
        });
    }

    // API Route: GET /api/compliance/sectors
    if (req.url.split('?')[0] === '/api/compliance/sectors' && req.method === 'GET') {
        try {
            const db = new DatabaseSync(DB_PATH);
            const sectors = db.prepare('SELECT * FROM compliance_sectors ORDER BY sector_name ASC').all();
            db.close();
            return sendJson(res, 200, {
                status: 'ok',
                count: sectors.length,
                sectors: sectors
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/compliance/obligations
    if (req.url.split('?')[0] === '/api/compliance/obligations' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const sector = searchParams.get('sector');
            const status = searchParams.get('status');
            
            let limit = parseInt(searchParams.get('limit'));
            if (isNaN(limit) || limit <= 0) limit = 50;
            if (limit > 100) limit = 100;

            const db = new DatabaseSync(DB_PATH);
            let obligations = [];
            let query = 'SELECT * FROM compliance_obligations WHERE 1=1';
            const params = [];

            if (sector) {
                query += ' AND sector_key = ?';
                params.push(sector);
            }
            if (status) {
                query += ' AND status = ?';
                params.push(status);
            }
            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const stmt = db.prepare(query);
            obligations = stmt.all(...params);
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                count: obligations.length,
                obligations: obligations
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/compliance/obligations/:id
    const complianceDetailMatch = req.url.split('?')[0].match(/^\/api\/compliance\/obligations\/([^/]+)$/);
    if (complianceDetailMatch && req.method === 'GET') {
        const id = complianceDetailMatch[1];
        try {
            const db = new DatabaseSync(DB_PATH);
            const obligation = db.prepare('SELECT * FROM compliance_obligations WHERE id = ?').get(id);
            if (!obligation) {
                db.close();
                return sendJson(res, 404, { status: 'error', error_code: 'compliance_obligation_not_found' });
            }
            
            const sources = db.prepare('SELECT * FROM compliance_sources WHERE obligation_id = ? ORDER BY created_at ASC').all(id) || [];
            const review_logs = db.prepare('SELECT * FROM compliance_review_logs WHERE obligation_id = ? ORDER BY created_at DESC').all(id) || [];
            
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                obligation: obligation,
                sources: sources,
                review_logs: review_logs
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/aids/items
    if (req.url.split('?')[0] === '/api/aids/items' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const status = searchParams.get('status');
            const aid_type = searchParams.get('aid_type');
            
            let limit = parseInt(searchParams.get('limit'));
            if (isNaN(limit) || limit <= 0) limit = 50;
            if (limit > 100) limit = 100;

            const db = new DatabaseSync(DB_PATH);
            let items = [];
            let query = 'SELECT * FROM aid_items WHERE 1=1';
            const params = [];

            if (status) {
                query += ' AND review_status = ?';
                params.push(status);
            }
            if (aid_type) {
                query += ' AND aid_type = ?';
                params.push(aid_type);
            }
            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const stmt = db.prepare(query);
            items = stmt.all(...params);
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                count: items.length,
                items: items
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/aids/items/:id
    const aidDetailMatch = req.url.split('?')[0].match(/^\/api\/aids\/items\/([^/]+)$/);
    if (aidDetailMatch && req.method === 'GET') {
        const id = aidDetailMatch[1];
        try {
            const db = new DatabaseSync(DB_PATH);
            const item = db.prepare('SELECT * FROM aid_items WHERE id = ?').get(id);
            if (!item) {
                db.close();
                return sendJson(res, 404, { status: 'error', error_code: 'aid_item_not_found' });
            }
            
            const sources = db.prepare('SELECT * FROM aid_sources WHERE aid_item_id = ? ORDER BY created_at ASC').all(id) || [];
            const review_logs = db.prepare('SELECT * FROM aid_review_logs WHERE aid_item_id = ? ORDER BY created_at DESC').all(id) || [];
            
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                item: item,
                sources: sources,
                review_logs: review_logs
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }


    // API Route: GET /api/manager/publication-package-items
    if (req.url.split('?')[0] === '/api/manager/publication-package-items' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const package_id = searchParams.get('package_id');
            const client_id = searchParams.get('client_id');

            if (!package_id) {
                return sendJson(res, 400, {
                    error: 'missing_package_id',
                    message: 'package_id is required'
                });
            }

            const db = new DatabaseSync(DB_PATH);

            let query = `
                SELECT *
                FROM client_publication_package_items
                WHERE package_id = ?
            `;

            const params = [package_id];

            if (client_id) {
                query += ' AND client_id = ?';
                params.push(client_id);
            }

            query += `
                ORDER BY
                    CASE source_type
                        WHEN 'compliance_obligation' THEN 1
                        WHEN 'aid_item' THEN 2
                        ELSE 3
                    END,
                    title ASC
            `;

            const items = db.prepare(query).all(...params);
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                count: items.length,
                items
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: GET /api/manager/publication-packages
    if (req.url.split('?')[0] === '/api/manager/publication-packages' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const client_id = searchParams.get('client_id');
            const status = searchParams.get('status');
            
            let limit = parseInt(searchParams.get('limit'));
            if (isNaN(limit) || limit <= 0) limit = 50;
            if (limit > 100) limit = 100;

            const db = new DatabaseSync(DB_PATH);
            let query = 'SELECT * FROM client_publication_packages WHERE 1=1';
            const params = [];

            if (client_id) {
                query += ' AND client_id = ?';
                params.push(client_id);
            }
            if (status) {
                query += ' AND package_status = ?';
                params.push(status);
            }
            query += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const packages = db.prepare(query).all(...params);
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                count: packages.length,
                packages: packages
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: POST /api/manager/publication-packages/generate
    if (req.url === '/api/manager/publication-packages/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const payload = parseJsonSafe(body);
            if (!payload || !payload.client_id || !payload.sector_key) {
                return sendJson(res, 400, { error: 'invalid_payload', message: 'Missing client_id or sector_key' });
            }

            const validClient = getClientCatalog().find(c => c.id === payload.client_id);
            if (!validClient) {
                return sendJson(res, 400, { error: 'invalid_client', message: 'El cliente indicado no existe en Clientes / Entidades.' });
            }

            try {
                const db = new DatabaseSync(DB_PATH);
                const date = new Date();
                const pad = function(n) { return n.toString().padStart(2, '0'); };
                const now = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
                
                // Validate sector
                const sector = db.prepare('SELECT * FROM compliance_sectors WHERE sector_key = ?').get(payload.sector_key);
                if (!sector) {
                    db.close();
                    return sendJson(res, 400, { error: 'invalid_sector', message: 'Sector key does not exist' });
                }

                const package_type = 'base_sector_package_v1';
                
                // Check if published package already exists
                const existingPublished = db.prepare(`
                    SELECT * FROM client_publication_packages 
                    WHERE client_id = ? AND sector_key = ? AND package_type = ? 
                    AND package_status = 'published' AND review_status = 'approved' 
                    AND publish_to_client = 1 AND needs_human_review = 0 AND client_publish_status = 'published'
                `).get(payload.client_id, payload.sector_key, package_type);

                if (existingPublished) {
                    // Get counts for response
                    const itemsCount = db.prepare("SELECT source_type, count(*) as c FROM client_publication_package_items WHERE package_id = ? GROUP BY source_type").all(existingPublished.id);
                    let total_compliance = 0, total_aid = 0, total_radar = 0;
                    for (let row of itemsCount) {
                        if (row.source_type === 'compliance_obligation') total_compliance = row.c;
                        if (row.source_type === 'aid_item') total_aid = row.c;
                        if (row.source_type === 'radar_item') total_radar = row.c;
                    }

                    db.close();
                    return sendJson(res, 200, {
                        status: 'ok',
                        action: 'existing_published_package_found',
                        message: 'Ya existe un paquete publicado para este cliente y sector.',
                        package: existingPublished,
                        counts: {
                            total_items: existingPublished.total_items,
                            total_compliance_items: total_compliance,
                            total_aid_items: total_aid,
                            total_radar_items: total_radar
                        }
                    });
                }

                // Check if draft already exists
                let pkg = db.prepare('SELECT id FROM client_publication_packages WHERE client_id = ? AND sector_key = ? AND package_type = ? AND package_status = ?').get(payload.client_id, payload.sector_key, package_type, 'draft_pending_review');
                
                let package_id = pkg ? pkg.id : generateId();

                if (pkg) {
                    // Clean previous items
                    db.exec("DELETE FROM client_publication_package_items WHERE package_id = '" + package_id + "'");
                }

                const obligations = db.prepare("SELECT * FROM compliance_obligations WHERE sector_key = ? AND id LIKE 'base_obligation_%'").all(payload.sector_key) || [];
                const aids = db.prepare("SELECT * FROM aid_items WHERE id LIKE 'aid_base_%'").all() || [];

                if (!pkg) {
                    db.prepare(`
                        INSERT INTO client_publication_packages (
                            id, tenant_id, client_id, client_name, sector_key, package_type, title, summary, 
                            package_status, review_status, needs_human_review, publish_to_client, client_publish_status, 
                            data_quality_warning, total_items, total_compliance_items, total_aid_items, total_radar_items, 
                            created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(
                        package_id, payload.tenant_id || 'default', payload.client_id, validClient.name,
                        payload.sector_key, package_type, 'Paquete Normativo y de Ayudas', 'Paquete base recomendado',
                        'draft_pending_review', 'pending_review', 1, 0, 'not_published',
                        1, obligations.length + aids.length, obligations.length, aids.length, 0,
                        now, now
                    );
                } else {
                    db.prepare(`
                        UPDATE client_publication_packages SET 
                            total_items = ?, total_compliance_items = ?, total_aid_items = ?, updated_at = ? 
                        WHERE id = ?
                    `).run(obligations.length + aids.length, obligations.length, aids.length, now, package_id);
                }

                const insertItem = db.prepare(`
                    INSERT INTO client_publication_package_items (
                        id, package_id, tenant_id, client_id, source_type, source_id, sector_key, title, summary, 
                        item_type, obligation_type, request_type, risk_level, territory, source_name, source_url, 
                        legal_reference, amount_summary, deadline_label, eligibility_summary, tags_json, 
                        include_in_package, review_status, needs_human_review, publish_to_client, client_publish_status, 
                        data_quality_warning, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                for (const obl of obligations) {
                    insertItem.run(
                        generateId(), package_id, payload.tenant_id || 'default', payload.client_id, 
                        'compliance_obligation', obl.id ?? null, payload.sector_key, obl.title ?? null, obl.summary ?? null,
                        obl.obligation_type ?? null, obl.obligation_type ?? null, null, obl.risk_level ?? null, obl.territory ?? null,
                        obl.source_name ?? null, obl.source_url ?? null, obl.legal_reference ?? null, null, null, null,
                        obl.tags_json ?? null, 1, 'pending_review', 1, 0, 'not_published',
                        obl.data_quality_warning ?? 1, now, now
                    );
                }

                for (const aid of aids) {
                    insertItem.run(
                        generateId(), package_id, payload.tenant_id || 'default', payload.client_id, 
                        'aid_item', aid.id ?? null, payload.sector_key, aid.title ?? null, aid.summary ?? null,
                        aid.aid_type ?? null, null, aid.request_type ?? null, null, aid.territory ?? null,
                        aid.source_name ?? null, aid.source_url ?? null, aid.official_reference ?? null, aid.amount_summary ?? null, aid.deadline_label ?? null, aid.eligibility_summary ?? null,
                        aid.tags_json ?? null, 1, 'pending_review', 1, 0, 'not_published',
                        aid.data_quality_warning ?? 1, now, now
                    );
                }

                db.prepare(`
                    INSERT INTO client_publication_logs (id, package_id, tenant_id, client_id, action, actor, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(generateId(), package_id, payload.tenant_id || 'default', payload.client_id, 'package_generated_pending_review', payload.generated_by || 'system', 'Package drafted', now);

                const generatedPkg = db.prepare('SELECT * FROM client_publication_packages WHERE id = ?').get(package_id);
                db.close();

                return sendJson(res, 200, {
                    status: 'ok',
                    package: generatedPkg,
                    counts: {
                        total_items: obligations.length + aids.length,
                        total_compliance_items: obligations.length,
                        total_aid_items: aids.length,
                        total_radar_items: 0
                    }
                });
            } catch (err) {
                console.error(err);
                return sendJson(res, 500, { error: 'internal_error' });
            }
        });
        return;
    }

    // API Route: GET /api/manager/publication-packages/:id
    const packageDetailMatch = req.url.split('?')[0].match(/^\/api\/manager\/publication-packages\/([^/]+)$/);
    if (packageDetailMatch && req.method === 'GET') {
        const id = packageDetailMatch[1];
        try {
            const db = new DatabaseSync(DB_PATH);
            const pkg = db.prepare('SELECT * FROM client_publication_packages WHERE id = ?').get(id);
            if (!pkg) {
                db.close();
                return sendJson(res, 404, { status: 'error', error_code: 'package_not_found' });
            }
            
            const items = db.prepare('SELECT * FROM client_publication_package_items WHERE package_id = ? ORDER BY created_at ASC').all(id) || [];
            const review_logs = db.prepare('SELECT * FROM client_publication_logs WHERE package_id = ? ORDER BY created_at DESC').all(id) || [];
            db.close();

            return sendJson(res, 200, {
                status: 'ok',
                package: pkg,
                items: items,
                review_logs: review_logs
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: POST /api/manager/publication-packages/:id/publish
    const packagePublishMatch = req.url.match(/^\/api\/manager\/publication-packages\/([^/]+)\/publish$/);
    if (packagePublishMatch && req.method === 'POST') {
        const id = packagePublishMatch[1];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const payload = parseJsonSafe(body);
            if (!payload || payload.confirm_publish !== true) {
                return sendJson(res, 400, { error: 'invalid_payload', message: 'confirm_publish = true is required' });
            }

            try {
                const db = new DatabaseSync(DB_PATH);
                const pkg = db.prepare('SELECT * FROM client_publication_packages WHERE id = ?').get(id);
                if (!pkg) {
                    db.close();
                    return sendJson(res, 404, { status: 'error', error_code: 'package_not_found' });
                }

                const validClient = getClientCatalog().find(c => c.id === pkg.client_id);
                if (!validClient) {
                    db.close();
                    return sendJson(res, 400, { error: 'invalid_client', message: 'No se puede publicar un paquete de un cliente que no existe en Clientes / Entidades.' });
                }

                if (pkg.package_status === 'published') {
                    db.close();
                    return sendJson(res, 200, { status: 'ok', action: 'already_published_noop' });
                }

                // Check for duplicates
                const duplicatePublished = db.prepare(`
                    SELECT id FROM client_publication_packages 
                    WHERE client_id = ? AND sector_key = ? AND package_type = ? 
                    AND id != ? AND package_status = 'published' AND review_status = 'approved'
                    AND publish_to_client = 1 AND needs_human_review = 0 AND client_publish_status = 'published'
                `).get(pkg.client_id, pkg.sector_key, pkg.package_type, pkg.id);

                if (duplicatePublished) {
                    db.close();
                    return sendJson(res, 200, { 
                        status: 'ok', 
                        ok: false,
                        action: 'published_package_already_exists', 
                        message: 'Ya existe otro paquete publicado para este cliente y sector. No se puede publicar duplicado.',
                        existing_package_id: duplicatePublished.id
                    });
                }

                const date = new Date();
                const pad = function(n) { return n.toString().padStart(2, '0'); };
                const now = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());

                db.prepare(`
                    UPDATE client_publication_packages SET 
                        package_status = 'published', review_status = 'approved', 
                        needs_human_review = 0, publish_to_client = 1, client_publish_status = 'published',
                        approved_at = ?, approved_by = ?, published_at = ?, published_by = ?, updated_at = ?
                    WHERE id = ?
                `).run(now, payload.published_by || 'gestor_demo', now, payload.published_by || 'gestor_demo', now, id);

                db.prepare(`
                    UPDATE client_publication_package_items SET 
                        review_status = 'approved', needs_human_review = 0, 
                        publish_to_client = 1, client_publish_status = 'published', updated_at = ?
                    WHERE package_id = ?
                `).run(now, id);

                db.prepare(`
                    INSERT INTO client_publication_logs (id, package_id, tenant_id, client_id, action, actor, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(generateId(), id, pkg.tenant_id, pkg.client_id, 'package_published_by_manager', payload.published_by || 'gestor_demo', payload.notes || 'Package published to client', now);

                db.close();

                return sendJson(res, 200, { status: 'ok', action: 'published' });
            } catch (err) {
                console.error(err);
                return sendJson(res, 500, { error: 'internal_error' });
            }
        });
        return;
    }

    // Portal APIs (Fail-closed)
    if (req.url.split('?')[0] === '/api/portal/summary' && req.method === 'GET') {
        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const client_id = searchParams.get('client_id');
        if (!client_id) {
            return sendJson(res, 400, { error: 'missing_client_id' });
        }
        try {
            const db = new DatabaseSync(DB_PATH);
            const pkgsCount = db.prepare("SELECT count(*) as c FROM client_publication_packages WHERE client_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND package_status = 'published' AND client_publish_status = 'published'").get(client_id).c;
            const itemsCount = db.prepare("SELECT source_type, count(*) as c FROM client_publication_package_items WHERE client_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 GROUP BY source_type").all(client_id);
            db.close();
            
            let total_compliance_items = 0;
            let total_aid_items = 0;
            let total_radar_items = 0;
            
            for (let row of itemsCount) {
                if (row.source_type === 'compliance_obligation') total_compliance_items = row.c;
                if (row.source_type === 'aid_item') total_aid_items = row.c;
                if (row.source_type === 'radar_item') total_radar_items = row.c;
            }

            return sendJson(res, 200, {
                status: 'ok',
                total_published_packages: pkgsCount,
                total_compliance_items: total_compliance_items,
                total_aid_items: total_aid_items,
                total_radar_items: total_radar_items
            });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    if (req.url.split('?')[0] === '/api/portal/packages' && req.method === 'GET') {

        if (getRadarReadSource() === RADAR_READ_SOURCE_SUPABASE_READONLY) {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const client_id = searchParams.get('client_id');

            if (!client_id) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'CLIENT_ID_REQUIRED',
                    message: 'client_id es obligatorio.'
                });
            }

            const supabasePackagesResult = await getSupabaseReadSwitchPortalPackagesForApi(client_id);

            if (!supabasePackagesResult.ok) {
                return sendJson(res, 503, {
                    status: 'error',
                    mode: 'supabase_read_switch_v1',
                    resource: 'portal_packages',
                    read_source: RADAR_READ_SOURCE_SUPABASE_READONLY,
                    source_of_truth_current: RADAR_READ_SOURCE_SUPABASE_READONLY,
                    client_id,
                    error_code: supabasePackagesResult.error_code || 'SUPABASE_READ_SWITCH_PORTAL_PACKAGES_ERROR',
                    message: supabasePackagesResult.message || 'No se pudo leer paquetes de portal desde Supabase.',
                    supabase: supabasePackagesResult
                });
            }

            return sendJson(res, 200, {
                status: 'ok',
                mode: 'supabase_read_switch_v1',
                resource: 'portal_packages',
                read_source: RADAR_READ_SOURCE_SUPABASE_READONLY,
                source_of_truth_current: RADAR_READ_SOURCE_SUPABASE_READONLY,
                client_id,
                packages: supabasePackagesResult.packages
            });
        }

        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const client_id = searchParams.get('client_id');
        if (!client_id) {
            return sendJson(res, 400, { error: 'missing_client_id' });
        }
        try {
            const db = new DatabaseSync(DB_PATH);
            const packages = db.prepare("SELECT * FROM client_publication_packages WHERE client_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND package_status = 'published' AND client_publish_status = 'published' ORDER BY published_at DESC").all(client_id);
            
            for (let pkg of packages) {
                pkg.items = db.prepare("SELECT * FROM client_publication_package_items WHERE package_id = ? AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 ORDER BY created_at ASC").all(pkg.id);
            }
            db.close();
            return sendJson(res, 200, { status: 'ok', packages: packages });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    if (req.url.split('?')[0] === '/api/portal/compliance/obligations' && req.method === 'GET') {
        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const client_id = searchParams.get('client_id');
        if (!client_id) return sendJson(res, 400, { error: 'missing_client_id' });
        try {
            const db = new DatabaseSync(DB_PATH);
            const items = db.prepare("SELECT * FROM client_publication_package_items WHERE client_id = ? AND source_type = 'compliance_obligation' AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 ORDER BY created_at ASC").all(client_id);
            db.close();
            return sendJson(res, 200, { status: 'ok', count: items.length, items: items });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    if (req.url.split('?')[0] === '/api/portal/aids/items' && req.method === 'GET') {
        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const client_id = searchParams.get('client_id');
        if (!client_id) return sendJson(res, 400, { error: 'missing_client_id' });
        try {
            const db = new DatabaseSync(DB_PATH);
            const items = db.prepare("SELECT * FROM client_publication_package_items WHERE client_id = ? AND source_type = 'aid_item' AND publish_to_client = 1 AND needs_human_review = 0 AND review_status = 'approved' AND client_publish_status = 'published' AND include_in_package = 1 ORDER BY created_at ASC").all(client_id);
            db.close();
            return sendJson(res, 200, { status: 'ok', count: items.length, items: items });
        } catch (err) {
            console.error(err);
            return sendJson(res, 500, { error: 'internal_error' });
        }
    }

    // API Route: PUT
    if (req.url.startsWith('/api/alertas/') && req.method === 'PUT') {
        const id = req.url.split('/')[3];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const { estado } = JSON.parse(body);
                if (['Verde', 'Rojo', 'Naranja', 'Pendiente_Asesor'].includes(estado)) {
                    const db = new DatabaseSync(DB_PATH);
                    const stmt = db.prepare('UPDATE Alertas_Cumplimiento SET estado = ? WHERE id = ?');
                    stmt.run(estado, id);
                    db.close();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(400); res.end('Invalid state');
                }
            } catch (e) {
                console.error(e);
                res.writeHead(500); res.end('Server Error');
            }
        });
        return;
    }

    // API Route: GET
    if (req.url === '/api/asesorias' && req.method === 'GET') {
        try {
            const db = new DatabaseSync(DB_PATH);
            const asesorias = db.prepare('SELECT * FROM Orgs_Asesorias').all();

            for (let org of asesorias) {
                org.clients = db.prepare('SELECT * FROM User_Clients WHERE org_id = ?').all(org.id);
                for (let client of org.clients) {
                    client.alertas = db.prepare('SELECT * FROM Alertas_Cumplimiento WHERE client_id = ?').all(client.id);
                    client.subvenciones = db.prepare('SELECT * FROM Subvenciones WHERE client_id = ?').all(client.id);
                }
            }
            db.close();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(asesorias));
        } catch (error) {
            console.error('Database query error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
        return;
    }

    // Static
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        return res.end('Forbidden');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`Radar Asesorias server running at http://localhost:${PORT}/`);
    });
}

export default function handler(req, res) {
    return server.emit('request', req, res);
}

