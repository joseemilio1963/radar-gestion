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
let supabaseStorageClient = null;

function getClientDocumentsStorageBucket() {
    return String(process.env.RADAR_CLIENT_DOCUMENTS_BUCKET || 'radar-client-documents').trim() || 'radar-client-documents';
}

function isSupabaseReadonlyEnabled() {
    return String(process.env.SUPABASE_READONLY_ENABLED || '').toLowerCase() === 'true';
}
function isQuarterlyDocumentationEnabled() {
    return String(process.env.RADAR_QUARTERLY_DOCUMENTATION_ENABLED || '').toLowerCase() === 'true';
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

function getSupabaseStorageEnvStatus() {
    const urlPresent = Boolean(process.env.SUPABASE_URL);
    const keyPresent = Boolean(process.env.SUPABASE_SERVER_KEY);

    return {
        configured: urlPresent && keyPresent,
        url_present: urlPresent,
        key_present: keyPresent,
        key_is_server_side_only: true,
        bucket: getClientDocumentsStorageBucket()
    };
}

function getSupabaseStorageClient() {
    const envStatus = getSupabaseStorageEnvStatus();

    if (!envStatus.configured) {
        return {
            ok: false,
            error_code: 'SUPABASE_STORAGE_ENV_MISSING',
            message: 'Supabase Storage no está configurado. Configura SUPABASE_URL y SUPABASE_SERVER_KEY en el backend.',
            env_status: envStatus
        };
    }

    if (!supabaseStorageClient) {
        supabaseStorageClient = createClient(
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
        client: supabaseStorageClient,
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


function initClientPortalAccessTables() {
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS client_portal_access (
            client_id TEXT PRIMARY KEY,
            authorized_phone_hash TEXT NOT NULL,
            access_key_hash TEXT,
            access_key_salt TEXT,
            access_configured INTEGER NOT NULL DEFAULT 0,
            failed_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);
    db.close();
}
initClientPortalAccessTables();

function initQuarterlyDocumentationTables(db) {
    db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS quarterly_documentation_periods (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            year INTEGER NOT NULL,
            quarter INTEGER NOT NULL,
            period_label TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(client_id, year, quarter),
            CHECK (quarter >= 1 AND quarter <= 4)
        );

        CREATE TABLE IF NOT EXISTS quarterly_documentation_expected_documents (
            id TEXT PRIMARY KEY,
            period_id TEXT NOT NULL,
            document_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            required INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'pending',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(period_id) REFERENCES quarterly_documentation_periods(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS quarterly_documentation_documents (
            id TEXT PRIMARY KEY,
            period_id TEXT NOT NULL,
            expected_document_id TEXT,
            client_id TEXT NOT NULL,
            document_type TEXT NOT NULL,
            source_type TEXT NOT NULL DEFAULT 'manual',
            file_name TEXT,
            file_mime TEXT,
            file_size INTEGER,
            storage_path TEXT,
            document_date TEXT,
            supplier_or_customer TEXT,
            amount_gross REAL NOT NULL DEFAULT 0,
            amount_net REAL NOT NULL DEFAULT 0,
            vat_amount REAL NOT NULL DEFAULT 0,
            income_amount REAL NOT NULL DEFAULT 0,
            expense_amount REAL NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'EUR',
            review_status TEXT NOT NULL DEFAULT 'pending_review',
            notes TEXT,
            deleted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(period_id) REFERENCES quarterly_documentation_periods(id) ON DELETE CASCADE,
            FOREIGN KEY(expected_document_id) REFERENCES quarterly_documentation_expected_documents(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS quarterly_documentation_review_logs (
            id TEXT PRIMARY KEY,
            period_id TEXT,
            document_id TEXT,
            action TEXT NOT NULL,
            previous_status TEXT,
            new_status TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(period_id) REFERENCES quarterly_documentation_periods(id) ON DELETE SET NULL,
            FOREIGN KEY(document_id) REFERENCES quarterly_documentation_documents(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_quarterly_documentation_periods_client_year_quarter
            ON quarterly_documentation_periods(client_id, year, quarter);

        CREATE INDEX IF NOT EXISTS idx_quarterly_documentation_expected_documents_period
            ON quarterly_documentation_expected_documents(period_id);

        CREATE INDEX IF NOT EXISTS idx_quarterly_documentation_documents_period
            ON quarterly_documentation_documents(period_id);

        CREATE INDEX IF NOT EXISTS idx_quarterly_documentation_documents_client
            ON quarterly_documentation_documents(client_id);

        CREATE INDEX IF NOT EXISTS idx_quarterly_documentation_documents_expected
            ON quarterly_documentation_documents(expected_document_id);

        CREATE INDEX IF NOT EXISTS idx_quarterly_documentation_review_logs_period
            ON quarterly_documentation_review_logs(period_id);

        CREATE INDEX IF NOT EXISTS idx_quarterly_documentation_review_logs_document
            ON quarterly_documentation_review_logs(document_id);
    `);
}
function initClientProcedureTables() {
    const db = new DatabaseSync(DB_PATH);
    db.exec(`
        CREATE TABLE IF NOT EXISTS client_procedure_requests (
            id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            procedure_type TEXT NOT NULL,
            entity_type TEXT,
            title TEXT NOT NULL,
            description TEXT,
            employee_name TEXT,
            priority TEXT DEFAULT 'normal',
            status TEXT DEFAULT 'open',
            due_date TEXT,
            period_type TEXT,
            period_value TEXT,
            fiscal_year TEXT,
            procedure_subtype TEXT,
            reference_label TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS client_required_documents (
            id TEXT PRIMARY KEY,
            procedure_id TEXT NOT NULL,
            document_key TEXT NOT NULL,
            document_label TEXT NOT NULL,
            required INTEGER DEFAULT 1,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS client_uploaded_documents (
            id TEXT PRIMARY KEY,
            procedure_id TEXT NOT NULL,
            required_document_id TEXT,
            client_id TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            safe_filename TEXT NOT NULL,
            storage_bucket TEXT NOT NULL,
            storage_path TEXT NOT NULL,
            mime_type TEXT,
            file_size INTEGER,
            uploaded_by TEXT,
            status TEXT DEFAULT 'received',
            notes TEXT,
            deleted_at TEXT,
            deleted_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS client_document_review_logs (
            id TEXT PRIMARY KEY,
            procedure_id TEXT NOT NULL,
            required_document_id TEXT,
            uploaded_document_id TEXT,
            action TEXT NOT NULL,
            actor TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const procedureRequestColumns = db.prepare('PRAGMA table_info(client_procedure_requests)').all();
    const procedureRequestColumnNames = new Set(procedureRequestColumns.map(column => column.name));
    const ensureClientProcedureColumn = (columnName, definition) => {
        if (!procedureRequestColumnNames.has(columnName)) {
            db.exec(`ALTER TABLE client_procedure_requests ADD COLUMN ${columnName} ${definition}`);
            procedureRequestColumnNames.add(columnName);
        }
    };

    ensureClientProcedureColumn('entity_type', 'TEXT');
    ensureClientProcedureColumn('period_type', 'TEXT');
    ensureClientProcedureColumn('period_value', 'TEXT');
    ensureClientProcedureColumn('fiscal_year', 'TEXT');
    ensureClientProcedureColumn('procedure_subtype', 'TEXT');
    ensureClientProcedureColumn('reference_label', 'TEXT');

    const uploadedDocumentColumns = db.prepare('PRAGMA table_info(client_uploaded_documents)').all();
    const hasDeletedAt = uploadedDocumentColumns.some(column => column.name === 'deleted_at');
    const hasDeletedReason = uploadedDocumentColumns.some(column => column.name === 'deleted_reason');

    if (!hasDeletedAt) {
        db.exec('ALTER TABLE client_uploaded_documents ADD COLUMN deleted_at TEXT');
    }

    if (!hasDeletedReason) {
        db.exec('ALTER TABLE client_uploaded_documents ADD COLUMN deleted_reason TEXT');
    }

    db.close();
}
initClientProcedureTables();

if (isQuarterlyDocumentationEnabled()) {
    const db = new DatabaseSync(DB_PATH);
    try {
        initQuarterlyDocumentationTables(db);
    } finally {
        db.close();
    }
}
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

const CLIENT_PROCEDURE_STATUSES = new Set(['open', 'in_progress', 'completed', 'cancelled']);
const CLIENT_REQUIRED_DOCUMENT_STATUSES = new Set(['pending', 'received', 'in_review', 'accepted', 'rejected', 'not_applicable']);
const CLIENT_UPLOADED_DOCUMENT_STATUSES = new Set(['received', 'in_review', 'accepted', 'rejected']);
const CLIENT_PORTAL_DOCUMENT_ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const CLIENT_PORTAL_DOCUMENT_ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

function sanitizeStoragePathSegment(value) {
    const normalized = String(value || 'unknown')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);

    return normalized || 'unknown';
}

function sanitizeClientDocumentFilename(filename) {
    const rawName = String(filename || 'documento').split(/[\\/]/).pop() || 'documento';
    const safeName = rawName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^\.+/g, '')
        .slice(0, 140);

    return safeName || 'documento';
}

function getClientDocumentFileExtension(filename) {
    const rawName = String(filename || '').split(/[\\/]/).pop() || '';
    const dotIndex = rawName.lastIndexOf('.');

    return dotIndex >= 0 ? rawName.slice(dotIndex).toLowerCase() : '';
}

function validateClientPortalDocumentUploadMetadata({ originalFilename, mimeType, fileSize }) {
    const filename = String(originalFilename || '').trim();
    const normalizedMimeType = String(mimeType || '').split(';')[0].trim().toLowerCase();
    const extension = getClientDocumentFileExtension(filename);
    const normalizedFileSize = Number(fileSize || 0);

    if (!filename) {
        return {
            ok: false,
            http_status: 400,
            error_code: 'ORIGINAL_FILENAME_REQUIRED',
            message: 'Selecciona un archivo PDF, JPG o PNG.'
        };
    }

    if (!CLIENT_PORTAL_DOCUMENT_ALLOWED_EXTENSIONS.has(extension)) {
        return {
            ok: false,
            http_status: 400,
            error_code: 'CLIENT_DOCUMENT_UNSUPPORTED_EXTENSION',
            message: 'Formato no admitido. Sube un archivo PDF, JPG o PNG. HEIC no está admitido en esta V1.'
        };
    }

    if (normalizedMimeType && normalizedMimeType !== 'application/octet-stream' && !CLIENT_PORTAL_DOCUMENT_ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
        return {
            ok: false,
            http_status: 400,
            error_code: 'CLIENT_DOCUMENT_UNSUPPORTED_MIME_TYPE',
            message: 'Formato no admitido. Sube un archivo PDF, JPG o PNG. HEIC no está admitido en esta V1.'
        };
    }

    if (Number.isFinite(normalizedFileSize) && normalizedFileSize < 0) {
        return {
            ok: false,
            http_status: 400,
            error_code: 'CLIENT_DOCUMENT_INVALID_FILE_SIZE',
            message: 'El tamaño del archivo no es válido.'
        };
    }

    return {
        ok: true,
        extension,
        mime_type: normalizedMimeType || null,
        file_size: Number.isFinite(normalizedFileSize) && normalizedFileSize > 0 ? normalizedFileSize : null
    };
}
function normalizeProcedureDocumentKey(label, index = 0) {
    const key = sanitizeStoragePathSegment(label).toLowerCase();
    return key || `documento-${index + 1}`;
}

function normalizeClientProcedureRequiredDocuments(requiredDocuments) {
    if (!Array.isArray(requiredDocuments)) return [];

    return requiredDocuments
        .map((doc, index) => {
            if (typeof doc === 'string') {
                const label = doc.trim();
                if (!label) return null;

                return {
                    id: generateId(),
                    document_key: normalizeProcedureDocumentKey(label, index),
                    document_label: label,
                    required: 1,
                    status: 'pending',
                    notes: null
                };
            }

            const label = String(doc?.document_label || doc?.label || doc?.name || '').trim();
            if (!label) return null;

            return {
                id: String(doc.id || generateId()),
                document_key: String(doc.document_key || normalizeProcedureDocumentKey(label, index)).trim(),
                document_label: label,
                required: doc.required === false || doc.required === 0 ? 0 : 1,
                status: CLIENT_REQUIRED_DOCUMENT_STATUSES.has(doc.status) ? doc.status : 'pending',
                notes: doc.notes ? String(doc.notes) : null
            };
        })
        .filter(Boolean);
}

const PORTAL_CLIENT_PROCEDURE_START_CATALOG = {
    alta_empleado: {
        label: 'Voy a contratar a un nuevo empleado',
        manager_label: 'Alta de empleado',
        labor: true,
        documents: ['DNI/NIE', 'Número Seguridad Social', 'Datos bancarios', 'Categoría profesional', 'Fecha de alta', 'Tipo de contrato/jornada']
    },
    tickets_gastos: {
        label: 'Tengo tickets/gastos para entregar',
        manager_label: 'Tickets / gastos',
        documents: ['Ticket o factura', 'Fecha', 'Importe', 'Concepto', 'Forma de pago', 'Justificante bancario si procede', 'Categoría de gasto']
    },
    baja_medica_it: {
        label: 'Tengo una baja médica',
        manager_label: 'Baja médica / IT',
        labor: true,
        documents: ['Parte de baja', 'Parte de confirmación si procede', 'Parte de alta si procede']
    },
    trimestre_fiscal: {
        label: 'Tengo que preparar el trimestre fiscal',
        manager_label: 'Trimestre fiscal',
        period_type: 'trimestre',
        documents: ['Facturas emitidas', 'Facturas recibidas', 'Tickets y gastos', 'Extractos bancarios', 'Nóminas y seguros sociales si procede', 'Alquileres con retención si procede', 'Retenciones profesionales si procede', 'Operaciones intracomunitarias si procede', 'Otros justificantes del trimestre']
    },
    censal_actividad: {
        label: 'Tengo una modificación censal',
        manager_label: 'Censal / actividad',
        period_type: 'fecha_efecto',
        documents: ['DNI/NIE o CIF', 'Escritura de constitución si procede', 'Modelo censal o datos de alta/modificación', 'Epígrafe IAE', 'Domicilio fiscal', 'Domicilio de actividad si procede', 'Representante legal si procede', 'Actividad económica', 'Fecha de inicio/modificación/baja', 'Obligaciones fiscales previstas', 'Cuenta bancaria si procede']
    },
    declaracion_renta: {
        label: 'Necesito preparar documentación para renta',
        manager_label: 'Declaración de la renta',
        documents: ['Datos fiscales AEAT', 'Certificados de retenciones', 'Rendimientos del trabajo', 'Rendimientos bancarios', 'Alquileres si procede', 'Hipoteca vivienda habitual si procede', 'Donativos si procede', 'Gastos deducibles de actividad si procede', 'Ganancias o pérdidas patrimoniales si procede', 'Deducciones autonómicas si procede']
    },
    impuesto_sociedades: {
        label: 'Necesito preparar documentación para sociedades',
        manager_label: 'Impuesto sobre Sociedades',
        documents: ['Balance de sumas y saldos', 'Cuenta de pérdidas y ganancias', 'Libro mayor', 'Amortizaciones', 'Préstamos y leasing si procede', 'Retenciones y pagos a cuenta si procede', 'Pagos fraccionados si procede', 'Documentación de cierre']
    },
    inspeccion_requerimiento: {
        label: 'Tengo una inspección o requerimiento oficial',
        manager_label: 'Inspección/requerimiento oficial',
        documents: [
            'Notificación o requerimiento recibido',
            'Documentación solicitada por la administración',
            { label: 'Número de expediente o referencia si existe', required: false },
            { label: 'Fecha límite de respuesta si aparece', required: false },
            { label: 'Comunicaciones, alegaciones o escritos previos si procede', required: false },
            { label: 'Identificación del organismo actuante si procede', required: false }
        ]
    }
};

const PORTAL_CLIENT_QUARTER_LABELS = {
    q1: '1er trimestre',
    q2: '2º trimestre',
    q3: '3er trimestre',
    q4: '4º trimestre'
};

const PORTAL_CLIENT_RENTA_SUBTYPE_LABELS = {
    persona_fisica: 'Persona física',
    autonomo_actividad: 'Autónomo con actividad',
    renta_alquileres: 'Renta con alquileres',
    ganancias_patrimoniales: 'Renta con ganancias patrimoniales',
    otro_caso: 'Otro caso'
};

const PORTAL_CLIENT_SOCIETIES_SUBTYPE_LABELS = {
    cierre_anual: 'Cierre anual',
    pago_fraccionado: 'Pago fraccionado',
    documentacion_complementaria: 'Documentación complementaria'
};

const PORTAL_CLIENT_CENSAL_SUBTYPE_LABELS = {
    alta: 'Alta',
    modificacion: 'Modificación',
    baja: 'Baja'
};

const PORTAL_CLIENT_TICKETS_PERIOD_LABELS = {
    mes: 'Mes',
    trimestre: 'Trimestre',
    anio: 'Año',
    otro_periodo: 'Otro periodo'
};

const PORTAL_CLIENT_INSPECTION_AUTHORITY_LABELS = {
    hacienda: 'Inspección/requerimiento de Hacienda',
    trabajo: 'Inspección/requerimiento de Trabajo',
    sanidad: 'Inspección/requerimiento de Sanidad',
    conselleria: 'Inspección/requerimiento de Conselleria / Generalitat',
    ayuntamiento: 'Inspección/requerimiento del Ayuntamiento',
    policia: 'Inspección/requerimiento policial',
    otro_organismo: 'Requerimiento de otro organismo'
};

const PORTAL_CLIENT_PROCEDURE_ALLOWED_FIELDS = new Set([
    'procedure_type',
    'procedure_subtype',
    'authority_type',
    'reference_label',
    'due_date',
    'response_deadline',
    'description',
    'period_type',
    'period_value',
    'fiscal_year'
]);

function normalizePortalClientText(value, maxLength = 160) {
    return String(value || '').trim().slice(0, maxLength);
}

function isValidPortalClientFiscalYear(value) {
    const year = String(value || '').trim();
    const numericYear = Number(year);
    const currentYear = new Date().getFullYear();

    return /^\d{4}$/.test(year) && numericYear >= 2000 && numericYear <= currentYear + 2;
}

function isValidPortalClientDate(value) {
    const date = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function derivePortalClientProcedureEntityType(client) {
    const nif = String(client?.nif || '').trim().toUpperCase();
    const first = nif.charAt(0);

    if (/^\d/.test(nif) || ['X', 'Y', 'Z'].includes(first)) return 'autonomo_persona_fisica';
    if (first === 'B') return 'sl';
    if (first === 'A') return 'sa';
    if (first === 'E' || first === 'H') return 'comunidad_bienes';
    if (['G', 'P', 'Q', 'R', 'S'].includes(first)) return 'asociacion_entidad_sin_animo_lucro';

    return 'otro_tipo_entidad';
}

function normalizePortalClientProcedureMetadata(payload, catalogEntry) {
    const procedureType = String(payload?.procedure_type || '').trim();
    const periodType = String(payload?.period_type || '').trim();
    const periodValue = normalizePortalClientText(payload?.period_value, 80);
    const fiscalYear = normalizePortalClientText(payload?.fiscal_year, 4);
    const rawProcedureSubtype = procedureType === 'inspeccion_requerimiento'
        ? (payload?.procedure_subtype || payload?.authority_type)
        : payload?.procedure_subtype;
    const procedureSubtype = normalizePortalClientText(rawProcedureSubtype, 80);
    const referenceLabel = normalizePortalClientText(payload?.reference_label, 120);
    const dueDate = normalizePortalClientText(payload?.response_deadline || payload?.due_date, 10);
    const description = normalizePortalClientText(payload?.description, 500);

    if (procedureType === 'trimestre_fiscal') {
        if (!Object.prototype.hasOwnProperty.call(PORTAL_CLIENT_QUARTER_LABELS, periodValue) || !isValidPortalClientFiscalYear(fiscalYear)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_PERIOD',
                message: 'Selecciona trimestre y ejercicio válidos.'
            };
        }

        return {
            ok: true,
            period_type: catalogEntry.period_type,
            period_value: periodValue,
            fiscal_year: fiscalYear,
            procedure_subtype: null,
            reference_label: referenceLabel || null,
            due_date: null,
            description: description || null
        };
    }

    if (procedureType === 'declaracion_renta') {
        if (!isValidPortalClientFiscalYear(fiscalYear)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_FISCAL_YEAR',
                message: 'Indica un ejercicio fiscal válido.'
            };
        }

        if (procedureSubtype && !Object.prototype.hasOwnProperty.call(PORTAL_CLIENT_RENTA_SUBTYPE_LABELS, procedureSubtype)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_SUBTYPE',
                message: 'Tipo de renta no válido.'
            };
        }

        return {
            ok: true,
            period_type: null,
            period_value: null,
            fiscal_year: fiscalYear,
            procedure_subtype: procedureSubtype || null,
            reference_label: referenceLabel || null,
            due_date: null,
            description: description || null
        };
    }

    if (procedureType === 'impuesto_sociedades') {
        if (!isValidPortalClientFiscalYear(fiscalYear)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_FISCAL_YEAR',
                message: 'Indica un ejercicio fiscal válido.'
            };
        }

        if (procedureSubtype && !Object.prototype.hasOwnProperty.call(PORTAL_CLIENT_SOCIETIES_SUBTYPE_LABELS, procedureSubtype)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_SUBTYPE',
                message: 'Tipo de cierre no válido.'
            };
        }

        return {
            ok: true,
            period_type: null,
            period_value: null,
            fiscal_year: fiscalYear,
            procedure_subtype: procedureSubtype || null,
            reference_label: referenceLabel || null,
            due_date: null,
            description: description || null
        };
    }

    if (procedureType === 'censal_actividad') {
        if (!Object.prototype.hasOwnProperty.call(PORTAL_CLIENT_CENSAL_SUBTYPE_LABELS, procedureSubtype)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_SUBTYPE',
                message: 'Selecciona la actuación censal.'
            };
        }

        if (periodValue && !/^\d{4}-\d{2}-\d{2}$/.test(periodValue)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_DATE',
                message: 'La fecha de efecto no es válida.'
            };
        }

        return {
            ok: true,
            period_type: periodValue ? catalogEntry.period_type : null,
            period_value: periodValue || null,
            fiscal_year: null,
            procedure_subtype: procedureSubtype,
            reference_label: referenceLabel || null,
            due_date: null,
            description: description || null
        };
    }

    if (procedureType === 'tickets_gastos') {
        if (!Object.prototype.hasOwnProperty.call(PORTAL_CLIENT_TICKETS_PERIOD_LABELS, periodType)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_PERIOD_TYPE',
                message: 'Selecciona el periodo de tickets y gastos.'
            };
        }

        return {
            ok: true,
            period_type: periodType,
            period_value: periodValue || null,
            fiscal_year: null,
            procedure_subtype: null,
            reference_label: referenceLabel || null,
            due_date: null,
            description: description || null
        };
    }

    if (procedureType === 'inspeccion_requerimiento') {
        if (!Object.prototype.hasOwnProperty.call(PORTAL_CLIENT_INSPECTION_AUTHORITY_LABELS, procedureSubtype)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_SUBTYPE',
                message: 'Selecciona el organismo que ha enviado la inspección o requerimiento.'
            };
        }

        if (dueDate && !isValidPortalClientDate(dueDate)) {
            return {
                ok: false,
                error_code: 'INVALID_PORTAL_PROCEDURE_DUE_DATE',
                message: 'La fecha límite no es válida.'
            };
        }

        return {
            ok: true,
            period_type: null,
            period_value: null,
            fiscal_year: null,
            procedure_subtype: procedureSubtype,
            reference_label: referenceLabel || null,
            due_date: dueDate || null,
            description: description || null
        };
    }

    return {
        ok: true,
        period_type: null,
        period_value: null,
        fiscal_year: null,
        procedure_subtype: null,
        reference_label: referenceLabel || null,
        due_date: null,
        description: description || null
    };
}

function buildPortalClientProcedureTitle(catalogEntry, metadata) {
    if (metadata.procedure_subtype && PORTAL_CLIENT_INSPECTION_AUTHORITY_LABELS[metadata.procedure_subtype]) {
        return PORTAL_CLIENT_INSPECTION_AUTHORITY_LABELS[metadata.procedure_subtype];
    }

    const details = [];

    if (metadata.period_value && PORTAL_CLIENT_QUARTER_LABELS[metadata.period_value]) details.push(PORTAL_CLIENT_QUARTER_LABELS[metadata.period_value]);
    if (metadata.period_type && PORTAL_CLIENT_TICKETS_PERIOD_LABELS[metadata.period_type]) {
        const periodLabel = PORTAL_CLIENT_TICKETS_PERIOD_LABELS[metadata.period_type];
        details.push(metadata.period_value ? `${periodLabel}: ${metadata.period_value}` : periodLabel);
    }
    if (metadata.fiscal_year) details.push(metadata.fiscal_year);
    if (metadata.procedure_subtype) {
        const subtypeLabel = PORTAL_CLIENT_RENTA_SUBTYPE_LABELS[metadata.procedure_subtype] ||
            PORTAL_CLIENT_SOCIETIES_SUBTYPE_LABELS[metadata.procedure_subtype] ||
            PORTAL_CLIENT_CENSAL_SUBTYPE_LABELS[metadata.procedure_subtype];

        if (subtypeLabel) details.push(subtypeLabel);
    }
    if (metadata.reference_label) details.push(metadata.reference_label);

    return details.length ? `${catalogEntry.manager_label}: ${details.join(' · ')}` : catalogEntry.manager_label;
}
function buildClientProcedureStoragePath({ clientId, procedureId, requiredDocumentId, uploadedDocumentId, safeFilename }) {
    return [
        'client-procedures',
        sanitizeStoragePathSegment(clientId),
        sanitizeStoragePathSegment(procedureId),
        sanitizeStoragePathSegment(requiredDocumentId),
        `${sanitizeStoragePathSegment(uploadedDocumentId)}-${sanitizeClientDocumentFilename(safeFilename)}`
    ].join('/');
}

function getClientProcedureExpectedStoragePrefix({ clientId, procedureId, requiredDocumentId, uploadedDocumentId }) {
    return [
        'client-procedures',
        sanitizeStoragePathSegment(clientId),
        sanitizeStoragePathSegment(procedureId),
        sanitizeStoragePathSegment(requiredDocumentId),
        `${sanitizeStoragePathSegment(uploadedDocumentId)}-`
    ].join('/');
}

function getClientProcedureById(db, procedureId) {
    return db.prepare('SELECT * FROM client_procedure_requests WHERE id = ?').get(procedureId);
}

function getClientRequiredDocumentById(db, procedureId, requiredDocumentId) {
    return db.prepare('SELECT * FROM client_required_documents WHERE id = ? AND procedure_id = ?').get(requiredDocumentId, procedureId);
}

function getClientUploadedDocumentById(db, procedureId, uploadedDocumentId) {
    return db.prepare('SELECT * FROM client_uploaded_documents WHERE id = ? AND procedure_id = ? AND deleted_at IS NULL').get(uploadedDocumentId, procedureId);
}

function isSupabaseStorageMissingObjectError(error) {
    const message = String(error?.message || error?.error_description || '').toLowerCase();
    const status = String(error?.statusCode || error?.status || '').trim();

    return status === '404' ||
        message.includes('not found') ||
        message.includes('does not exist') ||
        message.includes('object not found') ||
        message.includes('no such file');
}

function hydrateClientProcedures(db, procedures) {
    if (!procedures.length) return [];

    const procedureIds = procedures.map(procedure => procedure.id);
    const placeholders = procedureIds.map(() => '?').join(',');
    const requiredDocuments = db.prepare(`
        SELECT * FROM client_required_documents
        WHERE procedure_id IN (${placeholders})
        ORDER BY created_at ASC
    `).all(...procedureIds);
    const uploadedDocuments = db.prepare(`
        SELECT * FROM client_uploaded_documents
        WHERE procedure_id IN (${placeholders})
          AND deleted_at IS NULL
        ORDER BY created_at DESC
    `).all(...procedureIds);
    const logs = db.prepare(`
        SELECT * FROM client_document_review_logs
        WHERE procedure_id IN (${placeholders})
        ORDER BY created_at DESC
    `).all(...procedureIds);

    const clientsById = new Map(getClientCatalog().map(client => [client.id, client]));
    const requiredByProcedure = new Map();
    const uploadsByProcedure = new Map();
    const uploadsByRequired = new Map();
    const requiredProcedureById = new Map();
    const logsByProcedure = new Map();
    const logsByRequired = new Map();

    for (const doc of requiredDocuments) {
        if (!requiredByProcedure.has(doc.procedure_id)) requiredByProcedure.set(doc.procedure_id, []);
        requiredByProcedure.get(doc.procedure_id).push(doc);
        requiredProcedureById.set(doc.id, doc.procedure_id);
    }

    for (const upload of uploadedDocuments) {
        if (!upload.required_document_id || requiredProcedureById.get(upload.required_document_id) !== upload.procedure_id) {
            continue;
        }

        if (!uploadsByProcedure.has(upload.procedure_id)) uploadsByProcedure.set(upload.procedure_id, []);
        uploadsByProcedure.get(upload.procedure_id).push(upload);

        const requiredKey = `${upload.procedure_id}:${upload.required_document_id}`;
        if (!uploadsByRequired.has(requiredKey)) uploadsByRequired.set(requiredKey, []);
        uploadsByRequired.get(requiredKey).push(upload);
    }

    for (const log of logs) {
        if (!logsByProcedure.has(log.procedure_id)) logsByProcedure.set(log.procedure_id, []);
        logsByProcedure.get(log.procedure_id).push(log);

        if (log.required_document_id && requiredProcedureById.get(log.required_document_id) === log.procedure_id) {
            const requiredKey = `${log.procedure_id}:${log.required_document_id}`;
            if (!logsByRequired.has(requiredKey)) logsByRequired.set(requiredKey, []);
            logsByRequired.get(requiredKey).push(log);
        }
    }

    return procedures.map(procedure => {
        const client = clientsById.get(procedure.client_id) || {
            id: procedure.client_id,
            name: procedure.client_id
        };

        const documents = (requiredByProcedure.get(procedure.id) || []).map(doc => {
            const requiredKey = `${doc.procedure_id}:${doc.id}`;

            return {
                ...doc,
                uploaded_documents: uploadsByRequired.get(requiredKey) || [],
                logs: logsByRequired.get(requiredKey) || []
            };
        });

        return {
            ...procedure,
            client,
            required_documents: documents,
            uploaded_documents: uploadsByProcedure.get(procedure.id) || [],
            logs: logsByProcedure.get(procedure.id) || []
        };
    });
}

async function verifySupabaseStorageObject(bucket, storagePath) {
    const storageResult = getSupabaseStorageClient();

    if (!storageResult.ok) {
        return storageResult;
    }

    const cleanPath = String(storagePath || '').replace(/^\/+/, '');
    const parts = cleanPath.split('/').filter(Boolean);
    const objectName = parts.pop();
    const folder = parts.join('/');

    if (!objectName || !folder) {
        return {
            ok: false,
            error_code: 'INVALID_STORAGE_PATH',
            message: 'Ruta de almacenamiento no válida.'
        };
    }

    const { data, error } = await storageResult.client
        .storage
        .from(bucket)
        .list(folder, { limit: 100, search: objectName });

    if (error) {
        return {
            ok: false,
            error_code: 'SUPABASE_STORAGE_LIST_ERROR',
            message: error.message,
            env_status: storageResult.env_status
        };
    }

    const found = Array.isArray(data) && data.some(item => item.name === objectName);

    if (!found) {
        return {
            ok: false,
            error_code: 'SUPABASE_STORAGE_OBJECT_NOT_FOUND',
            message: 'El archivo no aparece en Supabase Storage. No se registran metadatos hasta confirmar la subida real.',
            env_status: storageResult.env_status
        };
    }

    return {
        ok: true,
        env_status: storageResult.env_status
    };
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

function ensureReadServicesCommercialClient(clientMap, clientId, clientName = null, extra = {}) {
    const normalizedClientId = String(clientId || '');

    if (!normalizedClientId) return null;

    if (!clientMap.has(normalizedClientId)) {
        clientMap.set(normalizedClientId, emptyReadServicesCommercialClient(normalizedClientId, clientName));
    }

    const client = clientMap.get(normalizedClientId);

    if (clientName && (!client.client_name || client.client_name === normalizedClientId)) {
        client.client_name = clientName;
    }

    if (!client.sector_key && (extra.sector_key || extra.sector || extra.sector_name)) {
        client.sector_key = extra.sector_key || extra.sector || extra.sector_name;
    }

    return client;
}

function normalizeReadServicesCommercialClient(client) {
    const normalized = {
        client_id: String(client.client_id || ''),
        client_name: client.client_name || null,
        sector_key: client.sector_key || client.sector || client.sector_name || null,
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

        const client = ensureReadServicesCommercialClient(clientMap, clientId, pkg.client_name || clientId, { sector_key: pkg.sector_key });
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
        const client = ensureReadServicesCommercialClient(clientMap, clientId, request.client_name || clientId, { sector_key: request.sector_key });

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
function getRadarPublicationGenerateWriteSource() {
    const rawValue = String(process.env.RADAR_PUBLICATION_GENERATE_WRITE_SOURCE || '').trim().toLowerCase();

    if (rawValue === RADAR_WRITE_SOURCE_DUAL_WRITE) {
        return RADAR_WRITE_SOURCE_DUAL_WRITE;
    }

    if (rawValue === RADAR_WRITE_SOURCE_SUPABASE) {
        return RADAR_WRITE_SOURCE_SUPABASE;
    }

    return RADAR_WRITE_SOURCE_SQLITE;
}

function getRadarPublicationGenerateWriteSourceStatus() {
    const writeSource = getRadarPublicationGenerateWriteSource();

    return {
        write_source: writeSource,
        allowed_sources: [
            RADAR_WRITE_SOURCE_SQLITE,
            RADAR_WRITE_SOURCE_DUAL_WRITE,
            RADAR_WRITE_SOURCE_SUPABASE
        ],
        default_source: RADAR_WRITE_SOURCE_SQLITE,
        env_var: 'RADAR_PUBLICATION_GENERATE_WRITE_SOURCE',
        switch_scope: 'POST /api/manager/publication-packages/generate',
        production_safe_default: writeSource === RADAR_WRITE_SOURCE_SQLITE,
        dual_write_active: writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE,
        supabase_write_active: writeSource === RADAR_WRITE_SOURCE_SUPABASE,
        note: writeSource === RADAR_WRITE_SOURCE_SQLITE
            ? 'Publication generate writes are using SQLite only.'
            : writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE
                ? 'Publication generate writes are using SQLite + Supabase dual write.'
                : 'Publication generate writes are using Supabase only.'
    };
}

function getRadarPublicationPublishWriteSource() {
    const rawValue = String(process.env.RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE || '').trim().toLowerCase();

    if (rawValue === RADAR_WRITE_SOURCE_DUAL_WRITE) {
        return RADAR_WRITE_SOURCE_DUAL_WRITE;
    }

    if (rawValue === RADAR_WRITE_SOURCE_SUPABASE) {
        return RADAR_WRITE_SOURCE_SUPABASE;
    }

    return RADAR_WRITE_SOURCE_SQLITE;
}

function getRadarPublicationPublishWriteSourceStatus() {
    const writeSource = getRadarPublicationPublishWriteSource();

    return {
        write_source: writeSource,
        allowed_sources: [
            RADAR_WRITE_SOURCE_SQLITE,
            RADAR_WRITE_SOURCE_DUAL_WRITE,
            RADAR_WRITE_SOURCE_SUPABASE
        ],
        default_source: RADAR_WRITE_SOURCE_SQLITE,
        env_var: 'RADAR_PUBLICATION_PUBLISH_WRITE_SOURCE',
        switch_scope: 'POST /api/manager/publication-packages/:id/publish',
        production_safe_default: writeSource === RADAR_WRITE_SOURCE_SQLITE,
        dual_write_active: writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE,
        supabase_write_active: writeSource === RADAR_WRITE_SOURCE_SUPABASE,
        note: writeSource === RADAR_WRITE_SOURCE_SQLITE
            ? 'Publication publish writes are using SQLite only.'
            : writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE
                ? 'Publication publish writes are using SQLite + Supabase dual write.'
                : 'Publication publish writes are using Supabase only.'
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

 
// write_switch_v1_publication_publish
async function getSupabasePublicationPackageByIdForApi(packageId) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            message: clientResult.message || 'Supabase client unavailable.',
            package: null
        };
    }

    try {
        const { data, error } = await clientResult.client
            .from('client_publication_packages')
            .select('*')
            .eq('id', packageId)
            .limit(1);

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_PUBLICATION_PACKAGE_SELECT_FAILED',
                message: error.message,
                package: null
            };
        }

        const pkg = Array.isArray(data) && data.length > 0 ? data[0] : null;

        if (!pkg) {
            return {
                ok: false,
                error_code: 'SUPABASE_PUBLICATION_PACKAGE_NOT_FOUND',
                message: 'Publication package not found in Supabase.',
                package: null
            };
        }

        return {
            ok: true,
            package: pkg
        };
    } catch (error) {
        return {
            ok: false,
            error_code: 'SUPABASE_PUBLICATION_PACKAGE_SELECT_EXCEPTION',
            message: error.message,
            package: null
        };
    }
}

async function getSupabaseDuplicatePublishedPublicationPackageForApi(pkg) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            message: clientResult.message || 'Supabase client unavailable.',
            duplicate: null
        };
    }

    try {
        const { data, error } = await clientResult.client
            .from('client_publication_packages')
            .select('id')
            .eq('client_id', pkg.client_id)
            .eq('sector_key', pkg.sector_key)
            .eq('package_type', pkg.package_type)
            .eq('package_status', 'published')
            .eq('review_status', 'approved')
            .eq('publish_to_client', 1)
            .eq('needs_human_review', 0)
            .eq('client_publish_status', 'published')
            .neq('id', pkg.id)
            .limit(1);

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_PUBLICATION_DUPLICATE_SELECT_FAILED',
                message: error.message,
                duplicate: null
            };
        }

        return {
            ok: true,
            duplicate: Array.isArray(data) && data.length > 0 ? data[0] : null
        };
    } catch (error) {
        return {
            ok: false,
            error_code: 'SUPABASE_PUBLICATION_DUPLICATE_SELECT_EXCEPTION',
            message: error.message,
            duplicate: null
        };
    }
}

