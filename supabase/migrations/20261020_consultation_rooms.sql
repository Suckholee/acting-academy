begin;
create table public.academy_consultation_rooms (
 id uuid primary key,
 name text not null check (char_length(name) between 1 and 80),
 phone text not null check (char_length(phone) between 7 and 40),
 source text not null check (char_length(source) between 1 and 120),
 interest text not null default '' check (char_length(interest) <= 120),
 counselor text not null default '' check (char_length(counselor) <= 80),
 special text not null default '' check (char_length(special) <= 2000),
 status text not null default 'ready' check (status in ('ready','in_progress','completed')),
 guide_version text not null check (guide_version ~ '^[a-f0-9]{16}$'),
 page_ids integer[] not null check (cardinality(page_ids) between 1 and 50),
 last_page integer not null check (last_page between 1 and 50),
 annotations jsonb not null default '{}' check (jsonb_typeof(annotations) = 'object' and octet_length(annotations::text) <= 12000000),
 journal jsonb not null default '{}' check (jsonb_typeof(journal) = 'object' and octet_length(journal::text) <= 150000),
 revision integer not null default 0 check (revision >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index academy_consultation_rooms_created on public.academy_consultation_rooms(created_at desc,id desc);
alter table public.academy_consultation_rooms enable row level security;
revoke all on public.academy_consultation_rooms from public, anon, authenticated;
grant select,insert,update on public.academy_consultation_rooms to service_role;
commit;
