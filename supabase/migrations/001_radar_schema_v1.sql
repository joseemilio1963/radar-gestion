-- Radar Gestión Valencia — Supabase schema V1
-- Objetivo: persistencia productiva inicial desde SQLite demo hacia Postgres/Supabase.
-- No ejecutar todavía en producción sin revisar.
-- Enfoque: fail-closed + trazabilidad + compatibilidad con la app actual.

create extension if not exists pgcrypto;

create table if not exists public.user_clients (
    id bigint primary key,
    org_id bigint not null default 1,
    client_key text unique,
    nombre text not null,
    nif text,
    email text,
    cnae text,
    sector_key text,
    tiene_empleados boolean not null default false,
    numero_empleados integer not null default 0,
    fecha_creacion timestamptz default now()
);

create table if not exists public.compliance_obligations (
    id text primary key,
    sector_key text,
    title text,
    summary text,
    obligation_type text,
    legal_reference text,
    source_name text,
    source_url text,
    territory text,
    risk_level text,
    status text,
    review_status text,
    needs_human_review boolean not null default true,
    publish_to_client boolean not null default false,
    last_reviewed_at timestamptz,
    tags_json jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.aid_items (
    id text primary key,
    aid_type text,
    title text,
    summary text,
    source_name text,
    source_url text,
    official_reference text,
    official_published_at timestamptz,
    territory text,
    territory_name text,
    deadline_at timestamptz,
    deadline_label text,
    amount_summary text,
    recommended_action text,
    request_type text,
    business_fit_score integer,
    match_confidence numeric,
    affected_sectors_json jsonb,
    affected_tags_json jsonb,
    affected_cnaes_json jsonb,
    requirements_json jsonb,
    review_status text,
    needs_human_review boolean not null default true,
    publish_to_client boolean not null default false,
    data_quality_warning boolean not null default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.radar_items (
    id text primary key,
    tenant_id text,
    title text,
    source_name text,
    source_url text,
    document_type text,
    category text,
    territory text,
    published_at timestamptz,
    review_status text,
    needs_human_review boolean not null default true,
    publish_to_client boolean not null default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.client_publication_packages (
    id text primary key,
    tenant_id text not null default 'default',
    client_id text not null,
    client_name text,
    sector_key text,
    package_type text,
    title text,
    summary text,
    package_status text,
    review_status text,
    needs_human_review boolean not null default true,
    publish_to_client boolean not null default false,
    client_publish_status text,
    data_quality_warning boolean not null default true,
    total_items integer not null default 0,
    total_compliance_items integer not null default 0,
    total_aid_items integer not null default 0,
    total_radar_items integer not null default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    approved_at timestamptz,
    approved_by text,
    published_at timestamptz,
    published_by text,
    notes text
);

create table if not exists public.client_publication_package_items (
    id text primary key,
    package_id text not null references public.client_publication_packages(id) on delete cascade,
    tenant_id text not null default 'default',
    client_id text not null,
    source_type text,
    source_id text,
    sector_key text,
    title text,
    summary text,
    item_type text,
    obligation_type text,
    request_type text,
    risk_level text,
    territory text,
    source_name text,
    source_url text,
    legal_reference text,
    amount_summary text,
    deadline_label text,
    eligibility_summary text,
    tags_json jsonb,
    confidence_level text,
    include_in_package boolean not null default false,
    review_status text,
    needs_human_review boolean not null default true,
    publish_to_client boolean not null default false,
    client_publish_status text,
    data_quality_warning boolean not null default true,
    display_order integer,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table if not exists public.client_interest_requests (
    id text primary key,
    tenant_id text not null default 'default',
    client_id text not null,
    client_name text,
    package_id text references public.client_publication_packages(id) on delete set null,
    package_item_id text references public.client_publication_package_items(id) on delete set null,
    source_type text,
    source_id text,
    title text,
    request_type text,
    request_status text,
    priority text,
    message text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    handled_at timestamptz,
    handled_by text,
    internal_notes text
);

create table if not exists public.radar_documents (
    id text primary key,
    radar_item_id text references public.radar_items(id) on delete cascade,
    raw_input_json jsonb,
    lorena_json jsonb,
    marc_json jsonb,
    quality_control_json jsonb,
    created_at timestamptz default now()
);

create table if not exists public.radar_review_logs (
    id text primary key,
    radar_item_id text references public.radar_items(id) on delete cascade,
    action text,
    actor text,
    notes text,
    created_at timestamptz default now()
);

create index if not exists idx_user_clients_client_key on public.user_clients(client_key);
create index if not exists idx_packages_client_id on public.client_publication_packages(client_id);
create index if not exists idx_packages_publication_gate on public.client_publication_packages(client_id, package_status, review_status, needs_human_review, publish_to_client, client_publish_status);
create index if not exists idx_package_items_package_id on public.client_publication_package_items(package_id);
create index if not exists idx_package_items_client_gate on public.client_publication_package_items(client_id, source_type, review_status, needs_human_review, publish_to_client, client_publish_status, include_in_package);
create index if not exists idx_interest_requests_client_status on public.client_interest_requests(client_id, request_status);
create index if not exists idx_interest_requests_package_item on public.client_interest_requests(package_item_id);
create index if not exists idx_compliance_sector on public.compliance_obligations(sector_key);
create index if not exists idx_aid_review_gate on public.aid_items(review_status, needs_human_review, publish_to_client);
create index if not exists idx_radar_review_gate on public.radar_items(review_status, needs_human_review, publish_to_client);