async function updateSupabasePublicationPackagePublishedForApi(packageId, updatePayload) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            message: clientResult.message || 'Supabase client unavailable.',
            package: null
        };
    }

    try {
        const { data, error } = await clientResult.client
            .from('client_publication_packages')
            .update(updatePayload)
            .eq('id', packageId)
            .select('*');

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_PUBLICATION_PACKAGE_UPDATE_FAILED',
                message: error.message,
                package: null
            };
        }

        return {
            ok: true,
            package: Array.isArray(data) && data.length > 0 ? data[0] : null
        };
    } catch (error) {
        return {
            ok: false,
            error_code: 'SUPABASE_PUBLICATION_PACKAGE_UPDATE_EXCEPTION',
            message: error.message,
            package: null
        };
    }
}

async function updateSupabasePublicationPackageItemsPublishedForApi(packageId, updatePayload) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            message: clientResult.message || 'Supabase client unavailable.',
            items: []
        };
    }

    try {
        const { data, error } = await clientResult.client
            .from('client_publication_package_items')
            .update(updatePayload)
            .eq('package_id', packageId)
            .select('*');

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_PUBLICATION_ITEMS_UPDATE_FAILED',
                message: error.message,
                items: []
            };
        }

        return {
            ok: true,
            items: Array.isArray(data) ? data : []
        };
    } catch (error) {
        return {
            ok: false,
            error_code: 'SUPABASE_PUBLICATION_ITEMS_UPDATE_EXCEPTION',
            message: error.message,
            items: []
        };
    }
}

