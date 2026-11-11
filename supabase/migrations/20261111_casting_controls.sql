begin;
create table if not exists public.academy_casting_audit (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 action text not null, subject text, actor text not null default 'admin', detail jsonb not null default '{}'
);
alter table public.academy_casting_audit enable row level security;
revoke all on public.academy_casting_audit from public,anon,authenticated;
grant select,insert on public.academy_casting_audit to service_role;
create index if not exists academy_casting_audit_created on public.academy_casting_audit(created_at desc);
create or replace function public.casting_retention_at_submission() returns trigger language plpgsql security invoker set search_path='' as $$
declare d jsonb; days integer;
begin
 select document into d from public.academy_casting_calls where id=new.call_id;
 days:=coalesce((d->>'retentionDays')::integer,365);
 if days not in (30,90,180,365) then raise exception 'invalid_retention'; end if;
 new.expires_at:=new.created_at+case when days=365 then interval '1 year' else make_interval(days=>days) end;
 new.consent_notice:=jsonb_set(new.consent_notice,'{retention}',to_jsonb(case when days=365 then '지원서 제출일로부터 1년간 보관 후 파기' else '지원서 제출일로부터 '||days||'일간 보관 후 파기' end));
 return new;
end; $$;
drop trigger if exists casting_retention_policy on public.academy_casting_applications;
create trigger casting_retention_policy before insert on public.academy_casting_applications for each row execute function public.casting_retention_at_submission();
commit;
