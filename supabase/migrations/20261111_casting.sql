begin;
create table public.academy_casting_calls (
 id uuid primary key, document jsonb not null,
 revision integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (document->>'status' in ('draft','published','closed'))
);
create table public.academy_casting_applications (
 id uuid primary key, call_id uuid not null references public.academy_casting_calls(id),
 answers jsonb not null, profile jsonb not null, consent_notice jsonb not null,
 status text not null default '접수' check (status in ('접수','검토 중','연락 예정','심사 완료')),
 note text not null default '' check(length(note)<=4000), revision integer not null default 0,
 created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '1 year')
);
create unique index on public.academy_casting_applications ((profile->>'path'));
create index on public.academy_casting_applications(call_id,created_at desc,id);
alter table public.academy_casting_calls enable row level security;
alter table public.academy_casting_applications enable row level security;
revoke all on public.academy_casting_calls,public.academy_casting_applications from public,anon,authenticated;
grant select,insert,update,delete on public.academy_casting_calls,public.academy_casting_applications to service_role;

-- The call lock serializes a submission against concurrent edits or closing.
create function public.submit_casting_application(p_id uuid,p_call uuid,p_revision integer,p_answers jsonb,p_profile jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.academy_casting_calls; a public.academy_casting_applications;
begin
 select * into c from public.academy_casting_calls where id=p_call for update;
 if not found then raise exception 'call_missing'; end if;
 select * into a from public.academy_casting_applications where profile->>'path'=p_profile->>'path';
 if found then
  if a.call_id<>p_call or a.answers<>p_answers then raise exception 'request_conflict'; end if;
  return jsonb_build_object('id',a.id);
 end if;
 if c.revision<>p_revision then raise exception 'revision_conflict'; end if;
 if c.document->>'status'<>'published' or now()<(c.document->>'opensAt')::timestamptz or now()>=(c.document->>'closesAt')::timestamptz then raise exception 'call_closed'; end if;
 insert into public.academy_casting_applications(id,call_id,answers,profile,consent_notice)
 values(p_id,p_call,p_answers,p_profile,jsonb_build_object('title',c.document->>'title','organizer',c.document->>'organizer','retention',c.document->>'retention','version','2026-11-11','consultation',jsonb_build_object('agreed',coalesce(p_answers->'consultationConsent','false'::jsonb),'recordedAt',now(),'version','2026-11-11','purpose','오디션 이후 김정태 배우아카데미 교육과정·수강 상담 안내','items','성명·휴대전화·이메일','retention','제출일부터 1년 이내 또는 동의 철회 시까지'))) returning * into a;
 return jsonb_build_object('id',a.id);
end; $$;
revoke all on function public.submit_casting_application(uuid,uuid,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_casting_application(uuid,uuid,integer,jsonb,jsonb) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-casting-private','academy-casting-private',false,10485760,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
-- No public or member storage policies: all access is short-lived and server-authorized.
create table public.academy_casting_limits(bucket text primary key, attempts integer not null default 0, expires_at timestamptz not null);
alter table public.academy_casting_limits enable row level security;
revoke all on public.academy_casting_limits from public,anon,authenticated;
grant select,insert,update,delete on public.academy_casting_limits to service_role;
create function public.consume_casting_attempt(p_bucket text) returns integer language plpgsql security invoker set search_path='' as $$
declare entry public.academy_casting_limits;
begin
 if p_bucket is null or p_bucket !~ '^[a-f0-9]{64}$' then raise exception 'invalid_bucket'; end if;
 insert into public.academy_casting_limits(bucket,expires_at) values(p_bucket,now()+interval '15 minutes') on conflict do nothing;
 select * into entry from public.academy_casting_limits where bucket=p_bucket for update;
 if entry.expires_at<=now() then update public.academy_casting_limits set attempts=1,expires_at=now()+interval '15 minutes' where bucket=p_bucket; return 0; end if;
 if entry.attempts>=30 then return greatest(1,ceil(extract(epoch from entry.expires_at-now()))::integer); end if;
 update public.academy_casting_limits set attempts=attempts+1 where bucket=p_bucket;
 return 0;
end; $$;
revoke all on function public.consume_casting_attempt(text) from public,anon,authenticated;
grant execute on function public.consume_casting_attempt(text) to service_role;
commit;
