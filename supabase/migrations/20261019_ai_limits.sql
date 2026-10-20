begin;
create table public.academy_ai_limits (
 bucket text primary key,
 attempts integer not null default 0,
 expires_at timestamptz not null
);
create index academy_ai_limits_expiry on public.academy_ai_limits(expires_at);
alter table public.academy_ai_limits enable row level security;
revoke all on public.academy_ai_limits from public, anon, authenticated;
grant select, insert, update, delete on public.academy_ai_limits to service_role;
-- Atomic shared limits: 10 calls per IP / 10 minutes, 200 total calls per day.
create function public.consume_academy_ai_attempt(p_bucket text)
returns integer language plpgsql security invoker set search_path = '' as $$
declare stamp timestamptz; entry record; wait_seconds integer := 0;
begin
 if p_bucket is null or p_bucket !~ '^[a-f0-9]{64}$' then raise exception 'Invalid bucket'; end if;
 perform pg_advisory_xact_lock(20261019, 1);
 stamp := clock_timestamp();
 delete from public.academy_ai_limits where expires_at <= stamp;
 insert into public.academy_ai_limits(bucket,expires_at)
 values ('global',stamp + interval '1 day'),(p_bucket,stamp + interval '10 minutes') on conflict do nothing;
 for entry in select * from public.academy_ai_limits where bucket in ('global',p_bucket) loop
  if entry.attempts >= (case when entry.bucket='global' then 200 else 10 end) then
   wait_seconds := greatest(wait_seconds,ceil(extract(epoch from entry.expires_at-stamp))::integer);
  end if;
 end loop;
 if wait_seconds>0 then return wait_seconds; end if;
 update public.academy_ai_limits set attempts=attempts+1 where bucket in ('global',p_bucket);
 return 0;
end;
$$;
revoke all on function public.consume_academy_ai_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_academy_ai_attempt(text) to service_role;
commit;
