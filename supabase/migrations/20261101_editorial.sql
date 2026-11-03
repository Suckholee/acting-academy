begin;
create table if not exists public.academy_editorial (
 id uuid primary key,
 draft jsonb not null,
 published jsonb,
 keywords text not null default '',
 review_notes jsonb not null default '[]'::jsonb,
 revision integer not null default 0 check (revision >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 published_at timestamptz
);
alter table public.academy_editorial enable row level security;
revoke all on public.academy_editorial from public, anon, authenticated;
grant select, insert, update on public.academy_editorial to service_role;
create index if not exists academy_editorial_published_at on public.academy_editorial(published_at desc) where published is not null;
notify pgrst, 'reload schema';
commit;
