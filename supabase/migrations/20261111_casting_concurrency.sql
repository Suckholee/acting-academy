begin;
-- Share-lock blocks edits/closing, while permitting unrelated submissions.
create or replace function public.submit_casting_application(p_id uuid,p_call uuid,p_revision integer,p_answers jsonb,p_profile jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.academy_casting_calls; a public.academy_casting_applications;
begin
 select * into c from public.academy_casting_calls where id=p_call for share;
 if not found then raise exception 'call_missing'; end if;
 -- Distinct applicants may save concurrently; retries of one upload serialize.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_profile->>'path',0));
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

commit;
