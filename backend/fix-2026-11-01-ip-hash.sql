-- One-time fix for projects that ran schema.sql before 2026-11-01 19:00 PT.
-- Supabase keeps pgcrypto in the "extensions" schema, so the report/claim forms
-- failed with "function digest(text, unknown) does not exist". Paste into SQL Editor > Run.
create or replace function public.client_ip_hash() returns text
language sql stable set search_path = public, extensions as $$
  select encode(digest(coalesce(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), 'unknown') || ':sc-salt', 'sha256'), 'hex');
$$;
