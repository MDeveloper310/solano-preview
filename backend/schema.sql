-- =====================================================================
-- Scroll California: visitor uploads backend (Supabase / Postgres)
-- Paste this WHOLE file into Supabase > SQL Editor > New query > Run.
-- Safe to re-run (idempotent where possible).
-- Creates: tables, row-level security, rate limits, report/claim RPCs,
--          the private "uploads" storage bucket and its policies.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- admins ----------
create table if not exists public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- no policies on admins: nobody can read or change it through the API.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- places & cities added by the admin (from visitor suggestions) ----------
create table if not exists public.cities (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null check (char_length(name) between 2 and 60),
  lat double precision, lng double precision,
  intro text check (char_length(intro) <= 400),
  created_at timestamptz not null default now()
);
create table if not exists public.places (
  slug      text primary key check (slug ~ '^[a-z0-9-]{2,100}$'),
  name      text not null check (char_length(name) between 2 and 100),
  city_slug text not null check (city_slug ~ '^[a-z0-9-]{2,60}$'),
  street    text check (char_length(street) <= 160),
  zip       text check (zip ~ '^[0-9]{5}$'),
  website   text check (char_length(website) <= 200),
  cuisine   text check (char_length(cuisine) <= 80),
  lat double precision, lng double precision,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.cities enable row level security;
alter table public.places enable row level security;
drop policy if exists "cities readable" on public.cities;
create policy "cities readable" on public.cities for select to anon, authenticated using (true);
drop policy if exists "cities admin write" on public.cities;
create policy "cities admin write" on public.cities for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "places readable" on public.places;
create policy "places readable" on public.places for select to anon, authenticated using (true);
drop policy if exists "places admin write" on public.places;
create policy "places admin write" on public.places for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- videos (one row per upload) ----------
do $$ begin
  create type public.video_status as enum ('pending', 'approved', 'rejected', 'removed');
exception when duplicate_object then null; end $$;

create table if not exists public.videos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  uploader_email  text,                                  -- filled by trigger, admins only
  status          public.video_status not null default 'pending',
  storage_path    text not null unique,
  mime            text not null check (mime in ('video/mp4', 'video/quicktime', 'video/webm')),
  size_bytes      bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  duration_s      numeric(6,2) not null check (duration_s >= 3 and duration_s <= 61),
  width int, height int,
  city_slug       text not null check (city_slug ~ '^[a-z0-9-]{2,60}$'),
  place_slug      text check (place_slug ~ '^[a-z0-9-]{2,100}$'),
  place_suggestion jsonb check (place_suggestion is null or (jsonb_typeof(place_suggestion) = 'object' and length(place_suggestion::text) <= 800)),
  dish_slug       text not null check (dish_slug ~ '^[a-z0-9-]{2,40}$'),
  caption         text not null check (char_length(caption) between 3 and 300),
  credit_name     text check (char_length(credit_name) <= 40),
  keep_audio      boolean not null default false,
  consent_rights  boolean not null,
  consent_music   boolean not null,
  consent_age18   boolean not null,
  consent_terms   boolean not null,
  consent_version text not null check (char_length(consent_version) <= 20),
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz,
  reviewed_by     uuid,
  review_note     text check (char_length(review_note) <= 400),
  public_slug     text unique,
  published_at    timestamptz,
  constraint consent_all check (consent_rights and consent_music and consent_age18 and consent_terms),
  constraint place_or_suggestion check (place_slug is not null or place_suggestion is not null),
  constraint path_is_owners check (split_part(storage_path, '/', 1) = user_id::text)
);
create index if not exists videos_status_idx on public.videos (status, created_at);
create index if not exists videos_user_idx on public.videos (user_id, created_at desc);
alter table public.videos enable row level security;

-- uploader inserts only their own, pending, unreviewed rows
drop policy if exists "upload own pending" on public.videos;
create policy "upload own pending" on public.videos for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and reviewed_at is null and public_slug is null and published_at is null);
-- uploader sees own rows; admins see everything
drop policy if exists "read own or admin" on public.videos;
create policy "read own or admin" on public.videos for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- only admins change rows (approve / reject / remove / edit caption, place, tag)
drop policy if exists "admin update" on public.videos;
create policy "admin update" on public.videos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- uploader may withdraw (delete) their own row while it's still pending; admins may delete any
drop policy if exists "withdraw pending" on public.videos;
create policy "withdraw pending" on public.videos for delete to authenticated
  using ((user_id = auth.uid() and status = 'pending') or public.is_admin());
-- anon gets nothing: published videos are served as static files by GitHub Pages.

-- insert trigger: force safe defaults, record email, rate-limit
create or replace function public.videos_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare n_day int; n_pending int;
begin
  new.status := 'pending'; new.created_at := now(); new.reviewed_at := null; new.reviewed_by := null;
  new.public_slug := null; new.published_at := null; new.review_note := null;
  new.user_id := auth.uid();
  select email into new.uploader_email from auth.users where id = new.user_id;
  select count(*) into n_day from public.videos where user_id = new.user_id and created_at > now() - interval '24 hours';
  if n_day >= 5 then raise exception 'Upload limit reached: 5 videos per 24 hours. Please try again tomorrow.'; end if;
  select count(*) into n_pending from public.videos where user_id = new.user_id and status = 'pending';
  if n_pending >= 5 then raise exception 'You already have 5 videos waiting for review. Please wait until they are reviewed.'; end if;
  return new;
end $$;
drop trigger if exists videos_before_insert on public.videos;
create trigger videos_before_insert before insert on public.videos for each row execute function public.videos_before_insert();

