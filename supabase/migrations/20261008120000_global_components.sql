-- Global ZVC/ZVP library shared by every active user, edited in the Component designer.
-- One row per component; the definition is the ordinary Studio JSON definition.
-- zaux_version signs the Zaux release the component was last saved with.
create table public.global_components (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('zvc', 'zvp')),
  name text not null check (char_length(trim(name)) between 1 and 120),
  export_name text not null check (export_name ~ '^ZV[CP][A-Za-z0-9_]+$' and char_length(export_name) <= 120),
  definition jsonb not null,
  zaux_version text not null check (char_length(trim(zaux_version)) between 1 and 80),
  -- JPEG data URL generated from the hub management panel only.
  thumbnail text check (thumbnail is null or (thumbnail like 'data:image/jpeg;base64,%' and char_length(thumbnail) <= 500000)),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index global_components_name on public.global_components(name) where archived_at is null;

-- Content changes bump the revision (optimistic concurrency and "update available" in projects);
-- thumbnail-only updates keep revision and timestamps unchanged.
create function public.protect_global_component_update() returns trigger language plpgsql set search_path = public as $$
begin
  if new.owner_id is distinct from old.owner_id then raise exception 'Global component owner cannot be changed'; end if;
  if new.definition is distinct from old.definition or new.name is distinct from old.name or new.kind is distinct from old.kind
    or new.export_name is distinct from old.export_name or new.zaux_version is distinct from old.zaux_version
    or new.archived_at is distinct from old.archived_at then
    new.revision := old.revision + 1;
    new.updated_at := clock_timestamp();
    new.updated_by := auth.uid();
  else
    new.revision := old.revision;
    new.updated_at := old.updated_at;
    new.updated_by := old.updated_by;
  end if;
  return new;
end;
$$;
create trigger global_components_update before update on public.global_components for each row execute function public.protect_global_component_update();

alter table public.global_components enable row level security;
revoke all on public.global_components from anon, authenticated;
grant select, insert on public.global_components to authenticated;
grant update (kind, name, export_name, definition, zaux_version, thumbnail, archived_at) on public.global_components to authenticated;
-- Shared library: every active user reads, creates and edits; removal is a soft archive (no delete grant).
create policy "global components: active users read" on public.global_components for select to authenticated using (public.is_active_user());
create policy "global components: active users create" on public.global_components for insert to authenticated
  with check (public.is_active_user() and owner_id = auth.uid() and archived_at is null);
create policy "global components: active users update" on public.global_components for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());
