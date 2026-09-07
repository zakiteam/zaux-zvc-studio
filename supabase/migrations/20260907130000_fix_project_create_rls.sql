-- Allows an authenticated, active owner to read the row returned by INSERT.
-- This keeps the owner path independent from the shared-membership lookup.
create policy "projects: owners read directly" on public.projects
for select to authenticated
using (
  (select public.is_active_user())
  and owner_id = (select auth.uid())
);

drop policy if exists "projects: active users create owned projects" on public.projects;

create policy "projects: active users create owned projects" on public.projects
for insert to authenticated
with check (
  (select public.is_active_user())
  and owner_id = (select auth.uid())
);
