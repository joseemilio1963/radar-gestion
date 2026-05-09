import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_PATH = path.join(__dirname, 'database.sqlite');

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

const server = http.createServer((req, res) => {

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
    if (req.url === '/api/portal/interest-requests') {
        if (req.method !== 'POST') {
            return sendJson(res, 405, { error: 'method_not_allowed' });
        }

        let chunks = [];
        req.on('data', chunk => { chunks.push(chunk); });
        req.on('end', () => {
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

            try {
                const db = new DatabaseSync(DB_PATH);

                // Validations
                const itemStmt = db.prepare('SELECT * FROM client_publication_package_items WHERE id = ? AND client_id = ? AND source_type = ?');
                const item = itemStmt.get(package_item_id, client_id, 'aid_item');

                if (!item) {
                    db.close();
                    return sendJson(res, 403, { error: 'forbidden', message: 'Item not found, does not belong to client, or is not an aid_item' });
                }

                if (item.review_status !== 'approved' || item.needs_human_review !== 0 || item.publish_to_client !== 1 || item.client_publish_status !== 'published' || item.include_in_package !== 1) {
                    db.close();
                    return sendJson(res, 403, { error: 'forbidden', message: 'Item is not visible in Portal Entidad' });
                }

                const pkgStmt = db.prepare('SELECT * FROM client_publication_packages WHERE id = ?');
                const pkg = pkgStmt.get(item.package_id);

                if (!pkg || pkg.package_status !== 'published' || pkg.review_status !== 'approved' || pkg.needs_human_review !== 0 || pkg.publish_to_client !== 1 || pkg.client_publish_status !== 'published') {
                    db.close();
                    return sendJson(res, 403, { error: 'forbidden', message: 'Parent package is not published' });
                }

                // Check for idempotence
                const existingStmt = db.prepare('SELECT * FROM client_interest_requests WHERE client_id = ? AND package_item_id = ? AND request_status = ?');
                const existing = existingStmt.get(client_id, package_item_id, 'pending_contact');

                if (existing) {
                    db.close();
                    return sendJson(res, 200, {
                        status: 'ok',
                        action: 'existing_pending_request_found',
                        message: 'Ya tienes una solicitud pendiente para esta oportunidad.',
                        request: existing
                    });
                }

                // Insert
                const requestId = generateId();
                const defaultMessage = message || "El cliente solicita que su asesoría revise esta oportunidad.";
                const now = new Date().toISOString();

                const insertStmt = db.prepare(`
                    INSERT INTO client_interest_requests 
                    (id, tenant_id, client_id, client_name, package_id, package_item_id, source_type, source_id, title, request_type, request_status, priority, message, created_at, updated_at, handled_at, handled_by, internal_notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, null)
                `);

                insertStmt.run(
                    requestId,
                    item.tenant_id,
                    client_id,
                    client.name,
                    item.package_id,
                    package_item_id,
                    'aid_item',
                    item.source_id,
                    item.title,
                    item.request_type,
                    'pending_contact',
                    'normal',
                    defaultMessage,
                    now,
                    now
                );

                const newRequestStmt = db.prepare('SELECT * FROM client_interest_requests WHERE id = ?');
                const newRequest = newRequestStmt.get(requestId);

                db.close();

                return sendJson(res, 200, {
                    status: 'ok',
                    action: 'created',
                    message: 'Solicitud registrada. Tu asesoría revisará esta oportunidad.',
                    request: newRequest
                });

            } catch (err) {
                console.error('SQLite Error:', err);
                return sendJson(res, 500, { error: 'internal_error' });
            }
        });
        return;
    }


    // API Route: POST /api/manager/interest-requests/:id/status
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
        req.on('end', () => {
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

            try {
                const db = new DatabaseSync(DB_PATH);

                const existing = db.prepare('SELECT * FROM client_interest_requests WHERE id = ?').get(requestId);

                if (!existing) {
                    db.close();
                    return sendJson(res, 404, { error: 'not_found', message: 'Interest request not found' });
                }

                const now = new Date().toISOString();
                const handledAt = ['handled', 'dismissed'].includes(payload.request_status)
                    ? (payload.handled_at || now)
                    : existing.handled_at;

                const handledBy = payload.handled_by || existing.handled_by || 'gestor_demo';
                const internalNotes = payload.internal_notes ?? existing.internal_notes;

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
                    payload.request_status,
                    now,
                    handledAt,
                    handledBy,
                    internalNotes,
                    requestId
                );

                const updated = db.prepare('SELECT * FROM client_interest_requests WHERE id = ?').get(requestId);

                db.close();

                return sendJson(res, 200, {
                    status: 'ok',
                    action: 'interest_request_status_updated',
                    request: updated
                });

            } catch (err) {
                console.error('SQLite Error:', err);
                return sendJson(res, 500, { error: 'internal_error', details: err.message });
            }
        });

        return;
    }


    // API Route: GET /api/manager/commercial-dashboard
    if (req.url.split('?')[0] === '/api/manager/commercial-dashboard' && req.method === 'GET') {
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
                    p.client_publish_status AS client_publish_status
                FROM client_interest_requests r
                LEFT JOIN client_publication_packages p ON p.id = r.package_id
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

server.listen(PORT, () => {
    console.log(`Radar Asesorias server running at http://localhost:${PORT}/`);
});
