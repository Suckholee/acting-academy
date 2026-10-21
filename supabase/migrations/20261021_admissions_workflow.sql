begin;
set local search_path=public,extensions;
-- Private inquiry workflow with atomic revision checks and overlapping appointment protection.
create extension if not exists btree_gist with schema extensions;
create table if not exists public.academy_inquiry_workflow (
 inquiry_id uuid primary key references public.academy_inquiries(id) on delete cascade,
 stage text not null default '신청' check(stage in ('신청','비대면 상담 진행','대면 상담 진행','확정')),
 starts_at timestamptz,
 ends_at timestamptz,
 counselor text not null default '임도윤 실장',
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 check ((starts_at is null and ends_at is null) or (starts_at is not null and ends_at>starts_at)),
 check (stage <> '대면 상담 진행' or starts_at is not null),
 constraint inquiry_appointment_no_overlap exclude using gist
 (counselor with =, tstzrange(starts_at,ends_at,'[)') with &&)
 where (starts_at is not null)
);
alter table public.academy_inquiry_workflow enable row level security;
revoke all on public.academy_inquiry_workflow from anon,authenticated;
grant all on public.academy_inquiry_workflow to service_role;
create or replace function public.save_academy_inquiry_workflow(
 p_id uuid,p_stage text,p_starts_at timestamptz,p_ends_at timestamptz,
 p_counselor text,p_memo text,p_revision integer
) returns jsonb language plpgsql security invoker set search_path=public,extensions as $$
declare current_revision integer; result public.academy_inquiry_workflow;
begin
 perform 1 from public.academy_inquiries where id=p_id for update;
 if not found then raise exception 'inquiry_not_found'; end if;
 select revision into current_revision from public.academy_inquiry_workflow where inquiry_id=p_id;
 if coalesce(current_revision,0)<>p_revision then raise exception 'revision_conflict'; end if;
 insert into public.academy_inquiry_workflow(inquiry_id,stage,starts_at,ends_at,counselor,revision)
 values(p_id,p_stage,p_starts_at,p_ends_at,p_counselor,p_revision+1)
 on conflict(inquiry_id) do update set stage=excluded.stage,starts_at=excluded.starts_at,
 ends_at=excluded.ends_at,counselor=excluded.counselor,revision=excluded.revision,updated_at=now()
 returning * into result;
 update public.academy_inquiries set status=p_stage,memo=p_memo where id=p_id;
 return to_jsonb(result);
end;
$$;
revoke all on function public.save_academy_inquiry_workflow(uuid,text,timestamptz,timestamptz,text,text,integer) from public,anon,authenticated;
grant execute on function public.save_academy_inquiry_workflow(uuid,text,timestamptz,timestamptz,text,text,integer) to service_role;

commit;
