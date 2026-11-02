import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'fs';
const db = new PGlite({ extensions: { pgcrypto } });
const stub = `
create role anon nologin; create role authenticated nologin;
create schema auth; create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
grant execute on function storage.foldername(text) to anon, authenticated;
grant usage on schema public to anon, authenticated;
insert into auth.users values ('11111111-1111-1111-1111-111111111111','a@x.com'),('22222222-2222-2222-2222-222222222222','b@x.com'),('33333333-3333-3333-3333-333333333333','admin@x.com');
`;
await db.exec(stub);
await db.exec(fs.readFileSync(process.argv[2], 'utf8'));
await db.exec(fs.readFileSync(process.argv[2], 'utf8')); // re-run idempotency
console.log('schema ran twice OK');
await db.exec(`insert into public.admins values ('33333333-3333-3333-3333-333333333333')`);
const A='11111111-1111-1111-1111-111111111111', Bu='22222222-2222-2222-2222-222222222222', AD='33333333-3333-3333-3333-333333333333';
async function as(role, sub, sql) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub||''}', false); set role ${role};`);
  try { const r = await db.query(sql); return r; } finally { await db.exec('reset role'); }
}
const row = (n, extra='') => `insert into public.videos (storage_path,mime,size_bytes,duration_s,city_slug,place_slug,dish_slug,caption,consent_rights,consent_music,consent_age18,consent_terms,consent_version${extra?',status,public_slug':''}) values ('${A}/v${n}.mp4','video/mp4',1000,10,'vacaville','fogao-gaucho-vacaville','steak','Great picanha',true,true,true,true,'2026-11-01'${extra}) returning status, uploader_email, public_slug`;
const check = (name, cond) => { console.log((cond?'PASS ':'FAIL ')+name); if(!cond) process.exitCode=1; };
let r = await as('authenticated', A, row(1, ",'approved','hack'"));
check('insert forced to pending + email recorded + slug cleared', r.rows[0].status==='pending' && r.rows[0].uploader_email==='a@x.com' && r.rows[0].public_slug===null);
for (let i=2;i<=5;i++) await as('authenticated', A, row(i));
try { await as('authenticated', A, row(6)); check('6th upload blocked', false);} catch(e){ check('6th upload blocked: '+e.message.slice(0,50), true); }
try { await as('authenticated', Bu, row(7).replace("true,true,true,true","true,false,true,true").replace('/v7','/v7')); check('x',false);} catch(e){ check('missing consent rejected: '+e.message.slice(0,60), true); }
 try { await as('authenticated', Bu, row(7).replace('/v7','/v7')); check('consent required', false);} catch(e){ check('missing consent rejected', true); }
try { await as('anon', '', row(8)); check('anon insert blocked', false);} catch(e){ check('anon insert blocked', true); }
try { await as('authenticated', Bu, row(9)); check('path must be own folder', false);} catch(e){ check('upload into someone else\'s folder blocked', true); }
r = await as('authenticated', Bu, 'select count(*)::int n from public.videos'); check('other user sees 0 rows', r.rows[0].n===0);
r = await as('authenticated', A, "update public.videos set status='approved' returning id"); check('uploader cannot approve', r.rows.length===0);
r = await as('authenticated', AD, 'select count(*)::int n from public.videos'); check('admin sees all 5', r.rows[0].n===5);
r = await as('authenticated', AD, "update public.videos set status='approved', public_slug='x' where storage_path like '%v1.mp4' returning reviewed_by, public_slug"); check('admin approve stamps reviewer, cannot set public_slug', r.rows[0].reviewed_by===AD && r.rows[0].public_slug===null);
await db.exec("select set_config('request.jwt.claim.sub','',false)"); await db.exec("update public.videos set public_slug='steak-vacaville-abc', published_at=now() where storage_path like '%v1.mp4'");
r = await as('authenticated', A, "delete from public.videos where storage_path like '%v1.mp4' returning id"); check('uploader cannot delete approved', r.rows.length===0);
r = await as('authenticated', A, "delete from public.videos where storage_path like '%v2.mp4' returning id"); check('uploader can withdraw pending', r.rows.length===1);
await as('anon','', "select public.submit_report('steak-vacaville-abc','copyright','mine',null)"); 
r = await as('anon','', 'select count(*)::int n from public.reports').catch(e=>({err:e})); check('anon cannot read reports', !!r.err);
r = await as('authenticated', AD, 'select count(*)::int n from public.reports'); check('admin reads report', r.rows[0].n===1);
try { await as('anon','', "select public.submit_report('x-y','bogus',null,null)"); check('bad reason rejected', false);} catch(e){ check('bad reason rejected', true); }
await as('anon','', "select public.submit_claim('fogao-gaucho-vacaville','Jo Doe','jo@fogao.com',null,'Owner','fix hours')");
r = await as('authenticated', AD, 'select count(*)::int n from public.claims'); check('claim stored', r.rows[0].n===1);
await as('authenticated', AD, "update public.videos set status='removed' where public_slug='steak-vacaville-abc'");
r = await as('anon','', 'select * from public.hidden_slugs()'); check('hidden_slugs lists removed', r.rows[0]?.slug==='steak-vacaville-abc');
r = await as('anon','', 'select count(*)::int n from public.places'); check('anon reads places', r.rows[0].n===0);
try { await as('authenticated', A, "insert into public.places (slug,name,city_slug) values ('fake-place','Fake','vacaville')"); check('non-admin place insert blocked', false);} catch(e){ check('non-admin place insert blocked', true); }
await as('authenticated', AD, "insert into public.places (slug,name,city_slug) values ('real-place','Real','vacaville')"); check('admin adds place', true);
await as('authenticated', A, `insert into storage.objects (bucket_id,name) values ('uploads','${A}/f.mp4')`); check('storage own folder insert', true);
try { await as('authenticated', A, `insert into storage.objects (bucket_id,name) values ('uploads','${Bu}/f.mp4')`); check('storage other folder blocked', false);} catch(e){ check('storage other-folder insert blocked', true); }
r = await as('authenticated', Bu, 'select count(*)::int n from storage.objects'); check('storage other user cannot list', r.rows[0].n===0);
r = await as('authenticated', AD, 'select count(*)::int n from storage.objects'); check('storage admin can read', r.rows[0].n===1);
r = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id='uploads'"); check('bucket private 50MB 3 types', r.rows[0].public===false && Number(r.rows[0].file_size_limit)===52428800 && r.rows[0].allowed_mime_types.length===3);
