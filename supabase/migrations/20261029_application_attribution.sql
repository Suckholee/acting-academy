begin;
alter table public.academy_inquiries add column if not exists attribution_source text;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.academy_inquiries'::regclass and conname='academy_inquiries_attribution_source_check') then
  alter table public.academy_inquiries add constraint academy_inquiries_attribution_source_check
   check(attribution_source is null or attribution_source in ('naver','google','instagram','facebook','kakao','daum','youtube','other','direct','unknown'));
 end if;
end $$;
create or replace function public.academy_application_sources(p_since timestamptz,p_until timestamptz)
returns table(source text,consultations bigint,events bigint)
language sql stable security invoker set search_path=public as $$
 select coalesce(attribution_source,'uncollected'),
 count(*) filter(where purposes @> '["수강 신청"]'::jsonb and not purposes @> '["무료특강 신청"]'::jsonb),
 count(*) filter(where purposes @> '["무료특강 신청"]'::jsonb and courses @> '["11/7 김정태 무료특강"]'::jsonb)
 from public.academy_inquiries
 where created_at>=p_since and created_at<p_until
 and (purposes @> '["수강 신청"]'::jsonb or (purposes @> '["무료특강 신청"]'::jsonb and courses @> '["11/7 김정태 무료특강"]'::jsonb))
 group by coalesce(attribution_source,'uncollected');
$$;
revoke all on function public.academy_application_sources(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.academy_application_sources(timestamptz,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
