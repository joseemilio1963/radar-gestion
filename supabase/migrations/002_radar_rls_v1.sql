-- Radar Gestión Valencia — RLS V1
-- Enfoque inicial: fail-closed.
-- No se crean políticas públicas de lectura directa.
-- La app debe acceder mediante backend server-side o RPC controladas.

alter table public.user_clients enable row level security;
alter table public.compliance_obligations enable row level security;
alter table public.aid_items enable row level security;
alter table public.radar_items enable row level security;
alter table public.client_publication_packages enable row level security;
alter table public.client_publication_package_items enable row level security;
alter table public.client_interest_requests enable row level security;
alter table public.radar_documents enable row level security;
alter table public.radar_review_logs enable row level security;

-- IMPORTANTE:
-- Sin políticas explícitas, anon/authenticated no deben poder leer ni escribir tablas directamente.
-- El backend con service role podrá operar server-side.
-- En una fase posterior se crearán RPC:
--   rg_client_get_portal_data(client_key)
--   rg_client_create_interest_request(client_key, package_item_id)
--   rg_manager_get_commercial_dashboard()
--   rg_manager_update_interest_request_status(request_id, status, notes)
