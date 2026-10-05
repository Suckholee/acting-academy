-- Run once in a NEW Supabase project's SQL editor. No public signup is needed.
begin;
create table public.material_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('operator','trainer','reviewer')),
 display_name text not null
);
alter table public.material_members enable row level security;
create function public.is_material_reviewer() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.material_members where user_id=auth.uid() and role='reviewer');
$$;
revoke all on function public.is_material_reviewer() from public;
grant execute on function public.is_material_reviewer() to authenticated;
grant select on public.material_members to authenticated;
revoke all on public.material_members from anon;
create policy members_read on public.material_members for select to authenticated using(user_id=auth.uid() or public.is_material_reviewer());
-- Membership is assigned ONLY by the project owner in SQL/dashboard.
create table public.material_submissions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check(kind in ('operator','trainer')),
 status text not null default 'draft' check(status in ('draft','submitted')),
 payload jsonb not null default '{}' check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=65536),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submitted_at timestamptz
);
alter table public.material_submissions enable row level security;
grant select,insert,update on public.material_submissions to authenticated;
revoke all on public.material_submissions from anon;
create policy submissions_read on public.material_submissions for select to authenticated using((owner_id=auth.uid() and exists(select 1 from public.material_members where user_id=auth.uid())) or public.is_material_reviewer());
create policy submissions_create on public.material_submissions for insert to authenticated with check(owner_id=auth.uid() and exists(select 1 from public.material_members m where m.user_id=auth.uid() and (m.role=kind or m.role='reviewer')));
create policy submissions_edit on public.material_submissions for update to authenticated using(owner_id=auth.uid() and exists(select 1 from public.material_members where user_id=auth.uid())) with check(owner_id=auth.uid());
create function public.check_material_submission() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.owner_id<>old.owner_id or new.kind<>old.kind or new.id<>old.id then raise exception 'Submission identity cannot change'; end if;
  new.created_at=old.created_at; new.version=old.version+1;
 end if;
 if new.status='submitted' then
  if length(trim(coalesce(new.payload->>'name','')))<2 or length(trim(coalesce(new.payload->>'contact','')))<3 or coalesce(new.payload->>'consent','')<>'true' then raise exception 'Name, contact and collection consent required'; end if;
  new.submitted_at=now();
 else new.submitted_at=null; end if;
 new.updated_at=now(); return new;
end; $$;
create trigger material_submission_check before insert or update on public.material_submissions for each row execute function public.check_material_submission();
create table public.material_reviews (
 submission_id uuid primary key references public.material_submissions(id) on delete cascade,
 state text not null check(state in ('checking','needs_info','complete')),
 note text not null default '' check(length(note)<=5000),
 updated_at timestamptz not null default now()
);
alter table public.material_reviews enable row level security;
grant select,insert,update on public.material_reviews to authenticated;
revoke all on public.material_reviews from anon;
create policy review_read on public.material_reviews for select to authenticated using(public.is_material_reviewer() or exists(select 1 from public.material_submissions s where s.id=submission_id and s.owner_id=auth.uid()));
create policy review_create on public.material_reviews for insert to authenticated with check(public.is_material_reviewer());
create policy review_update on public.material_reviews for update to authenticated using(public.is_material_reviewer()) with check(public.is_material_reviewer());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('academy-materials','academy-materials',false,20971520,array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation']);
create function public.can_access_material_file(object_name text, writing boolean) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.material_submissions s join public.material_members m on m.user_id=auth.uid()
 where s.owner_id::text=split_part(object_name,'/',1) and s.id::text=split_part(object_name,'/',2)
 and case when writing then s.owner_id=auth.uid() and s.status='draft' else s.owner_id=auth.uid() or m.role='reviewer' end);
$$;
revoke all on function public.can_access_material_file(text,boolean) from public;
grant execute on function public.can_access_material_file(text,boolean) to authenticated;
create policy materials_files_read on storage.objects for select to authenticated using(bucket_id='academy-materials' and public.can_access_material_file(name,false));
create policy materials_files_create on storage.objects for insert to authenticated with check(bucket_id='academy-materials' and public.can_access_material_file(name,true));
create policy materials_files_delete on storage.objects for delete to authenticated using(bucket_id='academy-materials' and public.can_access_material_file(name,true));
commit;
