begin;
create table if not exists public.academy_member_usernames (
 username text primary key check(username ~ '^[a-z][a-z0-9_]{3,19}$' and username not in ('admin','administrator','root','support','system','kakao','google','account','signup','login')),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.academy_member_usernames enable row level security;
revoke all on public.academy_member_usernames from public,anon,authenticated;
grant select,insert on public.academy_member_usernames to service_role;
create table if not exists public.academy_member_auth_limits (
 bucket text primary key, attempts integer not null default 0, expires_at timestamptz not null
);
alter table public.academy_member_auth_limits enable row level security;
revoke all on public.academy_member_auth_limits from public,anon,authenticated;
grant select,insert,update,delete on public.academy_member_auth_limits to service_role;
create or replace function public.consume_member_auth_attempt(p_bucket text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare stamp timestamptz; wait_seconds integer;
begin
 if p_bucket is null or p_bucket !~ '^[a-f0-9]{64}$' then raise exception 'Invalid bucket'; end if;
 perform pg_advisory_xact_lock(20261026,1);
 stamp := clock_timestamp();
 delete from public.academy_member_auth_limits where expires_at <= stamp;
 insert into public.academy_member_auth_limits(bucket,expires_at) values (p_bucket,stamp+interval '15 minutes'),('global',stamp+interval '15 minutes') on conflict do nothing;
 select coalesce(max(ceil(extract(epoch from expires_at-stamp))::integer),0) into wait_seconds from public.academy_member_auth_limits where bucket in (p_bucket,'global') and attempts >= case when bucket='global' then 500 else 20 end;
 if wait_seconds > 0 then return wait_seconds; end if;
 update public.academy_member_auth_limits set attempts=attempts+1 where bucket in (p_bucket,'global');
 return 0;
end; $$;
revoke all on function public.consume_member_auth_attempt(text) from public,anon,authenticated;
grant execute on function public.consume_member_auth_attempt(text) to service_role;
commit;
