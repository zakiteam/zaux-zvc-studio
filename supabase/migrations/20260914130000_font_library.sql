create table public.font_library (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  family text not null check (char_length(trim(family)) between 1 and 120),
  href text not null check (href like 'https://%' and char_length(href) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index font_library_family on public.font_library(family) where archived_at is null;
create function public.touch_font_library() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger font_library_update before update on public.font_library for each row execute function public.touch_font_library();
alter table public.font_library enable row level security;
revoke all on public.font_library from anon, authenticated;
grant select, insert on public.font_library to authenticated;
grant update (family, href, archived_at) on public.font_library to authenticated;
create policy "fonts: active users read" on public.font_library for select to authenticated using (public.is_active_user());
create policy "fonts: active users create" on public.font_library for insert to authenticated with check (public.is_active_user() and owner_id = auth.uid() and archived_at is null);
create policy "fonts: authors manage" on public.font_library for update to authenticated using (public.is_active_user() and owner_id = auth.uid()) with check (public.is_active_user() and owner_id = auth.uid());
