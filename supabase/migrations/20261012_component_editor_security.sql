-- Browser writes and inquiry reads must go through authenticated server APIs.
drop policy if exists "Allow all updates on academy_cms" on public.academy_cms;
drop policy if exists "Allow all inserts on academy_cms" on public.academy_cms;
drop policy if exists "Allow public insert on academy_inquiries" on public.academy_inquiries;
drop policy if exists "Allow public select on academy_inquiries" on public.academy_inquiries;
drop policy if exists "Allow public update on academy_inquiries" on public.academy_inquiries;
drop policy if exists "Public Upload on academy-site-media" on storage.objects;
drop policy if exists "Public Update on academy-site-media" on storage.objects;
revoke insert, update, delete on public.academy_cms from anon, authenticated;
revoke all on public.academy_inquiries from anon, authenticated;
create or replace function public.save_academy_content(new_value jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = public as $$
declare next_revision bigint;
begin
 update public.academy_cms set value = new_value, revision = revision + 1, updated_at = now()
 where key = 'pages' and revision = expected_revision returning revision into next_revision;
 return next_revision;
end;
$$;
revoke all on function public.save_academy_content(jsonb,bigint) from public, anon, authenticated;
grant execute on function public.save_academy_content(jsonb,bigint) to service_role;