async function insertSupabasePublicationLogForApi(logRow) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            message: clientResult.message || 'Supabase client unavailable.',
            log: null
        };
    }

    try {
        const { data, error } = await clientResult.client
            .from('client_publication_logs')
            .insert([logRow])
            .select('*');

        if (error) {
            return {
                ok: false,
                error_code: 'SUPABASE_PUBLICATION_LOG_INSERT_FAILED',
                message: error.message,
                log: null
            };
        }

        return {
            ok: true,
            log: Array.isArray(data) && data.length > 0 ? data[0] : null
        };
    } catch (error) {
        return {
            ok: false,
            error_code: 'SUPABASE_PUBLICATION_LOG_INSERT_EXCEPTION',
            message: error.message,
            log: null
        };
    }
}
// /write_switch_v1_publication_publish
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


const CLIENT_PORTAL_SESSION_COOKIE_NAME = 'rgv_client_portal_session';

function getClientPortalSessionTtlHours() {
    const parsed = Number(process.env.CLIENT_PORTAL_SESSION_TTL_HOURS || 24 * 14);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 336;
}

function getClientPortalAuthSecret() {
    return process.env.CLIENT_PORTAL_AUTH_SECRET || process.env.MANAGER_SESSION_SECRET || 'local-client-portal-dev-secret';
}

function normalizePhoneForClientPortal(phone) {
    return String(phone || '').replace(/\D/g, '').trim();
}

function isValidClientPortalPhone(phone) {
    const normalized = normalizePhoneForClientPortal(phone);
    return normalized.length >= 9 && normalized.length <= 15;
}

function hashClientPortalPhone(phone) {
    return crypto
        .createHmac('sha256', getClientPortalAuthSecret())
        .update(normalizePhoneForClientPortal(phone), 'utf8')
        .digest('hex');
}

function createClientPortalAccessKeyHash(accessKey, salt) {
    return crypto
        .pbkdf2Sync(String(accessKey || ''), String(salt || ''), 120000, 32, 'sha256')
        .toString('hex');
}

function isValidClientPortalAccessKey(accessKey) {
    const value = String(accessKey || '').trim();
    return value.length >= 6 && value.length <= 64;
}

function createClientPortalSessionToken(clientId) {
    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = Math.floor(getClientPortalSessionTtlHours() * 60 * 60);

    const payload = {
        scope: 'client_portal',
        client_id: String(clientId || ''),
        iat: now,
        exp: now + ttlSeconds
    };

    const payloadEncoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

    const signature = crypto
        .createHmac('sha256', getClientPortalAuthSecret())
        .update(payloadEncoded)
        .digest('base64url');

    return payloadEncoded + '.' + signature;
}

function verifyClientPortalSessionToken(token, expectedClientId) {
    try {
        const parts = String(token || '').split('.');
        if (parts.length !== 2) return false;

        const payloadEncoded = parts[0];
        const signature = parts[1];

        if (!payloadEncoded || !signature) return false;

        const expectedSignature = crypto
            .createHmac('sha256', getClientPortalAuthSecret())
            .update(payloadEncoded)
            .digest('base64url');

        if (!safeEqualText(signature, expectedSignature)) return false;

        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));

        if (!payload || payload.scope !== 'client_portal') return false;
        if (String(payload.client_id || '') !== String(expectedClientId || '')) return false;

        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || Number(payload.exp) <= now) return false;

        return true;
    } catch {
        return false;
    }
}

function getAuthenticatedClientPortalClientId(req) {
    try {
        const cookies = parseCookies(req);
        const token = cookies[CLIENT_PORTAL_SESSION_COOKIE_NAME];
        const parts = String(token || '').split('.');

        if (parts.length !== 2) return '';

        const payloadEncoded = parts[0];
        const signature = parts[1];

        if (!payloadEncoded || !signature) return '';

        const expectedSignature = crypto
            .createHmac('sha256', getClientPortalAuthSecret())
            .update(payloadEncoded)
            .digest('base64url');

        if (!safeEqualText(signature, expectedSignature)) return '';

        const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));

        if (!payload || payload.scope !== 'client_portal') return '';

        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || Number(payload.exp) <= now) return '';

        return String(payload.client_id || '').trim();
    } catch {
        return '';
    }
}
function setClientPortalSessionCookie(res, clientId) {
    const ttlSeconds = Math.floor(getClientPortalSessionTtlHours() * 60 * 60);
    const token = createClientPortalSessionToken(clientId);

    res.setHeader('Set-Cookie', serializeCookie(CLIENT_PORTAL_SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production'),
        sameSite: 'Lax',
        path: '/',
        maxAge: ttlSeconds
    }));
}

function clearClientPortalSessionCookie(res) {
    res.setHeader('Set-Cookie', serializeCookie(CLIENT_PORTAL_SESSION_COOKIE_NAME, '', {
        httpOnly: true,
        secure: Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production'),
        sameSite: 'Lax',
        path: '/',
        maxAge: 0
    }));
}

function isClientPortalAuthenticatedForClient(req, clientId) {
    const cookies = parseCookies(req);
    return verifyClientPortalSessionToken(cookies[CLIENT_PORTAL_SESSION_COOKIE_NAME], clientId);
}

function requireClientPortalAuth(res, clientId) {
    return sendJson(res, 401, {
        status: 'error',
        error_code: 'CLIENT_PORTAL_AUTH_REQUIRED',
        message: 'Acceso cliente requerido.',
        client_id: clientId || null
    });
}

function isClientPortalProtectedGetApiPath(pathname) {
    return pathname === '/api/portal/summary' ||
        pathname === '/api/portal/packages' ||
        pathname === '/api/portal/compliance/obligations' ||
        pathname === '/api/portal/aids/items';
}

function getClientPortalAccessLocal(clientId) {
    const db = new DatabaseSync(DB_PATH);
    try {
        return db.prepare('SELECT * FROM client_portal_access WHERE client_id = ?').get(clientId) || null;
    } finally {
        db.close();
    }
}

function upsertClientPortalAccessLocal({ clientId, authorizedPhoneHash, accessKeyHash = null, accessKeySalt = null, accessConfigured = 0 }) {
    const now = new Date().toISOString();
    const db = new DatabaseSync(DB_PATH);

    try {
        const existing = db.prepare('SELECT * FROM client_portal_access WHERE client_id = ?').get(clientId);

        if (existing) {
            db.prepare(`
                UPDATE client_portal_access
                SET authorized_phone_hash = ?,
                    access_key_hash = COALESCE(?, access_key_hash),
                    access_key_salt = COALESCE(?, access_key_salt),
                    access_configured = ?,
                    failed_attempts = 0,
                    locked_until = null,
                    updated_at = ?
                WHERE client_id = ?
            `).run(
                authorizedPhoneHash,
                accessKeyHash,
                accessKeySalt,
                accessConfigured ? 1 : Number(existing.access_configured || 0),
                now,
                clientId
            );
        } else {
            db.prepare(`
                INSERT INTO client_portal_access (
                    client_id,
                    authorized_phone_hash,
                    access_key_hash,
                    access_key_salt,
                    access_configured,
                    failed_attempts,
                    locked_until,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, 0, null, ?, ?)
            `).run(
                clientId,
                authorizedPhoneHash,
                accessKeyHash,
                accessKeySalt,
                accessConfigured ? 1 : 0,
                now,
                now
            );
        }

        return db.prepare('SELECT * FROM client_portal_access WHERE client_id = ?').get(clientId);
    } finally {
        db.close();
    }
}

async function getClientPortalAccessSupabase(clientId) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            access: null
        };
    }

    const { data, error } = await clientResult.client
        .from('client_portal_access')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

    if (error) {
        return {
            ok: false,
            error_code: 'CLIENT_PORTAL_ACCESS_SELECT_FAILED',
            message: error.message,
            access: null
        };
    }

    return {
        ok: true,
        access: data || null
    };
}

async function upsertClientPortalAccessSupabase({ clientId, authorizedPhoneHash, accessKeyHash = null, accessKeySalt = null, accessConfigured = false }) {
    const clientResult = getSupabaseReadonlyClient();

    if (!clientResult.ok) {
        return {
            ok: false,
            error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
            access: null
        };
    }

    const payload = {
        client_id: clientId,
        authorized_phone_hash: authorizedPhoneHash,
        updated_at: new Date().toISOString()
    };

    if (accessKeyHash) payload.access_key_hash = accessKeyHash;
    if (accessKeySalt) payload.access_key_salt = accessKeySalt;
    if (accessConfigured) {
        payload.access_configured = true;
        payload.failed_attempts = 0;
        payload.locked_until = null;
    }

    const { data, error } = await clientResult.client
        .from('client_portal_access')
        .upsert(payload, { onConflict: 'client_id' })
        .select('*')
        .maybeSingle();

    if (error) {
        return {
            ok: false,
            error_code: 'CLIENT_PORTAL_ACCESS_UPSERT_FAILED',
            message: error.message,
            access: null
        };
    }

    return {
        ok: true,
        access: data || null
    };
}

async function getClientPortalAccess(clientId) {
    const supabaseResult = await getClientPortalAccessSupabase(clientId);

    if (supabaseResult.ok) {
        return supabaseResult.access;
    }

    return getClientPortalAccessLocal(clientId);
}

async function configureClientPortalAuthorizedPhone({ clientId, authorizedPhone }) {
    const authorizedPhoneHash = hashClientPortalPhone(authorizedPhone);

    const local = upsertClientPortalAccessLocal({
        clientId,
        authorizedPhoneHash,
        accessConfigured: 0
    });

    const supabase = await upsertClientPortalAccessSupabase({
        clientId,
        authorizedPhoneHash,
        accessConfigured: false
    });

    return {
        ok: true,
        local_configured: Boolean(local),
        supabase_configured: Boolean(supabase.ok),
        supabase_error_code: supabase.ok ? null : supabase.error_code || null
    };
}

