create table if not exists public.academy_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 name text not null default '' check(length(name)<=40),
 phone text not null default '' check(length(phone)<=20),
 status text not null default 'active' check(status in ('active','inactive','withdrawal_requested')),
 consented_at timestamptz,
 withdrawal_requested_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.academy_members enable row level security;
revoke all on public.academy_members from anon,authenticated;
grant select,insert,update,delete on public.academy_members to service_role;
-- All member access goes through server-verified identity; signup cannot grant admin.
