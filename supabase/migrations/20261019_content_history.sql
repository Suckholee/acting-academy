begin;
-- Immutable CMS override snapshots. Only authenticated server APIs can read them.
create table public.academy_content_history (
 revision bigint primary key check (revision >= 0),
 value jsonb not null,
 created_at timestamptz not null default clock_timestamp(),
 action text not null check (action in ('baseline','save','restore')),
 restored_from bigint
);
alter table public.academy_content_history enable row level security;
revoke all on public.academy_content_history from public, anon, authenticated, service_role;
grant select, insert on public.academy_content_history to service_role;
insert into public.academy_content_history(revision,value,action)
 select revision,value,'baseline' from public.academy_cms where key='pages';

create function public.save_academy_content_with_history(new_value jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare current_row public.academy_cms%rowtype; next_revision bigint;
begin
 select * into current_row from public.academy_cms where key='pages' for update;
 if not found or current_row.revision <> expected_revision then return null; end if;
 insert into public.academy_content_history(revision,value,action)
 values(current_row.revision,current_row.value,'baseline') on conflict do nothing;
 next_revision := current_row.revision+1;
 update public.academy_cms set value=new_value,revision=next_revision,updated_at=clock_timestamp() where key='pages';
 insert into public.academy_content_history(revision,value,action) values(next_revision,new_value,'save');
 return next_revision;
end;
$$;

-- Keep old callers versioned too, while the API calls the new name to fail closed
-- if this migration has not been installed.
create or replace function public.save_academy_content(new_value jsonb, expected_revision bigint)
returns bigint language sql security invoker set search_path = '' as $$
 select public.save_academy_content_with_history(new_value,expected_revision);
$$;

create function public.restore_academy_content(target_revision bigint, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare current_row public.academy_cms%rowtype; target_value jsonb; next_revision bigint;
begin
 select * into current_row from public.academy_cms where key='pages' for update;
 if not found or current_row.revision <> expected_revision then return null; end if;
 select value into target_value from public.academy_content_history where revision=target_revision;
 if not found then return null; end if;
 next_revision := current_row.revision+1;
 update public.academy_cms set value=target_value,revision=next_revision,updated_at=clock_timestamp() where key='pages';
 insert into public.academy_content_history(revision,value,action,restored_from)
 values(next_revision,target_value,'restore',target_revision);
 return next_revision;
end;
$$;
revoke all on function public.save_academy_content_with_history(jsonb,bigint),public.save_academy_content(jsonb,bigint),public.restore_academy_content(bigint,bigint) from public,anon,authenticated;
grant execute on function public.save_academy_content_with_history(jsonb,bigint),public.save_academy_content(jsonb,bigint),public.restore_academy_content(bigint,bigint) to service_role;
commit;
