create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  document jsonb not null,
  schema_version integer not null default 1,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.project_role(project_uuid uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when projects.owner_id = auth.uid() then 'owner' else (select role from public.project_members where project_id = project_uuid and user_id = auth.uid()) end
  from public.projects where id = project_uuid;
$$;

create or replace function public.protect_project_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.owner_id is distinct from old.owner_id then raise exception 'Project owner cannot be changed'; end if;
  new.revision := old.revision + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_project_update before update on public.projects for each row execute procedure public.protect_project_update();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "profiles: user reads own" on public.profiles for select using (id = auth.uid());

create policy "projects: members read" on public.projects for select using (public.is_active_user() and public.project_role(id) is not null);
create policy "projects: active users create owned projects" on public.projects for insert with check (public.is_active_user() and owner_id = auth.uid());
create policy "projects: owner and editors update" on public.projects for update using (public.is_active_user() and public.project_role(id) in ('owner', 'editor')) with check (public.is_active_user());
create policy "projects: owners delete" on public.projects for delete using (public.is_active_user() and public.project_role(id) = 'owner');

create policy "members: project members read" on public.project_members for select using (public.is_active_user() and public.project_role(project_id) is not null);
create policy "members: owners add" on public.project_members for insert with check (public.is_active_user() and public.project_role(project_id) = 'owner');
create policy "members: owners update" on public.project_members for update using (public.is_active_user() and public.project_role(project_id) = 'owner') with check (public.is_active_user() and public.project_role(project_id) = 'owner');
create policy "members: owners remove" on public.project_members for delete using (public.is_active_user() and public.project_role(project_id) = 'owner');