-- update trigger: stamp reviewer, freeze fields admins shouldn't change
create or replace function public.videos_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and auth.uid() is not null then
    new.reviewed_at := now(); new.reviewed_by := auth.uid();
  end if;
  new.user_id := old.user_id; new.storage_path := old.storage_path; new.uploader_email := old.uploader_email;
  new.created_at := old.created_at; new.size_bytes := old.size_bytes; new.mime := old.mime;
  new.consent_rights := old.consent_rights; new.consent_music := old.consent_music; new.consent_age18 := old.consent_age18;
  new.consent_terms := old.consent_terms; new.consent_version := old.consent_version;
  -- public_slug / published_at are set only by the publish job (secret key => auth.uid() is null)
  if auth.uid() is not null then new.public_slug := old.public_slug; new.published_at := old.published_at; end if;
  return new;
end $$;
drop trigger if exists videos_before_update on public.videos;
create trigger videos_before_update before update on public.videos for each row execute function public.videos_before_update();

-- slugs of published videos that were taken down (the site hides them instantly, before the next publish)
create or replace function public.hidden_slugs() returns table (slug text)
language sql stable security definer set search_path = public as $$
  select public_slug from public.videos where status in ('removed', 'rejected') and public_slug is not null;
$$;
grant execute on function public.hidden_slugs() to anon, authenticated;

-- ---------- helpers for anonymous forms ----------
create or replace function public.client_ip_hash() returns text
language sql stable as $$
  select encode(digest(coalesce(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), 'unknown') || ':sc-salt', 'sha256'), 'hex');
$$;

-- ---------- reports ----------
create table if not exists public.reports (
  id            bigint generated always as identity primary key,
  video_slug    text not null check (video_slug ~ '^[a-z0-9-]{2,120}$'),
  reason        text not null check (reason in ('not_food','spam','copyright','music','nudity','violence','hate','minor','privacy','wrong_place','other')),
  details       text check (char_length(details) <= 1000),
  contact_email text check (char_length(contact_email) <= 200),
  reporter      uuid,
  ip_hash       text,
  status        text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at    timestamptz not null default now(),
  handled_at    timestamptz, handled_by uuid
);
alter table public.reports enable row level security;
drop policy if exists "admin read reports" on public.reports;
create policy "admin read reports" on public.reports for select to authenticated using (public.is_admin());
drop policy if exists "admin update reports" on public.reports;
create policy "admin update reports" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_report(p_slug text, p_reason text, p_details text default null, p_email text default null) returns void
language plpgsql security definer set search_path = public as $$
declare h text := public.client_ip_hash();
begin
  if (select count(*) from public.reports where ip_hash = h and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many reports from this connection. Please try again later.';
  end if;
  insert into public.reports (video_slug, reason, details, contact_email, reporter, ip_hash)
  values (p_slug, p_reason, nullif(trim(p_details), ''), nullif(trim(p_email), ''), auth.uid(), h);
end $$;
revoke all on function public.submit_report(text, text, text, text) from public;
grant execute on function public.submit_report(text, text, text, text) to anon, authenticated;

-- ---------- claims ----------
create table if not exists public.claims (
  id          bigint generated always as identity primary key,
  place_slug  text not null check (place_slug ~ '^[a-z0-9-]{2,100}$'),
  name        text not null check (char_length(name) between 2 and 100),
  email       text not null check (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (char_length(phone) <= 40),
  role        text not null check (char_length(role) <= 60),
  message     text check (char_length(message) <= 1000),
  user_id     uuid,
  ip_hash     text,
  status      text not null default 'new' check (status in ('new', 'verified', 'rejected')),
  created_at  timestamptz not null default now()
);
alter table public.claims enable row level security;
drop policy if exists "admin read claims" on public.claims;
create policy "admin read claims" on public.claims for select to authenticated using (public.is_admin());
drop policy if exists "admin update claims" on public.claims;
create policy "admin update claims" on public.claims for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.submit_claim(p_place_slug text, p_name text, p_email text, p_phone text, p_role text, p_message text) returns void
language plpgsql security definer set search_path = public as $$
declare h text := public.client_ip_hash();
begin
  if (select count(*) from public.claims where ip_hash = h and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests from this connection. Please try again later.';
  end if;
  insert into public.claims (place_slug, name, email, phone, role, message, user_id, ip_hash)
  values (p_place_slug, trim(p_name), trim(p_email), nullif(trim(p_phone), ''), p_role, nullif(trim(p_message), ''), auth.uid(), h);
end $$;
revoke all on function public.submit_claim(text, text, text, text, text, text) from public;
grant execute on function public.submit_claim(text, text, text, text, text, text) to anon, authenticated;

-- ---------- table privileges (RLS still applies on top) ----------
revoke all on public.videos, public.reports, public.claims, public.admins from anon;
grant select, insert, update, delete on public.videos to authenticated;
grant select, update on public.reports, public.claims to authenticated;
grant select on public.places, public.cities to anon, authenticated;
grant insert, update, delete on public.places, public.cities to authenticated;

-- ---------- storage: private "uploads" bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sc uploads insert own folder" on storage.objects;
create policy "sc uploads insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sc uploads read own or admin" on storage.objects;
create policy "sc uploads read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "sc uploads delete own or admin" on storage.objects;
create policy "sc uploads delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- no UPDATE policy: files can't be overwritten after upload.
-- the publish job uses the SECRET key (bypasses RLS) to download approved files and delete them after publishing.

-- =====================================================================
-- LAST STEP (after you've signed in once on https://scrollcalifornia.com/admin/):
-- the admin page shows your user ID. Then run:
--   insert into public.admins (user_id) values ('PASTE-YOUR-USER-ID');
-- or, by email:
--   insert into public.admins (user_id) select id from auth.users where email = 'YOUR-GOOGLE-EMAIL';
-- =====================================================================
