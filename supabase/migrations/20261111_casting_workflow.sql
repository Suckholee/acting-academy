begin;
alter table public.academy_casting_applications add column ai_summary jsonb;
create table public.academy_casting_workflows (
 call_id uuid primary key references public.academy_casting_calls(id),
 document jsonb not null, revision integer not null default 0, updated_at timestamptz not null default now()
);
alter table public.academy_casting_workflows enable row level security;
revoke all on public.academy_casting_workflows from public,anon,authenticated;
grant select,insert,update,delete on public.academy_casting_workflows to service_role;

create function public.casting_workflow_snapshot(p_call uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('call',(select to_jsonb(c) from public.academy_casting_calls c where c.id=p_call),
 'workflow',(select to_jsonb(w) from public.academy_casting_workflows w where w.call_id=p_call),
 'applications',coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.academy_casting_applications a where a.call_id=p_call),'[]'::jsonb));
$$;
revoke all on function public.casting_workflow_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.casting_workflow_snapshot(uuid) to service_role;

create function public.edit_casting_application(p_id uuid,p_revision integer,p_call_revision integer,p_answers jsonb,p_profile jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.academy_casting_applications; c public.academy_casting_calls;
begin
 select * into a from public.academy_casting_applications where id=p_id;
 if not found then raise exception 'application_missing'; end if;
 select * into c from public.academy_casting_calls where id=a.call_id for update;
 if c.revision<>p_call_revision or c.document->>'status'<>'published' or now()<(c.document->>'opensAt')::timestamptz or now()>=(c.document->>'closesAt')::timestamptz then raise exception 'call_changed_or_closed'; end if;
 update public.academy_casting_applications set consent_notice=jsonb_set(consent_notice,'{consultation}',jsonb_build_object('agreed',coalesce(p_answers->'consultationConsent','false'::jsonb),'recordedAt',now(),'version','2026-11-11','purpose','오디션 이후 김정태 배우아카데미 교육과정·수강 상담 안내','items','성명·휴대전화·이메일','retention','제출일부터 1년 이내 또는 동의 철회 시까지')),answers=p_answers,profile=p_profile,ai_summary=null,revision=revision+1
 where id=p_id and revision=p_revision and expires_at>now() returning * into a;
 if not found then raise exception 'application_changed'; end if;
 return to_jsonb(a);
end; $$;

create function public.save_casting_workflow(p_call uuid,p_call_revision integer,p_roster text,p_revision integer,p_document jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r integer; fingerprint text; w public.academy_casting_workflows;
begin
 select revision into r from public.academy_casting_calls where id=p_call;
 select md5(coalesce(string_agg(id::text||':'||revision::text,',' order by id::text),'')) into fingerprint from public.academy_casting_applications where call_id=p_call;
 if r is null or r<>p_call_revision or fingerprint<>p_roster then raise exception 'roster_changed'; end if;
 if p_revision is null then
  insert into public.academy_casting_workflows(call_id,document) values(p_call,p_document) on conflict do nothing returning * into w;
 else
  update public.academy_casting_workflows set document=p_document,revision=revision+1,updated_at=now() where call_id=p_call and revision=p_revision returning * into w;
 end if;
 if w.call_id is null then raise exception 'workflow_changed'; end if;
 return to_jsonb(w);
end; $$;
revoke all on function public.edit_casting_application(uuid,integer,integer,jsonb,jsonb),public.save_casting_workflow(uuid,integer,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.edit_casting_application(uuid,integer,integer,jsonb,jsonb),public.save_casting_workflow(uuid,integer,text,integer,jsonb) to service_role;
commit;
