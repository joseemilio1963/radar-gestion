-- P0 Seguridad Cliente V1 - tabla de acceso Portal Entidad
-- Ejecutar en Supabase SQL Editor
-- No contiene claves reales ni datos sensibles.

create table if not exists public.client_portal_access (
  client_id text primary key,
  authorized_phone_hash text not null,
  access_key_hash text,
  access_key_salt text,
  access_configured boolean not null default false,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_portal_access_configured
on public.client_portal_access (access_configured);

alter table public.client_portal_access enable row level security;

-- No se crean policies p£blicas.
-- El acceso se realizar  exclusivamente desde backend con SUPABASE_SERVER_KEY.
