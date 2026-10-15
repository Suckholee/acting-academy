begin;
create table public.academy_admin_sessions (
 id text primary key check (id ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null
);
create index academy_admin_sessions_expiry on public.academy_admin_sessions(expires_at);
create table public.academy_admin_login_limits (
 bucket text primary key,
 attempts integer not null default 0,
 expires_at timestamptz not null
);
create index academy_admin_login_limits_expiry on public.academy_admin_login_limits(expires_at);
alter table public.academy_admin_sessions enable row level security;
alter table public.academy_admin_login_limits enable row level security;
revoke all on public.academy_admin_sessions, public.academy_admin_login_limits from public, anon, authenticated;
grant select, insert, delete on public.academy_admin_sessions to service_role;
grant select, insert, update, delete on public.academy_admin_login_limits to service_role;

-- Shared transaction lock makes checks/increments atomic across serverless instances.
-- Count all attempts: 5 per IP and 100 globally in a 15-minute window.
create function public.consume_admin_login_attempt(p_bucket text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
 stamp timestamptz;
 entry record;
 wait_seconds integer := 0;
begin
 if p_bucket !~ '^[a-f0-9]{64}$' or p_bucket is null then raise exception 'Invalid bucket'; end if;
 perform pg_advisory_xact_lock(20261014, 1);
 stamp := clock_timestamp();
 delete from public.academy_admin_login_limits where expires_at <= stamp;
 delete from public.academy_admin_sessions where expires_at <= stamp;
 insert into public.academy_admin_login_limits(bucket, expires_at)
 values ('global', stamp + interval '15 minutes'), (p_bucket, stamp + interval '15 minutes')
 on conflict do nothing;
 for entry in select * from public.academy_admin_login_limits where bucket in ('global', p_bucket) loop
  if entry.attempts >= (case when entry.bucket = 'global' then 100 else 5 end) then
   wait_seconds := greatest(wait_seconds, ceil(extract(epoch from entry.expires_at - stamp))::integer);
  end if;
 end loop;
 if wait_seconds > 0 then return wait_seconds; end if;
 update public.academy_admin_login_limits set attempts = attempts + 1 where bucket in ('global', p_bucket);
 return 0;
end;
$$;
revoke all on function public.consume_admin_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_admin_login_attempt(text) to service_role;
commit;