async function setClientPortalAccessKey({ clientId, phone, accessKey }) {
    const access = await getClientPortalAccess(clientId);

    if (!access) {
        return {
            ok: false,
            http_status: 404,
            error_code: 'CLIENT_PORTAL_ACCESS_NOT_CONFIGURED',
            message: 'El acceso cliente no está configurado.'
        };
    }

    const receivedPhoneHash = hashClientPortalPhone(phone);

    if (!safeEqualHex(receivedPhoneHash, access.authorized_phone_hash)) {
        return {
            ok: false,
            http_status: 401,
            error_code: 'INVALID_AUTHORIZED_PHONE',
            message: 'El teléfono autorizado no coincide.'
        };
    }

    if (!isValidClientPortalAccessKey(accessKey)) {
        return {
            ok: false,
            http_status: 400,
            error_code: 'INVALID_CLIENT_ACCESS_KEY',
            message: 'La clave debe tener entre 6 y 64 caracteres.'
        };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const accessKeyHash = createClientPortalAccessKeyHash(accessKey, salt);
    const authorizedPhoneHash = access.authorized_phone_hash;

    upsertClientPortalAccessLocal({
        clientId,
        authorizedPhoneHash,
        accessKeyHash,
        accessKeySalt: salt,
        accessConfigured: 1
    });

    const supabase = await upsertClientPortalAccessSupabase({
        clientId,
        authorizedPhoneHash,
        accessKeyHash,
        accessKeySalt: salt,
        accessConfigured: true
    });

    return {
        ok: true,
        supabase_configured: Boolean(supabase.ok),
        supabase_error_code: supabase.ok ? null : supabase.error_code || null
    };
}

async function verifyClientPortalAccessKey({ clientId, accessKey }) {
    const access = await getClientPortalAccess(clientId);

    if (!access || !access.access_configured || !access.access_key_hash || !access.access_key_salt) {
        return {
            ok: false,
            http_status: 401,
            error_code: 'CLIENT_PORTAL_KEY_NOT_CONFIGURED',
            message: 'La clave cliente todavía no está configurada.'
        };
    }

    const receivedHash = createClientPortalAccessKeyHash(accessKey, access.access_key_salt);

    if (!safeEqualHex(receivedHash, access.access_key_hash)) {
        return {
            ok: false,
            http_status: 401,
            error_code: 'INVALID_CLIENT_ACCESS_KEY',
            message: 'Clave incorrecta.'
        };
    }

    return {
        ok: true
    };
}

function handleClientPortalAuthRoute(req, res, pathname) {
    if (pathname === '/api/client-portal/auth/session') {
        if (req.method !== 'GET') {
            return sendJson(res, 405, { status: 'error', error_code: 'METHOD_NOT_ALLOWED' });
        }

        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const clientId = String(searchParams.get('client_id') || '').trim();

        return sendJson(res, 200, {
            status: 'ok',
            authenticated: Boolean(clientId && isClientPortalAuthenticatedForClient(req, clientId)),
            client_id: clientId || null
        });
    }

    if (pathname === '/api/client-portal/auth/logout') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { status: 'error', error_code: 'METHOD_NOT_ALLOWED' });
        }

        clearClientPortalSessionCookie(res);
        return sendJson(res, 200, { status: 'ok', authenticated: false });
    }

    if (pathname === '/api/client-portal/auth/setup') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { status: 'error', error_code: 'METHOD_NOT_ALLOWED' });
        }

        return readRequestJson(req, async payload => {
            const clientId = String(payload.client_id || '').trim();
            const phone = String(payload.phone || '').trim();
            const accessKey = String(payload.access_key || '').trim();

            if (!clientId || !getClientCatalog().some(client => client.id === clientId)) {
                return sendJson(res, 400, { status: 'error', error_code: 'INVALID_CLIENT_ID', message: 'Cliente no válido.' });
            }

            if (!isValidClientPortalPhone(phone)) {
                return sendJson(res, 400, { status: 'error', error_code: 'INVALID_AUTHORIZED_PHONE', message: 'Teléfono no válido.' });
            }

            const result = await setClientPortalAccessKey({ clientId, phone, accessKey });

            if (!result.ok) {
                return sendJson(res, result.http_status || 400, {
                    status: 'error',
                    error_code: result.error_code,
                    message: result.message
                });
            }

            setClientPortalSessionCookie(res, clientId);

            return sendJson(res, 200, {
                status: 'ok',
                authenticated: true,
                client_id: clientId
            });
        });
    }

    if (pathname === '/api/client-portal/auth/login') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { status: 'error', error_code: 'METHOD_NOT_ALLOWED' });
        }

        return readRequestJson(req, async payload => {
            const clientId = String(payload.client_id || '').trim();
            const accessKey = String(payload.access_key || '').trim();

            if (!clientId || !getClientCatalog().some(client => client.id === clientId)) {
                return sendJson(res, 400, { status: 'error', error_code: 'INVALID_CLIENT_ID', message: 'Cliente no válido.' });
            }

            const result = await verifyClientPortalAccessKey({ clientId, accessKey });

            if (!result.ok) {
                return sendJson(res, result.http_status || 401, {
                    status: 'error',
                    error_code: result.error_code,
                    message: result.message
                });
            }

            setClientPortalSessionCookie(res, clientId);

            return sendJson(res, 200, {
                status: 'ok',
                authenticated: true,
                client_id: clientId
            });
        });
    }

    return sendJson(res, 404, {
        status: 'error',
        error_code: 'CLIENT_PORTAL_AUTH_ROUTE_NOT_FOUND'
    });
}

