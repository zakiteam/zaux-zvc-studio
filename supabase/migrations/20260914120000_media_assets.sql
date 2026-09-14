-- Files live on the Nuxt host; Supabase only stores the authenticated catalog.
create table public.media_assets (
  id uuid primary key,
  scope text not null check (scope in ('project', 'global')),
  project_id uuid references public.projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  storage_key text not null unique check (storage_key = id::text || '.webp'),
  name text not null check (char_length(name) between 1 and 200),
  bytes bigint not null check (bytes > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check ((scope = 'project' and project_id is not null) or (scope = 'global' and project_id is null))
);
create index media_assets_project on public.media_assets(project_id, created_at desc) where archived_at is null;
create index media_assets_global on public.media_assets(owner_id, created_at desc) where scope = 'global' and archived_at is null;
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon, authenticated;
grant select, insert on public.media_assets to authenticated;
grant update (archived_at) on public.media_assets to authenticated;
create policy "media: authorized readers" on public.media_assets for select to authenticated using (
  public.is_active_user() and (
    (scope = 'global' and owner_id = auth.uid()) or
    (scope = 'project' and public.project_role(project_id) is not null)
  )
);
create policy "media: authorized uploads" on public.media_assets for insert to authenticated with check (
  public.is_active_user() and owner_id = auth.uid() and archived_at is null and (
    scope = 'global' or public.project_role(project_id) in ('owner', 'editor')
  )
);
create policy "media: authorized archiving" on public.media_assets for update to authenticated using (
  public.is_active_user() and (
    (scope = 'global' and owner_id = auth.uid()) or
    (scope = 'project' and public.project_role(project_id) in ('owner', 'editor'))
  )
) with check (public.is_active_user());
