begin;
create index academy_casting_application_roles on public.academy_casting_applications using gin ((answers->'roles'));
create function public.casting_application_counts(p_call uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(c.id::text,jsonb_build_object(
  'total',(select count(*) from public.academy_casting_applications a where a.call_id=c.id),
  'unreviewed',(select count(*) from public.academy_casting_applications a where a.call_id=c.id and a.status='접수'),
  'roles',coalesce((select jsonb_object_agg(r.role,r.total) from (
   select role,count(*) as total from public.academy_casting_applications a cross join lateral jsonb_array_elements_text(a.answers->'roles') role where a.call_id=c.id group by role
  ) r),'{}'::jsonb)
 )),'{}'::jsonb) from public.academy_casting_calls c where p_call is null or c.id=p_call;
$$;
create function public.search_casting_applications(p_call uuid,p_role text default '',p_status text default '',p_query text default '',p_offset integer default 0,p_consultation text default '')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if p_consultation not in ('','agreed','declined') or p_offset<0 or p_offset>100000 or length(p_query)>100 or length(p_role)>100 or (p_status<>'' and p_status not in ('접수','검토 중','연락 예정','심사 완료')) then raise exception 'invalid_filter'; end if;
 return (with filtered as (
  select * from public.academy_casting_applications a where a.call_id=p_call
   and (p_consultation='' or (p_consultation='agreed' and a.answers->'consultationConsent'='true'::jsonb) or (p_consultation='declined' and coalesce(a.answers->'consultationConsent','false'::jsonb)<>'true'::jsonb))
   and (p_role='' or (a.answers->'roles') ? p_role) and (p_status='' or a.status=p_status)
   and (p_query='' or position(lower(p_query) in lower(a.answers->>'name'))>0 or position(p_query in a.answers->>'phone')>0)
 ), page as (select * from filtered order by created_at desc,id desc limit 100 offset p_offset)
 select jsonb_build_object('total',(select count(*) from filtered),'applications',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb)));
end; $$;
revoke all on function public.casting_application_counts(uuid),public.search_casting_applications(uuid,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.casting_application_counts(uuid),public.search_casting_applications(uuid,text,text,text,integer,text) to service_role;
commit;