const server = http.createServer(async (req, res) => {
    const pathname = req.url.split('?')[0];

    // CLIENT_PORTAL_AUTH_ROUTE_HOOK_V1
    if (pathname.startsWith('/api/client-portal/auth/')) {
        handleClientPortalAuthRoute(req, res, pathname);
        return;
    }

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

    // CLIENT_PORTAL_MANAGER_CONFIGURE_PHONE_V1
    if (pathname === '/api/manager/client-portal-access/configure' && req.method === 'POST') {
        return readRequestJson(req, async payload => {
            const clientId = String(payload.client_id || '').trim();
            const authorizedPhone = String(payload.authorized_phone || '').trim();

            if (!clientId || !getClientCatalog().some(client => client.id === clientId)) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_CLIENT_ID',
                    message: 'Cliente no válido.'
                });
            }

            if (!isValidClientPortalPhone(authorizedPhone)) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_AUTHORIZED_PHONE',
                    message: 'Teléfono autorizado no válido.'
                });
            }

            const result = await configureClientPortalAuthorizedPhone({
                clientId,
                authorizedPhone
            });

            return sendJson(res, 200, {
                status: 'ok',
                client_id: clientId,
                authorized_phone_configured: true,
                local_configured: result.local_configured,
                supabase_configured: result.supabase_configured,
                supabase_error_code: result.supabase_error_code
            });
        });
    }

    // API Route: GET /api/manager/client-procedures
    if (pathname === '/api/manager/client-procedures' && req.method === 'GET') {
        try {
            const queryString = req.url.split('?')[1] || '';
            const searchParams = new URLSearchParams(queryString);
            const clientId = String(searchParams.get('client_id') || '').trim();
            const status = String(searchParams.get('status') || '').trim();
            const procedureType = String(searchParams.get('procedure_type') || '').trim();
            const entityType = String(searchParams.get('entity_type') || '').trim();
            let limit = parseInt(searchParams.get('limit'), 10);

            if (Number.isNaN(limit) || limit <= 0) limit = 100;
            if (limit > 200) limit = 200;

            const clauses = [];
            const params = [];

            if (clientId) {
                clauses.push('client_id = ?');
                params.push(clientId);
            }

            if (status) {
                clauses.push('status = ?');
                params.push(status);
            }

            if (procedureType) {
                clauses.push('procedure_type = ?');
                params.push(procedureType);
            }

            if (entityType) {
                clauses.push('entity_type = ?');
                params.push(entityType);
            }

            const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
            const db = new DatabaseSync(DB_PATH);
            const procedures = db.prepare(`
                SELECT *
                FROM client_procedure_requests
                ${where}
                ORDER BY updated_at DESC, created_at DESC
                LIMIT ?
            `).all(...params, limit);
            const hydrated = hydrateClientProcedures(db, procedures);
            db.close();

            const summary = hydrated.reduce((acc, procedure) => {
                if (procedure.status === 'open' || procedure.status === 'in_progress') acc.open_procedures += 1;

                for (const doc of procedure.required_documents || []) {
                    if (doc.status === 'pending') acc.pending_documents += 1;
                    if (doc.status === 'received' || doc.status === 'in_review') acc.received_or_review_documents += 1;
                    if (doc.status === 'accepted') acc.accepted_documents += 1;
                    if (doc.status === 'rejected') acc.rejected_documents += 1;
                }

                return acc;
            }, {
                open_procedures: 0,
                pending_documents: 0,
                received_or_review_documents: 0,
                accepted_documents: 0,
                rejected_documents: 0
            });

            return sendJson(res, 200, {
                status: 'ok',
                count: hydrated.length,
                summary,
                procedures: hydrated
            });
        } catch (err) {
            console.error('client procedures list error:', err);
            return sendJson(res, 500, { status: 'error', error_code: 'INTERNAL_ERROR', message: 'No se pudieron cargar los trámites.' });
        }
    }

    // API Route: POST /api/manager/client-procedures
    if (pathname === '/api/manager/client-procedures' && req.method === 'POST') {
        return readRequestJson(req, async payload => {
            const clientId = String(payload.client_id || '').trim();
            const procedureType = String(payload.procedure_type || '').trim();
            const entityType = String(payload.entity_type || '').trim();
            const title = String(payload.title || '').trim();
            const description = String(payload.description || '').trim();
            const employeeName = String(payload.employee_name || '').trim();
            const periodType = String(payload.period_type || '').trim();
            const periodValue = String(payload.period_value || '').trim();
            const fiscalYear = String(payload.fiscal_year || '').trim();
            const procedureSubtype = String(payload.procedure_subtype || '').trim();
            const referenceLabel = String(payload.reference_label || '').trim();
            const priority = ['low', 'normal', 'high', 'urgent'].includes(payload.priority) ? payload.priority : 'normal';
            const dueDate = String(payload.due_date || '').trim();
            const validClient = getClientCatalog().find(client => client.id === clientId);
            const requiredDocuments = normalizeClientProcedureRequiredDocuments(payload.required_documents);

            if (!validClient) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_CLIENT_ID',
                    message: 'Cliente no válido.'
                });
            }

            if (!procedureType || !title) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_PROCEDURE_PAYLOAD',
                    message: 'Tipo de trámite y título son obligatorios.'
                });
            }

            if (!requiredDocuments.length) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'REQUIRED_DOCUMENTS_EMPTY',
                    message: 'El trámite debe tener al menos un documento requerido.'
                });
            }

            const procedureId = generateId();
            const db = new DatabaseSync(DB_PATH);

            try {
                db.exec('BEGIN');
                db.prepare(`
                    INSERT INTO client_procedure_requests
                    (id, client_id, procedure_type, entity_type, title, description, employee_name, priority, status, due_date, period_type, period_value, fiscal_year, procedure_subtype, reference_label)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?)
                `).run(
                    procedureId,
                    clientId,
                    procedureType,
                    entityType || null,
                    title,
                    description || null,
                    employeeName || null,
                    priority,
                    dueDate || null,
                    periodType || null,
                    periodValue || null,
                    fiscalYear || null,
                    procedureSubtype || null,
                    referenceLabel || null
                );

                const docStmt = db.prepare(`
                    INSERT INTO client_required_documents
                    (id, procedure_id, document_key, document_label, required, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                for (const doc of requiredDocuments) {
                    docStmt.run(
                        doc.id,
                        procedureId,
                        doc.document_key,
                        doc.document_label,
                        doc.required,
                        doc.status,
                        doc.notes
                    );
                }

                db.prepare(`
                    INSERT INTO client_document_review_logs
                    (id, procedure_id, required_document_id, uploaded_document_id, action, actor, notes)
                    VALUES (?, ?, null, null, ?, ?, ?)
                `).run(
                    generateId(),
                    procedureId,
                    'procedure_created',
                    'manager',
                    `Trámite creado para ${validClient.name}.`
                );

                db.exec('COMMIT');

                const procedure = hydrateClientProcedures(
                    db,
                    [db.prepare('SELECT * FROM client_procedure_requests WHERE id = ?').get(procedureId)]
                )[0];
                db.close();

                return sendJson(res, 201, {
                    status: 'ok',
                    procedure
                });
            } catch (err) {
                try { db.exec('ROLLBACK'); } catch {}
                try { db.close(); } catch {}
                console.error('client procedure create error:', err);
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'CLIENT_PROCEDURE_CREATE_FAILED',
                    message: 'No se pudo crear el trámite.'
                });
            }
        });
    }

    // API Route: PATCH /api/manager/client-procedures/:id/status
    const clientProcedureStatusMatch = pathname.match(/^\/api\/manager\/client-procedures\/([^/]+)\/status$/);
    if (clientProcedureStatusMatch && req.method === 'PATCH') {
        const procedureId = decodeURIComponent(clientProcedureStatusMatch[1]);

        return readRequestJson(req, async payload => {
            const nextStatus = String(payload.status || '').trim();
            const notes = String(payload.notes || '').trim();

            if (!CLIENT_PROCEDURE_STATUSES.has(nextStatus)) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_PROCEDURE_STATUS',
                    message: 'Estado de trámite no válido.'
                });
            }

            const db = new DatabaseSync(DB_PATH);

            try {
                const procedure = getClientProcedureById(db, procedureId);

                if (!procedure) {
                    db.close();
                    return sendJson(res, 404, {
                        status: 'error',
                        error_code: 'CLIENT_PROCEDURE_NOT_FOUND',
                        message: 'Trámite no encontrado.'
                    });
                }

                db.exec('BEGIN');
                db.prepare(`
                    UPDATE client_procedure_requests
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(nextStatus, procedureId);
                db.prepare(`
                    INSERT INTO client_document_review_logs
                    (id, procedure_id, required_document_id, uploaded_document_id, action, actor, notes)
                    VALUES (?, ?, null, null, ?, ?, ?)
                `).run(
                    generateId(),
                    procedureId,
                    `procedure_status_${nextStatus}`,
                    'manager',
                    notes || `Estado del trámite actualizado a ${nextStatus}.`
                );
                db.exec('COMMIT');

                const updated = hydrateClientProcedures(
                    db,
                    [db.prepare('SELECT * FROM client_procedure_requests WHERE id = ?').get(procedureId)]
                )[0];
                db.close();

                return sendJson(res, 200, {
                    status: 'ok',
                    procedure: updated
                });
            } catch (err) {
                try { db.exec('ROLLBACK'); } catch {}
                try { db.close(); } catch {}
                console.error('client procedure status update error:', err);
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'CLIENT_PROCEDURE_STATUS_UPDATE_FAILED',
                    message: 'No se pudo actualizar el estado del trámite.'
                });
            }
        });
    }

    // API Route: PATCH /api/manager/client-procedures/:id/documents/:documentId/status
    const clientRequiredDocumentStatusMatch = pathname.match(/^\/api\/manager\/client-procedures\/([^/]+)\/documents\/([^/]+)\/status$/);
    if (clientRequiredDocumentStatusMatch && req.method === 'PATCH') {
        const procedureId = decodeURIComponent(clientRequiredDocumentStatusMatch[1]);
        const requiredDocumentId = decodeURIComponent(clientRequiredDocumentStatusMatch[2]);

        return readRequestJson(req, async payload => {
            const nextStatus = String(payload.status || '').trim();
            const notes = String(payload.notes || '').trim();

            if (!CLIENT_REQUIRED_DOCUMENT_STATUSES.has(nextStatus)) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_REQUIRED_DOCUMENT_STATUS',
                    message: 'Estado documental no válido.'
                });
            }

            const db = new DatabaseSync(DB_PATH);

            try {
                const procedure = getClientProcedureById(db, procedureId);
                const requiredDocument = getClientRequiredDocumentById(db, procedureId, requiredDocumentId);

                if (!procedure || !requiredDocument) {
                    db.close();
                    return sendJson(res, 404, {
                        status: 'error',
                        error_code: 'CLIENT_REQUIRED_DOCUMENT_NOT_FOUND',
                        message: 'Documento requerido no encontrado.'
                    });
                }

                if (nextStatus === 'received') {
                    const activeUploadCount = db.prepare(`
                        SELECT COUNT(*) AS total
                        FROM client_uploaded_documents
                        WHERE procedure_id = ?
                          AND required_document_id = ?
                          AND deleted_at IS NULL
                    `).get(procedureId, requiredDocumentId);

                    if (Number(activeUploadCount?.total || 0) === 0) {
                        db.close();
                        return sendJson(res, 409, {
                            status: 'error',
                            error_code: 'RECEIVED_STATUS_REQUIRES_UPLOAD',
                            message: 'Sube un archivo antes de marcar el documento como recibido.'
                        });
                    }
                }

                const normalizedCurrentNotes = String(requiredDocument.notes || '').trim();
                const logAction = nextStatus === requiredDocument.status && notes !== normalizedCurrentNotes
                    ? 'document_note_updated'
                    : `required_document_status_${nextStatus}`;
                const logNotes = logAction === 'document_note_updated'
                    ? 'Nota documental actualizada'
                    : (notes || `Estado documental actualizado a ${nextStatus}.`);

                db.exec('BEGIN');
                db.prepare(`
                    UPDATE client_required_documents
                    SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND procedure_id = ?
                `).run(nextStatus, notes || null, requiredDocumentId, procedureId);
                db.prepare(`
                    INSERT INTO client_document_review_logs
                    (id, procedure_id, required_document_id, uploaded_document_id, action, actor, notes)
                    VALUES (?, ?, ?, null, ?, ?, ?)
                `).run(
                    generateId(),
                    procedureId,
                    requiredDocumentId,
                    logAction,
                    'manager',
                    logNotes
                );
                db.exec('COMMIT');

                const updated = hydrateClientProcedures(
                    db,
                    [db.prepare('SELECT * FROM client_procedure_requests WHERE id = ?').get(procedureId)]
                )[0];
                db.close();

                return sendJson(res, 200, {
                    status: 'ok',
                    procedure: updated
                });
            } catch (err) {
                try { db.exec('ROLLBACK'); } catch {}
                try { db.close(); } catch {}
                console.error('client required document status update error:', err);
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'CLIENT_REQUIRED_DOCUMENT_STATUS_UPDATE_FAILED',
                    message: 'No se pudo actualizar el estado documental.'
                });
            }
        });
    }

    // API Route: POST /api/manager/client-procedures/:id/documents/:requiredDocumentId/upload-url
    const clientDocumentUploadUrlMatch = pathname.match(/^\/api\/manager\/client-procedures\/([^/]+)\/documents\/([^/]+)\/upload-url$/);
    if (clientDocumentUploadUrlMatch && req.method === 'POST') {
        const procedureId = decodeURIComponent(clientDocumentUploadUrlMatch[1]);
        const requiredDocumentId = decodeURIComponent(clientDocumentUploadUrlMatch[2]);

        return readRequestJson(req, async payload => {
            const originalFilename = String(payload.original_filename || '').trim();
            const mimeType = String(payload.mime_type || '').trim();
            const fileSize = Number(payload.file_size || 0);

            if (!originalFilename) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'ORIGINAL_FILENAME_REQUIRED',
                    message: 'Nombre de archivo requerido.'
                });
            }

            const db = new DatabaseSync(DB_PATH);
            const procedure = getClientProcedureById(db, procedureId);
            const requiredDocument = getClientRequiredDocumentById(db, procedureId, requiredDocumentId);
            db.close();

            if (!procedure || !requiredDocument) {
                return sendJson(res, 404, {
                    status: 'error',
                    error_code: 'CLIENT_REQUIRED_DOCUMENT_NOT_FOUND',
                    message: 'Trámite o documento requerido no encontrado.'
                });
            }

            const storageResult = getSupabaseStorageClient();

            if (!storageResult.ok) {
                return sendJson(res, 503, {
                    status: 'error',
                    error_code: storageResult.error_code,
                    message: storageResult.message,
                    storage: storageResult.env_status
                });
            }

            const uploadedDocumentId = generateId();
            const safeFilename = sanitizeClientDocumentFilename(originalFilename);
            const storageBucket = getClientDocumentsStorageBucket();
            const storagePath = buildClientProcedureStoragePath({
                clientId: procedure.client_id,
                procedureId,
                requiredDocumentId,
                uploadedDocumentId,
                safeFilename
            });

            const { data, error } = await storageResult.client
                .storage
                .from(storageBucket)
                .createSignedUploadUrl(storagePath, { upsert: false });

            if (error) {
                return sendJson(res, 503, {
                    status: 'error',
                    error_code: 'SUPABASE_SIGNED_UPLOAD_URL_FAILED',
                    message: `No se pudo generar URL firmada. Confirma que existe el bucket privado ${storageBucket} y que el backend tiene permisos de Storage.`,
                    detail: error.message,
                    storage: storageResult.env_status
                });
            }

            return sendJson(res, 200, {
                status: 'ok',
                uploaded_document_id: uploadedDocumentId,
                original_filename: originalFilename,
                safe_filename: safeFilename,
                storage_bucket: storageBucket,
                storage_path: storagePath,
                signed_url: data.signedUrl,
                token: data.token,
                mime_type: mimeType || null,
                file_size: Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
                upload_method: 'PUT_FORM_DATA',
                upload_file_field: '',
                expires_in_seconds: 7200
            });
        });
    }

    // API Route: POST /api/manager/client-procedures/:id/documents/:requiredDocumentId/complete-upload
    const clientDocumentCompleteUploadMatch = pathname.match(/^\/api\/manager\/client-procedures\/([^/]+)\/documents\/([^/]+)\/complete-upload$/);
    if (clientDocumentCompleteUploadMatch && req.method === 'POST') {
        const procedureId = decodeURIComponent(clientDocumentCompleteUploadMatch[1]);
        const requiredDocumentId = decodeURIComponent(clientDocumentCompleteUploadMatch[2]);

        return readRequestJson(req, async payload => {
            const uploadedDocumentId = String(payload.uploaded_document_id || '').trim();
            const originalFilename = String(payload.original_filename || '').trim();
            const safeFilename = sanitizeClientDocumentFilename(payload.safe_filename || payload.original_filename);
            const storageBucket = String(payload.storage_bucket || getClientDocumentsStorageBucket()).trim();
            const storagePath = String(payload.storage_path || '').trim().replace(/^\/+/, '');
            const mimeType = String(payload.mime_type || '').trim();
            const fileSize = Number(payload.file_size || 0);
            const uploadedBy = String(payload.uploaded_by || 'manager').trim();
            const uploadStatus = CLIENT_UPLOADED_DOCUMENT_STATUSES.has(payload.status) ? payload.status : 'received';
            const requiredDocumentStatus = CLIENT_REQUIRED_DOCUMENT_STATUSES.has(payload.required_document_status)
                ? payload.required_document_status
                : 'received';
            const notes = String(payload.notes || '').trim();

            if (!uploadedDocumentId || !originalFilename || !storagePath) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_COMPLETE_UPLOAD_PAYLOAD',
                    message: 'Faltan metadatos de confirmación de subida.'
                });
            }

            const db = new DatabaseSync(DB_PATH);
            const procedure = getClientProcedureById(db, procedureId);
            const requiredDocument = getClientRequiredDocumentById(db, procedureId, requiredDocumentId);
            const existingUpload = getClientUploadedDocumentById(db, procedureId, uploadedDocumentId);

            if (!procedure || !requiredDocument) {
                db.close();
                return sendJson(res, 404, {
                    status: 'error',
                    error_code: 'CLIENT_REQUIRED_DOCUMENT_NOT_FOUND',
                    message: 'Trámite o documento requerido no encontrado.'
                });
            }

            if (existingUpload) {
                db.close();
                return sendJson(res, 409, {
                    status: 'error',
                    error_code: 'UPLOADED_DOCUMENT_ALREADY_REGISTERED',
                    message: 'El documento subido ya está registrado.'
                });
            }

            const expectedPrefix = getClientProcedureExpectedStoragePrefix({
                clientId: procedure.client_id,
                procedureId,
                requiredDocumentId,
                uploadedDocumentId
            });

            if (storageBucket !== getClientDocumentsStorageBucket() || !storagePath.startsWith(expectedPrefix)) {
                db.close();
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_STORAGE_PATH',
                    message: 'La ruta de almacenamiento no corresponde al trámite y documento requeridos.'
                });
            }

            const storageCheck = await verifySupabaseStorageObject(storageBucket, storagePath);

            if (!storageCheck.ok) {
                db.close();
                return sendJson(res, 409, {
                    status: 'error',
                    error_code: storageCheck.error_code || 'SUPABASE_STORAGE_OBJECT_CHECK_FAILED',
                    message: storageCheck.message || 'No se pudo confirmar la existencia del archivo en Supabase Storage.',
                    storage: storageCheck.env_status || null
                });
            }

            try {
                db.exec('BEGIN');
                db.prepare(`
                    INSERT INTO client_uploaded_documents
                    (id, procedure_id, required_document_id, client_id, original_filename, safe_filename, storage_bucket, storage_path, mime_type, file_size, uploaded_by, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    uploadedDocumentId,
                    procedureId,
                    requiredDocumentId,
                    procedure.client_id,
                    originalFilename,
                    safeFilename,
                    storageBucket,
                    storagePath,
                    mimeType || null,
                    Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
                    uploadedBy || 'manager',
                    uploadStatus,
                    notes || null
                );
                db.prepare(`
                    UPDATE client_required_documents
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND procedure_id = ?
                `).run(requiredDocumentStatus, requiredDocumentId, procedureId);
                db.prepare(`
                    INSERT INTO client_document_review_logs
                    (id, procedure_id, required_document_id, uploaded_document_id, action, actor, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    generateId(),
                    procedureId,
                    requiredDocumentId,
                    uploadedDocumentId,
                    'document_uploaded',
                    uploadedBy || 'manager',
                    notes || `Documento subido correctamente: ${originalFilename}`
                );
                db.exec('COMMIT');

                const updated = hydrateClientProcedures(
                    db,
                    [db.prepare('SELECT * FROM client_procedure_requests WHERE id = ?').get(procedureId)]
                )[0];
                db.close();

                return sendJson(res, 200, {
                    status: 'ok',
                    procedure: updated
                });
            } catch (err) {
                try { db.exec('ROLLBACK'); } catch {}
                try { db.close(); } catch {}
                console.error('client document complete upload error:', err);
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'CLIENT_DOCUMENT_COMPLETE_UPLOAD_FAILED',
                    message: 'No se pudieron registrar los metadatos del documento.'
                });
            }
        });
    }

    // API Route: DELETE /api/manager/client-procedures/:id/documents/:uploadedDocumentId
    const clientDocumentDeleteMatch = pathname.match(/^\/api\/manager\/client-procedures\/([^/]+)\/documents\/([^/]+)$/);
    if (clientDocumentDeleteMatch && req.method === 'DELETE') {
        const procedureId = decodeURIComponent(clientDocumentDeleteMatch[1]);
        const uploadedDocumentId = decodeURIComponent(clientDocumentDeleteMatch[2]);

        try {
            const db = new DatabaseSync(DB_PATH);
            const procedure = getClientProcedureById(db, procedureId);
            const uploadedDocument = getClientUploadedDocumentById(db, procedureId, uploadedDocumentId);

            if (!procedure || !uploadedDocument) {
                db.close();
                return sendJson(res, 404, { status: 'error', error_code: 'UPLOADED_DOCUMENT_NOT_FOUND', message: 'Documento subido no encontrado.' });
            }

            const requiredDocument = getClientRequiredDocumentById(db, procedureId, uploadedDocument.required_document_id);

            if (!requiredDocument) {
                db.close();
                return sendJson(res, 409, { status: 'error', error_code: 'UPLOADED_DOCUMENT_PROCEDURE_MISMATCH', message: 'El documento subido no pertenece al documento requerido de este trámite.' });
            }

            const storageBucket = String(uploadedDocument.storage_bucket || getClientDocumentsStorageBucket()).trim();
            const storagePath = String(uploadedDocument.storage_path || '').trim().replace(/^\/+/, '');

            if (!storageBucket || !storagePath) {
                db.close();
                return sendJson(res, 409, { status: 'error', error_code: 'UPLOADED_DOCUMENT_STORAGE_PATH_MISSING', message: 'No se puede eliminar el archivo porque faltan metadatos de almacenamiento.' });
            }

            const storageResult = getSupabaseStorageClient();

            if (!storageResult.ok) {
                db.close();
                return sendJson(res, 503, { status: 'error', error_code: storageResult.error_code, message: storageResult.message, storage: storageResult.env_status });
            }

            const { error } = await storageResult.client.storage.from(storageBucket).remove([storagePath]);
            const storageDeleteWarning = error ? String(error.message || 'El archivo no estaba disponible en Storage.') : '';

            if (error && !isSupabaseStorageMissingObjectError(error)) {
                db.close();
                return sendJson(res, 503, { status: 'error', error_code: 'SUPABASE_STORAGE_DELETE_FAILED', message: 'No se pudo eliminar el archivo de Supabase Storage.', detail: error.message, storage: storageResult.env_status });
            }

            try {
                db.exec('BEGIN');
                db.prepare(`
                    UPDATE client_uploaded_documents
                    SET deleted_at = CURRENT_TIMESTAMP,
                        deleted_reason = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND procedure_id = ? AND deleted_at IS NULL
                `).run('Eliminado por gestor', uploadedDocumentId, procedureId);

                const remainingUploads = db.prepare(`
                    SELECT COUNT(*) AS total
                    FROM client_uploaded_documents
                    WHERE procedure_id = ?
                      AND required_document_id = ?
                      AND deleted_at IS NULL
                `).get(procedureId, requiredDocument.id);

                if (Number(remainingUploads?.total || 0) === 0 && requiredDocument.status !== 'not_applicable') {
                    db.prepare(`
                        UPDATE client_required_documents
                        SET status = 'pending', updated_at = CURRENT_TIMESTAMP
                        WHERE id = ? AND procedure_id = ?
                    `).run(requiredDocument.id, procedureId);
                }

                db.prepare(`
                    INSERT INTO client_document_review_logs
                    (id, procedure_id, required_document_id, uploaded_document_id, action, actor, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(generateId(), procedureId, requiredDocument.id, uploadedDocumentId, 'document_deleted', 'manager', `Documento eliminado: ${uploadedDocument.original_filename}`);
                db.exec('COMMIT');

                const updated = hydrateClientProcedures(db, [db.prepare('SELECT * FROM client_procedure_requests WHERE id = ?').get(procedureId)])[0];
                db.close();

                return sendJson(res, 200, {
                    ok: true,
                    status: 'ok',
                    deleted: true,
                    warning: storageDeleteWarning || null,
                    message: 'Documento eliminado correctamente.',
                    procedure: updated
                });
            } catch (err) {
                try { db.exec('ROLLBACK'); } catch {}
                try { db.close(); } catch {}
                console.error('client document delete metadata error:', err);
                return sendJson(res, 500, { status: 'error', error_code: 'CLIENT_DOCUMENT_DELETE_METADATA_FAILED', message: 'El archivo se eliminó, pero no se pudo actualizar el registro documental.' });
            }
        } catch (err) {
            console.error('client document delete error:', err);
            return sendJson(res, 500, { status: 'error', error_code: 'CLIENT_DOCUMENT_DELETE_FAILED', message: 'No se pudo eliminar el documento.' });
        }
    }
    // API Route: GET /api/manager/client-procedures/:id/documents/:uploadedDocumentId/download-url
    const clientDocumentDownloadUrlMatch = pathname.match(/^\/api\/manager\/client-procedures\/([^/]+)\/documents\/([^/]+)\/download-url$/);
    if (clientDocumentDownloadUrlMatch && req.method === 'GET') {
        const procedureId = decodeURIComponent(clientDocumentDownloadUrlMatch[1]);
        const uploadedDocumentId = decodeURIComponent(clientDocumentDownloadUrlMatch[2]);

        try {
            const db = new DatabaseSync(DB_PATH);
            const uploadedDocument = getClientUploadedDocumentById(db, procedureId, uploadedDocumentId);
            db.close();

            if (!uploadedDocument) {
                return sendJson(res, 404, {
                    status: 'error',
                    error_code: 'UPLOADED_DOCUMENT_NOT_FOUND',
                    message: 'Documento subido no encontrado.'
                });
            }

            const storageResult = getSupabaseStorageClient();

            if (!storageResult.ok) {
                return sendJson(res, 503, {
                    status: 'error',
                    error_code: storageResult.error_code,
                    message: storageResult.message,
                    storage: storageResult.env_status
                });
            }

            const { data, error } = await storageResult.client
                .storage
                .from(uploadedDocument.storage_bucket)
                .createSignedUrl(uploadedDocument.storage_path, 300);

            if (error) {
                return sendJson(res, 503, {
                    status: 'error',
                    error_code: 'SUPABASE_SIGNED_DOWNLOAD_URL_FAILED',
                    message: 'No se pudo generar URL firmada de descarga.',
                    detail: error.message,
                    storage: storageResult.env_status
                });
            }

            return sendJson(res, 200, {
                status: 'ok',
                signed_url: data.signedUrl,
                expires_in_seconds: 300,
                document: uploadedDocument
            });
        } catch (err) {
            console.error('client document download url error:', err);
            return sendJson(res, 500, {
                status: 'error',
                error_code: 'CLIENT_DOCUMENT_DOWNLOAD_URL_FAILED',
                message: 'No se pudo preparar la descarga del documento.'
            });
        }
    }


    // API Route: GET /api/portal/client-procedures
    if (pathname === '/api/portal/client-procedures' && req.method === 'GET') {
        const sessionClientId = getAuthenticatedClientPortalClientId(req);

        if (!sessionClientId) {
            return requireClientPortalAuth(res, null);
        }

        try {
            const db = new DatabaseSync(DB_PATH);
            const procedures = db.prepare(`
                SELECT *
                FROM client_procedure_requests
                WHERE client_id = ?
                ORDER BY updated_at DESC, created_at DESC
                LIMIT 100
            `).all(sessionClientId);
            const hydrated = hydrateClientProcedures(db, procedures);
            db.close();

            const summary = hydrated.reduce((acc, procedure) => {
                if (procedure.status === 'open' || procedure.status === 'in_progress') acc.open_procedures += 1;

                for (const doc of procedure.required_documents || []) {
                    if (doc.status === 'pending') acc.pending_documents += 1;
                    if (doc.status === 'received' || doc.status === 'in_review') acc.received_or_review_documents += 1;
                    if (doc.status === 'accepted') acc.accepted_documents += 1;
                    if (doc.status === 'rejected') acc.rejected_documents += 1;
                }

                return acc;
            }, {
                open_procedures: 0,
                pending_documents: 0,
                received_or_review_documents: 0,
                accepted_documents: 0,
                rejected_documents: 0
            });

            return sendJson(res, 200, {
                status: 'ok',
                client_id: sessionClientId,
                count: hydrated.length,
                summary,
                procedures: hydrated
            });
        } catch (err) {
            console.error('portal client procedures list error:', err);
            return sendJson(res, 500, {
                status: 'error',
                error_code: 'PORTAL_CLIENT_PROCEDURES_LIST_FAILED',
                message: 'No se pudieron cargar los trámites solicitados.'
            });
        }
    }

    // API Route: POST /api/portal/client-procedures
    if (pathname === '/api/portal/client-procedures' && req.method === 'POST') {
        const sessionClientId = getAuthenticatedClientPortalClientId(req);

        if (!sessionClientId) {
            return requireClientPortalAuth(res, null);
        }

        return readRequestJson(req, async payload => {
            const body = payload && typeof payload === 'object' ? payload : {};
            const procedureType = String(body.procedure_type || '').trim();
            const catalogEntry = PORTAL_CLIENT_PROCEDURE_START_CATALOG[procedureType];
            const forbiddenField = Object.keys(body).find(field => !PORTAL_CLIENT_PROCEDURE_ALLOWED_FIELDS.has(field));

            if (forbiddenField) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'PORTAL_PROCEDURE_FORBIDDEN_FIELDS',
                    message: 'La solicitud no puede incluir campos arbitrarios o gestionados por la asesoría.'
                });
            }

            if (!catalogEntry) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_PORTAL_PROCEDURE_TYPE',
                    message: 'Tipo de solicitud documental no válido.'
                });
            }

            const validClient = getClientCatalog().find(client => client.id === sessionClientId);

            if (!validClient) {
                return sendJson(res, 403, {
                    status: 'error',
                    error_code: 'PORTAL_CLIENT_NOT_FOUND',
                    message: 'Cliente no válido para la sesión actual.'
                });
            }

            const metadata = normalizePortalClientProcedureMetadata(body, catalogEntry);

            if (!metadata.ok) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: metadata.error_code,
                    message: metadata.message
                });
            }

            const requiredDocuments = normalizeClientProcedureRequiredDocuments(catalogEntry.documents);

            if (!requiredDocuments.length) {
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'PORTAL_PROCEDURE_CATALOG_EMPTY',
                    message: 'El catálogo documental de este trámite no tiene documentos requeridos.'
                });
            }

            const procedureId = generateId();
            const title = buildPortalClientProcedureTitle(catalogEntry, metadata);
            const entityType = derivePortalClientProcedureEntityType(validClient);
            const employeeName = catalogEntry.labor ? metadata.reference_label : null;
            const referenceLabel = catalogEntry.labor ? null : metadata.reference_label;
            const db = new DatabaseSync(DB_PATH);

            try {
                db.exec('BEGIN');
                db.prepare(`
                    INSERT INTO client_procedure_requests
                    (id, client_id, procedure_type, entity_type, title, description, employee_name, priority, status, due_date, period_type, period_value, fiscal_year, procedure_subtype, reference_label)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'normal', 'open', ?, ?, ?, ?, ?, ?)
                `).run(
                    procedureId,
                    sessionClientId,
                    procedureType,
                    entityType,
                    title,
                    metadata.description,
                    employeeName,
                    metadata.due_date,
                    metadata.period_type,
                    metadata.period_value,
                    metadata.fiscal_year,
                    metadata.procedure_subtype,
                    referenceLabel
                );

                const docStmt = db.prepare(`
                    INSERT INTO client_required_documents
                    (id, procedure_id, document_key, document_label, required, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                for (const doc of requiredDocuments) {
                    docStmt.run(
                        doc.id,
                        procedureId,
                        doc.document_key,
                        doc.document_label,
                        doc.required,
                        doc.status,
                        doc.notes
                    );
                }

                db.prepare(`
                    INSERT INTO client_document_review_logs
                    (id, procedure_id, required_document_id, uploaded_document_id, action, actor, notes)
                    VALUES (?, ?, null, null, ?, ?, ?)
                `).run(
                    generateId(),
                    procedureId,
                    'procedure_created',
                    'client',
                    `Trámite iniciado por el cliente: ${title}`
                );

                db.exec('COMMIT');

                const procedure = hydrateClientProcedures(
                    db,
                    [db.prepare('SELECT * FROM client_procedure_requests WHERE id = ? AND client_id = ?').get(procedureId, sessionClientId)]
                )[0];
                db.close();

                return sendJson(res, 201, {
                    status: 'ok',
                    procedure
                });
            } catch (err) {
                try { db.exec('ROLLBACK'); } catch {}
                try { db.close(); } catch {}
                console.error('portal client procedure create error:', err);
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'PORTAL_CLIENT_PROCEDURE_CREATE_FAILED',
                    message: 'No se pudo iniciar la solicitud documental.'
                });
            }
        });
    }
    // API Route: POST /api/portal/client-procedures/:id/documents/:requiredDocumentId/upload-url
    const portalClientDocumentUploadUrlMatch = pathname.match(/^\/api\/portal\/client-procedures\/([^/]+)\/documents\/([^/]+)\/upload-url$/);
    if (portalClientDocumentUploadUrlMatch && req.method === 'POST') {
        const sessionClientId = getAuthenticatedClientPortalClientId(req);

        if (!sessionClientId) {
            return requireClientPortalAuth(res, null);
        }

        const procedureId = decodeURIComponent(portalClientDocumentUploadUrlMatch[1]);
        const requiredDocumentId = decodeURIComponent(portalClientDocumentUploadUrlMatch[2]);

        return readRequestJson(req, async payload => {
            const originalFilename = String(payload.original_filename || '').trim();
            const mimeType = String(payload.mime_type || '').trim();
            const fileSize = Number(payload.file_size || 0);
            const validation = validateClientPortalDocumentUploadMetadata({ originalFilename, mimeType, fileSize });

            if (!validation.ok) {
                return sendJson(res, validation.http_status || 400, {
                    status: 'error',
                    error_code: validation.error_code,
                    message: validation.message
                });
            }

            const db = new DatabaseSync(DB_PATH);
            const procedure = getClientProcedureById(db, procedureId);
            const requiredDocument = getClientRequiredDocumentById(db, procedureId, requiredDocumentId);
            db.close();

            if (!procedure || procedure.client_id !== sessionClientId || !requiredDocument) {
                return sendJson(res, 404, {
                    status: 'error',
                    error_code: 'PORTAL_CLIENT_REQUIRED_DOCUMENT_NOT_FOUND',
                    message: 'Trámite o documento requerido no encontrado.'
                });
            }

            const storageResult = getSupabaseStorageClient();

            if (!storageResult.ok) {
                return sendJson(res, 503, {
                    status: 'error',
                    error_code: storageResult.error_code,
                    message: storageResult.message,
                    storage: storageResult.env_status
                });
            }

            const uploadedDocumentId = generateId();
            const safeFilename = sanitizeClientDocumentFilename(originalFilename);
            const storageBucket = getClientDocumentsStorageBucket();
            const storagePath = buildClientProcedureStoragePath({
                clientId: sessionClientId,
                procedureId,
                requiredDocumentId,
                uploadedDocumentId,
                safeFilename
            });

            const { data, error } = await storageResult.client
                .storage
                .from(storageBucket)
                .createSignedUploadUrl(storagePath, { upsert: false });

            if (error) {
                return sendJson(res, 503, {
                    status: 'error',
                    error_code: 'SUPABASE_SIGNED_UPLOAD_URL_FAILED',
                    message: `No se pudo generar URL firmada. Confirma que existe el bucket privado ${storageBucket} y que el backend tiene permisos de Storage.`,
                    detail: error.message,
                    storage: storageResult.env_status
                });
            }

            return sendJson(res, 200, {
                status: 'ok',
                uploaded_document_id: uploadedDocumentId,
                original_filename: originalFilename,
                safe_filename: safeFilename,
                storage_bucket: storageBucket,
                storage_path: storagePath,
                signed_url: data.signedUrl,
                token: data.token,
                mime_type: validation.mime_type || mimeType || null,
                file_size: validation.file_size,
                upload_method: 'PUT_FORM_DATA',
                upload_file_field: '',
                expires_in_seconds: 7200
            });
        });
    }

    // API Route: POST /api/portal/client-procedures/:id/documents/:requiredDocumentId/complete-upload
    const portalClientDocumentCompleteUploadMatch = pathname.match(/^\/api\/portal\/client-procedures\/([^/]+)\/documents\/([^/]+)\/complete-upload$/);
    if (portalClientDocumentCompleteUploadMatch && req.method === 'POST') {
        const sessionClientId = getAuthenticatedClientPortalClientId(req);

        if (!sessionClientId) {
            return requireClientPortalAuth(res, null);
        }

        const procedureId = decodeURIComponent(portalClientDocumentCompleteUploadMatch[1]);
        const requiredDocumentId = decodeURIComponent(portalClientDocumentCompleteUploadMatch[2]);

        return readRequestJson(req, async payload => {
            const uploadedDocumentId = String(payload.uploaded_document_id || '').trim();
            const originalFilename = String(payload.original_filename || '').trim();
            const safeFilename = sanitizeClientDocumentFilename(payload.safe_filename || payload.original_filename);
            const storageBucket = String(payload.storage_bucket || getClientDocumentsStorageBucket()).trim();
            const storagePath = String(payload.storage_path || '').trim().replace(/^\/+/, '');
            const mimeType = String(payload.mime_type || '').trim();
            const fileSize = Number(payload.file_size || 0);
            const validation = validateClientPortalDocumentUploadMetadata({ originalFilename, mimeType, fileSize });

            if (!uploadedDocumentId || !originalFilename || !storagePath) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_COMPLETE_UPLOAD_PAYLOAD',
                    message: 'Faltan metadatos de confirmación de subida.'
                });
            }

            if (!validation.ok) {
                return sendJson(res, validation.http_status || 400, {
                    status: 'error',
                    error_code: validation.error_code,
                    message: validation.message
                });
            }

            const db = new DatabaseSync(DB_PATH);
            const procedure = getClientProcedureById(db, procedureId);
            const requiredDocument = getClientRequiredDocumentById(db, procedureId, requiredDocumentId);
            const existingUpload = getClientUploadedDocumentById(db, procedureId, uploadedDocumentId);

            if (!procedure || procedure.client_id !== sessionClientId || !requiredDocument) {
                db.close();
                return sendJson(res, 404, {
                    status: 'error',
                    error_code: 'PORTAL_CLIENT_REQUIRED_DOCUMENT_NOT_FOUND',
                    message: 'Trámite o documento requerido no encontrado.'
                });
            }

            if (existingUpload) {
                db.close();
                return sendJson(res, 409, {
                    status: 'error',
                    error_code: 'UPLOADED_DOCUMENT_ALREADY_REGISTERED',
                    message: 'El documento subido ya está registrado.'
                });
            }

            const expectedPrefix = getClientProcedureExpectedStoragePrefix({
                clientId: sessionClientId,
                procedureId,
                requiredDocumentId,
                uploadedDocumentId
            });

            if (storageBucket !== getClientDocumentsStorageBucket() || !storagePath.startsWith(expectedPrefix)) {
                db.close();
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_STORAGE_PATH',
                    message: 'La ruta de almacenamiento no corresponde al trámite y documento requeridos.'
                });
            }

            const storageCheck = await verifySupabaseStorageObject(storageBucket, storagePath);

            if (!storageCheck.ok) {
                db.close();
                return sendJson(res, 409, {
                    status: 'error',
                    error_code: storageCheck.error_code || 'SUPABASE_STORAGE_OBJECT_CHECK_FAILED',
                    message: storageCheck.message || 'No se pudo confirmar la existencia del archivo en Supabase Storage.',
                    storage: storageCheck.env_status || null
                });
            }

            try {
                db.exec('BEGIN');
                db.prepare(`
                    INSERT INTO client_uploaded_documents
                    (id, procedure_id, required_document_id, client_id, original_filename, safe_filename, storage_bucket, storage_path, mime_type, file_size, uploaded_by, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    uploadedDocumentId,
                    procedureId,
                    requiredDocumentId,
                    sessionClientId,
                    originalFilename,
                    safeFilename,
                    storageBucket,
                    storagePath,
                    validation.mime_type || mimeType || null,
                    validation.file_size,
                    'client',
                    'received',
                    null
                );
                db.prepare(`
                    UPDATE client_required_documents
                    SET status = 'received', updated_at = CURRENT_TIMESTAMP
                    WHERE id = ? AND procedure_id = ?
                `).run(requiredDocumentId, procedureId);
                db.prepare(`
                    INSERT INTO client_document_review_logs
                    (id, procedure_id, required_document_id, uploaded_document_id, action, actor, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    generateId(),
                    procedureId,
                    requiredDocumentId,
                    uploadedDocumentId,
                    'document_uploaded',
                    'client',
                    `Documento subido por el cliente: ${originalFilename}`
                );
                db.exec('COMMIT');

                const updated = hydrateClientProcedures(
                    db,
                    [db.prepare('SELECT * FROM client_procedure_requests WHERE id = ? AND client_id = ?').get(procedureId, sessionClientId)]
                )[0];
                db.close();

                return sendJson(res, 200, {
                    status: 'ok',
                    procedure: updated
                });
            } catch (err) {
                try { db.exec('ROLLBACK'); } catch {}
                try { db.close(); } catch {}
                console.error('portal client document complete upload error:', err);
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'PORTAL_CLIENT_DOCUMENT_COMPLETE_UPLOAD_FAILED',
                    message: 'No se pudieron registrar los metadatos del documento.'
                });
            }
        });
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


    // API Route: POST /api/portal/assistant-requests
    // CLIENT_ASSISTANT_DERIVATION_REQUEST_V1
    if (req.url === '/api/portal/assistant-requests') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { error: 'method_not_allowed' });
        }

        let chunks = [];
        req.on('data', chunk => { chunks.push(chunk); });
        req.on('end', async () => {
            const body = Buffer.concat(chunks).toString('utf8');
            const payload = parseJsonSafe(body);

            if (!payload || !payload.client_id || !payload.question || !payload.answer_text) {
                return sendJson(res, 400, {
                    status: 'error',
                    error_code: 'INVALID_ASSISTANT_REQUEST_PAYLOAD',
                    message: 'client_id, question y answer_text son obligatorios.'
                });
            }

            const client_id = String(payload.client_id || '').trim();
            const question = String(payload.question || '').trim();
            const answerTitle = String(payload.answer_title || 'Consulta del asistente').trim();
            const answerText = String(payload.answer_text || '').trim();

            if (!isClientPortalAuthenticatedForClient(req, client_id) && !isManagerAuthenticated(req)) {
                return requireClientPortalAuth(res, client_id);
            }

            const client = getClientCatalog().find(c => c.id === client_id || c.client_id === client_id || c.client_key === client_id);
            if (!client) {
                return sendJson(res, 403, {
                    status: 'error',
                    error_code: 'CLIENT_NOT_FOUND',
                    message: 'Cliente no encontrado.'
                });
            }

            const writeSource = getRadarWriteSource();
            const shouldUseSqlite = writeSource === RADAR_WRITE_SOURCE_SQLITE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
            const shouldUseSupabase = writeSource === RADAR_WRITE_SOURCE_SUPABASE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;

            const now = new Date().toISOString();
            const normalizedQuestion = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
            const sourceId = 'assistant_faq_' + sha256Hex(normalizedQuestion).slice(0, 16);

            const request = {
                id: 'asst_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12),
                tenant_id: 'default',
                client_id: client.id,
                client_name: client.name || client.nombre || client.id,
                package_id: null,
                package_item_id: null,
                source_type: 'assistant_faq',
                source_id: sourceId,
                title: 'Consulta derivada desde asistente FAQ',
                request_type: 'CONSULTA_ASISTENTE_FAQ',
                request_status: 'pending_contact',
                priority: 'high',
                message: 'Pregunta del cliente: ' + question + '\n\nRespuesta mostrada por el asistente: ' + answerText,
                created_at: now,
                updated_at: now,
                handled_at: null,
                handled_by: null,
                internal_notes: 'Origen: Asistente FAQ Portal Entidad. Título detectado: ' + answerTitle + '. Requiere revisión profesional por la asesoría.'
            };

            let db = null;
            let sqliteRequest = null;
            let supabaseRequest = null;

            try {
                if (shouldUseSqlite) {
                    db = new DatabaseSync(DB_PATH);

                    const existingStmt = db.prepare('SELECT * FROM client_interest_requests WHERE client_id = ? AND source_type = ? AND source_id = ? AND request_status = ?');
                    const existing = existingStmt.get(request.client_id, request.source_type, request.source_id, 'pending_contact');

                    if (existing) {
                        return sendJson(res, 200, {
                            status: 'ok',
                            action: 'existing_pending_assistant_request_found',
                            message: 'Ya existe una consulta pendiente para esta pregunta.',
                            request: existing,
                            write_source: writeSource,
                            sqlite_action: 'existing_pending_assistant_request_found',
                            supabase_action: shouldUseSupabase ? 'not_attempted_existing_sqlite' : 'not_used'
                        });
                    }
                }

                if (shouldUseSupabase) {
                    const supabaseResult = await createSupabasePortalInterestRequest(request);

                    if (!supabaseResult.ok) {
                        return sendJson(res, supabaseResult.http_status || 503, {
                            status: 'error',
                            error_code: supabaseResult.error_code || 'SUPABASE_ASSISTANT_REQUEST_INSERT_FAILED',
                            message: supabaseResult.message || 'No se ha podido registrar la consulta en Supabase.',
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_supabase_failed' : 'not_used',
                            supabase_action: 'failed'
                        });
                    }

                    supabaseRequest = supabaseResult.request;
                }

                if (shouldUseSqlite) {
                    const insertStmt = db.prepare('INSERT INTO client_interest_requests (id, tenant_id, client_id, client_name, package_id, package_item_id, source_type, source_id, title, request_type, request_status, priority, message, created_at, updated_at, handled_at, handled_by, internal_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?)');
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
                        request.updated_at,
                        request.internal_notes
                    );

                    sqliteRequest = db.prepare('SELECT * FROM client_interest_requests WHERE id = ?').get(request.id);
                }

                return sendJson(res, 200, {
                    status: 'ok',
                    action: 'assistant_request_created',
                    message: 'Consulta registrada correctamente. Tu asesoría la revisará.',
                    request: sqliteRequest || supabaseRequest || request,
                    write_source: writeSource,
                    sqlite_action: shouldUseSqlite ? 'created' : 'not_used',
                    supabase_action: shouldUseSupabase ? 'created' : 'not_used'
                });
            } catch (err) {
                console.error('Assistant Request Error:', err);
                return sendJson(res, 500, {
                    status: 'error',
                    error_code: 'ASSISTANT_REQUEST_INTERNAL_ERROR',
                    message: err.message,
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


            // CLIENT_PORTAL_AUTH_REQUIRED_INTEREST_POST_V1
            if (!isClientPortalAuthenticatedForClient(req, client_id)) {
                return requireClientPortalAuth(res, client_id);
            }

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



    // API Route: GET /api/manager/quarterly-documentation/status
    if (pathname === '/api/manager/quarterly-documentation/status' && req.method === 'GET') {
        if (!isQuarterlyDocumentationEnabled()) {
            return sendJson(res, 404, {
                status: 'error',
                error_code: 'FEATURE_DISABLED'
            });
        }

        return sendJson(res, 200, {
            ok: true,
            module: 'quarterly_documentation',
            enabled: true,
            version: 'v0.1-status',
            scope: 'manager_only',
            data_source: 'none_yet'
        });
    }

    // API Route: GET /api/manager/publication-generate/write-source/status
    // publication_generate_write_source_status_v1
    if (req.url.split('?')[0] === '/api/manager/publication-generate/write-source/status' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            mode: 'publication_generate_write_source_status_v1',
            ...getRadarPublicationGenerateWriteSourceStatus()
        });
    }

    // API Route: GET /api/manager/publication-publish/write-source/status
    if (req.url.split('?')[0] === '/api/manager/publication-publish/write-source/status' && req.method === 'GET') {
        return sendJson(res, 200, {
            status: 'ok',
            mode: 'publication_publish_write_source_status_v1',
            ...getRadarPublicationPublishWriteSourceStatus()
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

    // API Route: GET /api/manager/publication-packages/generate/preflight
    // publication_generate_preflight_v1
    if (req.url.split('?')[0] === '/api/manager/publication-packages/generate/preflight' && req.method === 'GET') {
        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const client_id = searchParams.get('client_id');
        const sector_key = searchParams.get('sector_key');
        const package_type = 'base_sector_package_v1';

        const writeSource = getRadarPublicationGenerateWriteSource();
        const shouldUseSqlite = writeSource === RADAR_WRITE_SOURCE_SQLITE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
        const shouldUseSupabase = writeSource === RADAR_WRITE_SOURCE_SUPABASE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;

        let db = null;

        try {
            if (!client_id || !sector_key) {
                return sendJson(res, 400, {
                    status: 'error',
                    mode: 'publication_generate_preflight_v1',
                    error: 'invalid_payload',
                    message: 'Missing client_id or sector_key',
                    write_source: writeSource,
                    write_mutation_executed: false,
                    valid_generate_mutation_sent: false
                });
            }

            const validClient = getClientCatalog().find(c => c.id === client_id);
            const clientSectorKey = validClient ? validClient.sector_key : null;
            const sectorMatchesClient = Boolean(validClient && clientSectorKey && clientSectorKey === sector_key);

            let sqliteSector = null;
            let sqliteExistingPublished = null;
            let sqliteDraft = null;
            let sqliteObligationsCount = null;
            let sqliteAidsCount = null;

            if (shouldUseSqlite) {
                db = new DatabaseSync(DB_PATH);

                sqliteSector = db.prepare('SELECT * FROM compliance_sectors WHERE sector_key = ?').get(sector_key);

                sqliteExistingPublished = db.prepare(`
                    SELECT id FROM client_publication_packages
                    WHERE client_id = ? AND sector_key = ? AND package_type = ?
                    AND package_status = 'published' AND review_status = 'approved'
                    AND publish_to_client = 1 AND needs_human_review = 0 AND client_publish_status = 'published'
                `).get(client_id, sector_key, package_type);

                sqliteDraft = db.prepare(`
                    SELECT id FROM client_publication_packages
                    WHERE client_id = ? AND sector_key = ? AND package_type = ?
                    AND package_status = 'draft_pending_review'
                `).get(client_id, sector_key, package_type);

                sqliteObligationsCount = db.prepare(`
                    SELECT count(*) AS c
                    FROM compliance_obligations
                    WHERE sector_key = ? AND id LIKE 'base_obligation_%'
                `).get(sector_key)?.c ?? 0;

                sqliteAidsCount = db.prepare(`
                    SELECT count(*) AS c
                    FROM aid_items
                    WHERE id LIKE 'aid_base_%'
                `).get()?.c ?? 0;
            }

            let supabaseConfigured = false;
            let supabaseClientError = null;
            let supabaseExistingPublished = null;
            let supabaseDraft = null;
            let supabaseExistingPublishedError = null;
            let supabaseDraftError = null;

            if (shouldUseSupabase) {
                const clientResult = getSupabaseReadonlyClient();

                if (!clientResult.ok) {
                    supabaseClientError = {
                        error_code: clientResult.error_code || 'SUPABASE_CLIENT_UNAVAILABLE',
                        message: clientResult.message || 'Supabase client unavailable.'
                    };
                } else {
                    supabaseConfigured = true;

                    const { data: publishedRows, error: publishedError } = await clientResult.client
                        .from('client_publication_packages')
                        .select('id')
                        .eq('client_id', client_id)
                        .eq('sector_key', sector_key)
                        .eq('package_type', package_type)
                        .eq('package_status', 'published')
                        .eq('review_status', 'approved')
                        .eq('publish_to_client', 1)
                        .eq('needs_human_review', 0)
                        .eq('client_publish_status', 'published')
                        .limit(1);

                    if (publishedError) {
                        supabaseExistingPublishedError = {
                            error_code: 'SUPABASE_GENERATE_PREFLIGHT_PUBLISHED_SELECT_FAILED',
                            message: publishedError.message
                        };
                    } else {
                        supabaseExistingPublished = Array.isArray(publishedRows) && publishedRows.length > 0 ? publishedRows[0] : null;
                    }

                    const { data: draftRows, error: draftError } = await clientResult.client
                        .from('client_publication_packages')
                        .select('id')
                        .eq('client_id', client_id)
                        .eq('sector_key', sector_key)
                        .eq('package_type', package_type)
                        .eq('package_status', 'draft_pending_review')
                        .limit(1);

                    if (draftError) {
                        supabaseDraftError = {
                            error_code: 'SUPABASE_GENERATE_PREFLIGHT_DRAFT_SELECT_FAILED',
                            message: draftError.message
                        };
                    } else {
                        supabaseDraft = Array.isArray(draftRows) && draftRows.length > 0 ? draftRows[0] : null;
                    }
                }
            }

            if (db) {
                db.close();
                db = null;
            }

            const sqliteReady = !shouldUseSqlite || Boolean(sqliteSector);
            const supabaseReady = !shouldUseSupabase || (supabaseConfigured && !supabaseClientError && !supabaseExistingPublishedError && !supabaseDraftError);

            const wouldGenerate = Boolean(
                validClient &&
                sectorMatchesClient &&
                sqliteReady &&
                supabaseReady &&
                !sqliteExistingPublished &&
                !supabaseExistingPublished
            );

            return sendJson(res, 200, {
                status: 'ok',
                mode: 'publication_generate_preflight_v1',
                client_id,
                sector_key,
                package_type,
                write_source: writeSource,
                should_use_sqlite: shouldUseSqlite,
                should_use_supabase: shouldUseSupabase,
                valid_client: Boolean(validClient),
                client_sector_key: clientSectorKey,
                sector_matches_client: sectorMatchesClient,
                client_name: validClient ? validClient.name : null,
                sqlite_sector_found: Boolean(sqliteSector),
                sqlite_existing_published_found: Boolean(sqliteExistingPublished),
                sqlite_existing_published_id: sqliteExistingPublished ? sqliteExistingPublished.id : null,
                sqlite_draft_found: Boolean(sqliteDraft),
                sqlite_draft_id: sqliteDraft ? sqliteDraft.id : null,
                sqlite_obligations_count: sqliteObligationsCount,
                sqlite_aids_count: sqliteAidsCount,
                supabase_configured: supabaseConfigured,
                supabase_client_error: supabaseClientError,
                supabase_existing_published_found: Boolean(supabaseExistingPublished),
                supabase_existing_published_id: supabaseExistingPublished ? supabaseExistingPublished.id : null,
                supabase_existing_published_error: supabaseExistingPublishedError,
                supabase_draft_found: Boolean(supabaseDraft),
                supabase_draft_id: supabaseDraft ? supabaseDraft.id : null,
                supabase_draft_error: supabaseDraftError,
                would_generate: wouldGenerate,
                write_mutation_executed: false,
                valid_generate_mutation_sent: false,
                valid_confirm_true_publish_sent: false,
                safe_note: 'Preflight only. No INSERT, UPDATE or DELETE executed.'
            });
        } catch (err) {
            if (db) {
                try { db.close(); } catch {}
            }

            return sendJson(res, 500, {
                status: 'error',
                mode: 'publication_generate_preflight_v1',
                error: 'preflight_internal_error',
                message: err.message,
                client_id,
                sector_key,
                write_source: writeSource,
                write_mutation_executed: false,
                valid_generate_mutation_sent: false,
                valid_confirm_true_publish_sent: false
            });
        }
    }

    // API Route: POST /api/manager/publication-packages/generate
    // write_switch_v1_publication_generate_real_sqlite_safe
    if (req.url === '/api/manager/publication-packages/generate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            const payload = parseJsonSafe(body);
            const writeSource = getRadarPublicationGenerateWriteSource();
            const shouldUseSqlite = writeSource === RADAR_WRITE_SOURCE_SQLITE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
            const shouldUseSupabase = writeSource === RADAR_WRITE_SOURCE_SUPABASE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
            if (!payload || !payload.client_id || !payload.sector_key) {
                return sendJson(res, 400, { error: 'invalid_payload', message: 'Missing client_id or sector_key' });
            }

            const validClient = getClientCatalog().find(c => c.id === payload.client_id);
            const clientSectorKey = validClient ? validClient.sector_key : null;
            const sectorMatchesClient = Boolean(validClient && clientSectorKey && clientSectorKey === payload.sector_key);
            if (!validClient) {
                return sendJson(res, 400, { error: 'invalid_client', message: 'El cliente indicado no existe en Clientes / Entidades.' });
            }

            if (!sectorMatchesClient) {
                return sendJson(res, 400, {
                    status: 'error',
                    error: 'invalid_client_sector',
                    message: 'El sector indicado no corresponde al cliente seleccionado.',
                    client_id: payload.client_id,
                    sector_key: payload.sector_key,
                    client_sector_key: clientSectorKey,
                    sector_matches_client: false,
                    write_source: writeSource,
                    sqlite_action: shouldUseSqlite ? 'not_attempted_invalid_client_sector' : 'not_used',
                    supabase_action: shouldUseSupabase ? 'not_attempted_invalid_client_sector' : 'not_used'
                });
            }

            if (shouldUseSupabase) {
                return sendJson(res, 501, {
                    status: 'error',
                    error: 'publication_generate_supabase_write_not_implemented',
                    message: 'Supabase write path for publication generate is not implemented yet. Keeping fail-closed.',
                    write_source: writeSource,
                    sqlite_action: shouldUseSqlite ? 'not_attempted_supabase_path_not_ready' : 'not_used',
                    supabase_action: 'not_implemented_fail_closed',
                    write_mutation_executed: false,
                    valid_generate_mutation_sent: false,
                    valid_confirm_true_publish_sent: false
                });
            }

            let db = null;
            let sqliteTransactionStarted = false;

            try {
                db = new DatabaseSync(DB_PATH);
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
                        write_source: writeSource,
                        sqlite_action: 'existing_published_package_found',
                        supabase_action: 'not_used',
                        client_sector_key: clientSectorKey,
                        sector_matches_client: true,
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
                
                const obligations = db.prepare("SELECT * FROM compliance_obligations WHERE sector_key = ? AND id LIKE 'base_obligation_%'").all(payload.sector_key) || [];
                const aids = db.prepare("SELECT * FROM aid_items WHERE id LIKE 'aid_base_%'").all() || [];

                let package_id = pkg ? pkg.id : generateId();

                db.exec('BEGIN');
                sqliteTransactionStarted = true;

                if (pkg) {
                    // Clean previous items
                    db.prepare("DELETE FROM client_publication_package_items WHERE package_id = ?").run(package_id);
                }

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

                db.exec('COMMIT');
                sqliteTransactionStarted = false;

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
                if (sqliteTransactionStarted && db) {
                    try { db.exec('ROLLBACK'); } catch {}
                    sqliteTransactionStarted = false;
                }

                if (db) {
                    try { db.close(); } catch {}
                }

                console.error(err);
                return sendJson(res, 500, {
                    status: 'error',
                    error: 'internal_error',
                    write_source: writeSource,
                    sqlite_action: shouldUseSqlite ? 'rolled_back_or_failed' : 'not_used',
                    supabase_action: shouldUseSupabase ? 'not_attempted_after_sqlite_error' : 'not_used'
                });
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

    // API Route: GET /api/manager/publication-packages/:id/publish/preflight
    // publication_publish_preflight_v1
    const packagePublishPreflightMatch = req.url.match(/^\/api\/manager\/publication-packages\/([^/]+)\/publish\/preflight$/);
    if (packagePublishPreflightMatch && req.method === 'GET') {
        const id = packagePublishPreflightMatch[1];
        const writeSource = getRadarPublicationPublishWriteSource();
        const shouldUseSqlite = writeSource === RADAR_WRITE_SOURCE_SQLITE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
        const shouldUseSupabase = writeSource === RADAR_WRITE_SOURCE_SUPABASE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;

        let db = null;

        try {
            let sqlitePkg = null;
            let supabasePkg = null;
            let sqliteDuplicate = null;
            let supabaseDuplicate = null;
            let supabasePackageError = null;
            let supabaseDuplicateError = null;

            if (shouldUseSupabase) {
                const supabasePackageResult = await getSupabasePublicationPackageByIdForApi(id);

                if (supabasePackageResult.ok) {
                    supabasePkg = supabasePackageResult.package;
                } else {
                    supabasePackageError = {
                        error_code: supabasePackageResult.error_code,
                        message: supabasePackageResult.message
                    };
                }
            }

            if (shouldUseSqlite) {
                db = new DatabaseSync(DB_PATH);
                sqlitePkg = db.prepare('SELECT * FROM client_publication_packages WHERE id = ?').get(id);
            }

            const pkg = supabasePkg || sqlitePkg;
            const validClient = pkg ? getClientCatalog().find(c => c.id === pkg.client_id) : null;
            const alreadyPublished = pkg ? pkg.package_status === 'published' : false;

            if (shouldUseSupabase && supabasePkg && !alreadyPublished) {
                const supabaseDuplicateResult = await getSupabaseDuplicatePublishedPublicationPackageForApi(supabasePkg);

                if (supabaseDuplicateResult.ok) {
                    supabaseDuplicate = supabaseDuplicateResult.duplicate;
                } else {
                    supabaseDuplicateError = {
                        error_code: supabaseDuplicateResult.error_code,
                        message: supabaseDuplicateResult.message
                    };
                }
            }

            if (shouldUseSqlite && sqlitePkg && !alreadyPublished) {
                sqliteDuplicate = db.prepare(`
                    SELECT id FROM client_publication_packages
                    WHERE client_id = ? AND sector_key = ? AND package_type = ?
                    AND id != ? AND package_status = 'published' AND review_status = 'approved'
                    AND publish_to_client = 1 AND needs_human_review = 0 AND client_publish_status = 'published'
                `).get(sqlitePkg.client_id, sqlitePkg.sector_key, sqlitePkg.package_type, sqlitePkg.id);
            }

            if (db) {
                db.close();
                db = null;
            }

            const wouldPublish = Boolean(
                pkg &&
                validClient &&
                !alreadyPublished &&
                !sqliteDuplicate &&
                !supabaseDuplicate &&
                !supabasePackageError &&
                !supabaseDuplicateError &&
                (!shouldUseSqlite || sqlitePkg) &&
                (!shouldUseSupabase || supabasePkg)
            );

            return sendJson(res, 200, {
                status: 'ok',
                mode: 'publication_publish_preflight_v1',
                package_id: id,
                write_source: writeSource,
                should_use_sqlite: shouldUseSqlite,
                should_use_supabase: shouldUseSupabase,
                sqlite_package_found: Boolean(sqlitePkg),
                supabase_package_found: Boolean(supabasePkg),
                supabase_package_error: supabasePackageError,
                valid_client: Boolean(validClient),
                client_sector_key: clientSectorKey,
                sector_matches_client: sectorMatchesClient,
                client_id: pkg ? pkg.client_id : null,
                sector_key: pkg ? pkg.sector_key : null,
                package_type: pkg ? pkg.package_type : null,
                package_status: pkg ? pkg.package_status : null,
                review_status: pkg ? pkg.review_status : null,
                publish_to_client: pkg ? pkg.publish_to_client : null,
                needs_human_review: pkg ? pkg.needs_human_review : null,
                client_publish_status: pkg ? pkg.client_publish_status : null,
                already_published: alreadyPublished,
                sqlite_duplicate_found: Boolean(sqliteDuplicate),
                sqlite_duplicate_id: sqliteDuplicate ? sqliteDuplicate.id : null,
                supabase_duplicate_found: Boolean(supabaseDuplicate),
                supabase_duplicate_id: supabaseDuplicate ? supabaseDuplicate.id : null,
                supabase_duplicate_error: supabaseDuplicateError,
                would_publish: wouldPublish,
                write_mutation_executed: false,
                valid_confirm_true_publish_sent: false,
                safe_note: 'Preflight only. No UPDATE or INSERT executed.'
            });
        } catch (err) {
            if (db) {
                try { db.close(); } catch {}
            }

            return sendJson(res, 500, {
                status: 'error',
                mode: 'publication_publish_preflight_v1',
                error: 'preflight_internal_error',
                message: err.message,
                package_id: id,
                write_source: writeSource,
                write_mutation_executed: false,
                valid_confirm_true_publish_sent: false
            });
        }
    }
    // API Route: POST /api/manager/publication-packages/:id/publish
    // write_switch_v1_publication_publish
    const packagePublishMatch = req.url.match(/^\/api\/manager\/publication-packages\/([^/]+)\/publish$/);
    if (packagePublishMatch && req.method === 'POST') {
        const id = packagePublishMatch[1];
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            const payload = parseJsonSafe(body);

            if (!payload || payload.confirm_publish !== true) {
                return sendJson(res, 400, { error: 'invalid_payload', message: 'confirm_publish = true is required' });
            }

            const writeSource = getRadarPublicationPublishWriteSource();
            const shouldUseSqlite = writeSource === RADAR_WRITE_SOURCE_SQLITE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;
            const shouldUseSupabase = writeSource === RADAR_WRITE_SOURCE_SUPABASE || writeSource === RADAR_WRITE_SOURCE_DUAL_WRITE;

            let db = null;
            let sqliteTransactionStarted = false;

            try {
                let sqlitePkg = null;
                let supabasePkg = null;

                if (shouldUseSupabase) {
                    const supabasePackageResult = await getSupabasePublicationPackageByIdForApi(id);

                    if (!supabasePackageResult.ok) {
                        return sendJson(res, supabasePackageResult.error_code === 'SUPABASE_PUBLICATION_PACKAGE_NOT_FOUND' ? 404 : 503, {
                            status: 'error',
                            error: 'supabase_publication_package_not_available',
                            error_code: supabasePackageResult.error_code,
                            message: supabasePackageResult.message,
                            action: 'publication_publish_failed',
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_after_supabase_select_failure' : 'not_used',
                            supabase_action: 'select_failed',
                            package_id: id
                        });
                    }

                    supabasePkg = supabasePackageResult.package;
                }

                if (shouldUseSqlite) {
                    db = new DatabaseSync(DB_PATH);
                    sqlitePkg = db.prepare('SELECT * FROM client_publication_packages WHERE id = ?').get(id);

                    if (!sqlitePkg && writeSource === RADAR_WRITE_SOURCE_SQLITE) {
                        return sendJson(res, 404, {
                            status: 'error',
                            error_code: 'package_not_found',
                            message: 'Publication package not found in SQLite.',
                            write_source: writeSource,
                            sqlite_action: 'not_found',
                            supabase_action: 'not_used'
                        });
                    }
                }

                const pkg = supabasePkg || sqlitePkg;

                if (!pkg) {
                    return sendJson(res, 404, {
                        status: 'error',
                        error_code: 'package_not_found',
                        message: 'Publication package not found.',
                        write_source: writeSource,
                        sqlite_action: shouldUseSqlite ? 'not_found' : 'not_used',
                        supabase_action: shouldUseSupabase ? 'not_found' : 'not_used'
                    });
                }

                const validClient = getClientCatalog().find(c => c.id === pkg.client_id);

                if (!validClient) {
                    return sendJson(res, 400, {
                        status: 'error',
                        error: 'invalid_client',
                        message: 'No se puede publicar un paquete de un cliente que no existe en Clientes / Entidades.',
                        write_source: writeSource
                    });
                }

                if (pkg.package_status === 'published') {
                    return sendJson(res, 200, {
                        status: 'ok',
                        action: 'already_published_noop',
                        write_source: writeSource,
                        sqlite_action: shouldUseSqlite ? (sqlitePkg ? 'already_published_noop' : 'not_found_skipped') : 'not_used',
                        supabase_action: shouldUseSupabase ? 'already_published_noop' : 'not_used'
                    });
                }

                if (shouldUseSupabase) {
                    const supabaseDuplicate = await getSupabaseDuplicatePublishedPublicationPackageForApi(pkg);

                    if (!supabaseDuplicate.ok) {
                        return sendJson(res, 503, {
                            status: 'error',
                            error: 'supabase_duplicate_check_failed',
                            error_code: supabaseDuplicate.error_code,
                            message: supabaseDuplicate.message,
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_after_supabase_duplicate_check_failure' : 'not_used',
                            supabase_action: 'duplicate_check_failed'
                        });
                    }

                    if (supabaseDuplicate.duplicate) {
                        return sendJson(res, 200, {
                            status: 'ok',
                            ok: false,
                            action: 'published_package_already_exists',
                            message: 'Ya existe otro paquete publicado para este cliente y sector. No se puede publicar duplicado.',
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_after_supabase_duplicate_found' : 'not_used',
                            supabase_action: 'duplicate_found',
                            existing_package_id: supabaseDuplicate.duplicate.id
                        });
                    }
                }

                if (sqlitePkg) {
                    const duplicatePublished = db.prepare(`
                        SELECT id FROM client_publication_packages
                        WHERE client_id = ? AND sector_key = ? AND package_type = ?
                        AND id != ? AND package_status = 'published' AND review_status = 'approved'
                        AND publish_to_client = 1 AND needs_human_review = 0 AND client_publish_status = 'published'
                    `).get(sqlitePkg.client_id, sqlitePkg.sector_key, sqlitePkg.package_type, sqlitePkg.id);

                    if (duplicatePublished) {
                        return sendJson(res, 200, {
                            status: 'ok',
                            ok: false,
                            action: 'published_package_already_exists',
                            message: 'Ya existe otro paquete publicado para este cliente y sector. No se puede publicar duplicado.',
                            write_source: writeSource,
                            sqlite_action: 'duplicate_found',
                            supabase_action: shouldUseSupabase ? 'not_attempted_after_sqlite_duplicate_found' : 'not_used',
                            existing_package_id: duplicatePublished.id
                        });
                    }
                }

                const date = new Date();
                const pad = function(n) { return n.toString().padStart(2, '0'); };
                const now = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
                const actor = payload.published_by || 'gestor_demo';
                const notes = payload.notes || 'Package published to client';

                const packageUpdatePayload = {
                    package_status: 'published',
                    review_status: 'approved',
                    needs_human_review: 0,
                    publish_to_client: 1,
                    client_publish_status: 'published',
                    approved_at: now,
                    approved_by: actor,
                    published_at: now,
                    published_by: actor,
                    updated_at: now
                };

                const itemUpdatePayload = {
                    review_status: 'approved',
                    needs_human_review: 0,
                    publish_to_client: 1,
                    client_publish_status: 'published',
                    updated_at: now
                };

                const logRow = {
                    id: generateId(),
                    package_id: id,
                    tenant_id: pkg.tenant_id,
                    client_id: pkg.client_id,
                    action: 'package_published_by_manager',
                    actor,
                    notes,
                    created_at: now
                };

                let supabasePackageUpdate = null;
                let supabaseItemsUpdate = null;
                let supabaseLogInsert = null;

                if (shouldUseSupabase) {
                    supabasePackageUpdate = await updateSupabasePublicationPackagePublishedForApi(id, packageUpdatePayload);

                    if (!supabasePackageUpdate.ok) {
                        return sendJson(res, 500, {
                            status: 'error',
                            error: 'supabase_publication_package_update_failed',
                            error_code: supabasePackageUpdate.error_code,
                            message: supabasePackageUpdate.message,
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_after_supabase_package_failure' : 'not_used',
                            supabase_action: 'package_update_failed',
                            package_id: id
                        });
                    }

                    supabaseItemsUpdate = await updateSupabasePublicationPackageItemsPublishedForApi(id, itemUpdatePayload);

                    if (!supabaseItemsUpdate.ok) {
                        return sendJson(res, 500, {
                            status: 'error',
                            error: 'supabase_publication_items_update_failed',
                            error_code: supabaseItemsUpdate.error_code,
                            message: supabaseItemsUpdate.message,
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_after_supabase_items_failure' : 'not_used',
                            supabase_action: 'items_update_failed',
                            package_id: id
                        });
                    }

                    supabaseLogInsert = await insertSupabasePublicationLogForApi(logRow);

                    if (!supabaseLogInsert.ok) {
                        return sendJson(res, 500, {
                            status: 'error',
                            error: 'supabase_publication_log_insert_failed',
                            error_code: supabaseLogInsert.error_code,
                            message: supabaseLogInsert.message,
                            write_source: writeSource,
                            sqlite_action: shouldUseSqlite ? 'not_attempted_after_supabase_log_failure' : 'not_used',
                            supabase_action: 'log_insert_failed',
                            package_id: id
                        });
                    }
                }

                let sqliteAction = shouldUseSqlite ? 'not_found_skipped' : 'not_used';

                if (sqlitePkg) {
                    db.exec('BEGIN');
                    sqliteTransactionStarted = true;

                    db.prepare(`
                        UPDATE client_publication_packages SET
                            package_status = 'published', review_status = 'approved',
                            needs_human_review = 0, publish_to_client = 1, client_publish_status = 'published',
                            approved_at = ?, approved_by = ?, published_at = ?, published_by = ?, updated_at = ?
                        WHERE id = ?
                    `).run(now, actor, now, actor, now, id);

                    db.prepare(`
                        UPDATE client_publication_package_items SET
                            review_status = 'approved', needs_human_review = 0,
                            publish_to_client = 1, client_publish_status = 'published', updated_at = ?
                        WHERE package_id = ?
                    `).run(now, id);

                    db.prepare(`
                        INSERT INTO client_publication_logs (id, package_id, tenant_id, client_id, action, actor, notes, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(logRow.id, id, pkg.tenant_id, pkg.client_id, logRow.action, actor, notes, now);

                    db.exec('COMMIT');
                    sqliteTransactionStarted = false;
                    sqliteAction = 'published_transaction_committed';
                }

                return sendJson(res, 200, {
                    status: 'ok',
                    action: 'published',
                    write_source: writeSource,
                    sqlite_action: sqliteAction,
                    supabase_action: shouldUseSupabase ? 'published' : 'not_used',
                    package_id: id,
                    supabase_package: supabasePackageUpdate ? supabasePackageUpdate.package : null,
                    supabase_items_count: supabaseItemsUpdate && Array.isArray(supabaseItemsUpdate.items) ? supabaseItemsUpdate.items.length : null,
                    supabase_log: supabaseLogInsert ? supabaseLogInsert.log : null
                });
            } catch (err) {
                if (sqliteTransactionStarted && db) {
                    try { db.exec('ROLLBACK'); } catch {}
                }

                console.error('Publication Publish Write Switch Error:', err);

                return sendJson(res, 500, {
                    status: 'error',
                    error: 'internal_error',
                    details: err.message,
                    write_source: getRadarWriteSource(),
                    package_id: id
                });
            } finally {
                if (db) {
                    try { db.close(); } catch {}
                }
            }
        });
        return;
    }

    // CLIENT_PORTAL_AUTH_REQUIRED_GET_GUARD_V1
    if (isClientPortalProtectedGetApiPath(pathname) && req.method === 'GET') {
        const queryString = req.url.split('?')[1] || '';
        const searchParams = new URLSearchParams(queryString);
        const clientId = String(searchParams.get('client_id') || '').trim();

        // CLIENT_PORTAL_MANAGER_PREVIEW_BYPASS_V1
        if (!clientId || (!isManagerAuthenticated(req) && !isClientPortalAuthenticatedForClient(req, clientId))) {
            requireClientPortalAuth(res, clientId);
            return;
        }
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







