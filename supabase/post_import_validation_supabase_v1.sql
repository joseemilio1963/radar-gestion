-- Radar Gestion Valencia - Validacion post-importacion Supabase V1
-- Ejecutar despues de:
-- 1) 001_radar_schema_v1.sql
-- 2) 002_radar_rls_v1.sql
-- 3) 001_seed_demo_v1.sql

select 'user_clients' as table_name, count(*) as total from public.user_clients
union all
select 'compliance_obligations', count(*) from public.compliance_obligations
union all
select 'aid_items', count(*) from public.aid_items
union all
select 'radar_items', count(*) from public.radar_items
union all
select 'client_publication_packages', count(*) from public.client_publication_packages
union all
select 'client_publication_package_items', count(*) from public.client_publication_package_items
union all
select 'client_interest_requests', count(*) from public.client_interest_requests
union all
select 'radar_documents', count(*) from public.radar_documents
union all
select 'radar_review_logs', count(*) from public.radar_review_logs
order by table_name;

select
  'published_packages_safe' as check_name,
  count(*) as total
from public.client_publication_packages
where package_status = 'published'
  and review_status = 'approved'
  and needs_human_review = false
  and publish_to_client = true
  and client_publish_status = 'published';

select
  'published_items_safe' as check_name,
  count(*) as total
from public.client_publication_package_items
where review_status = 'approved'
  and needs_human_review = false
  and publish_to_client = true
  and client_publish_status = 'published'
  and include_in_package = true;

select
  request_status,
  count(*) as total
from public.client_interest_requests
group by request_status
order by request_status;

select
  client_id,
  client_name,
  package_status,
  review_status,
  needs_human_review,
  publish_to_client,
  client_publish_status,
  total_items
from public.client_publication_packages
order by client_id;
