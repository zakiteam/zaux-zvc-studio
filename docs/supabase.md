# Supabase: authentication and remote projects

## One-time setup

1. In the Supabase SQL Editor, run `supabase/migrations/20260907120000_zaux_builder.sql`.
2. In Authentication > Providers, enable Email and keep public sign-ups disabled.
3. Create the first user from Authentication > Users.
4. Enable that user with the SQL below, replacing the email:

```sql
update public.profiles
set active = true
where id = (select id from auth.users where email = 'user@example.com');
```

The app never uses a service-role key. Users and membership activation are administered from Supabase until a sharing UI is added.
## Fix for error 42501 when creating a project

If the builder reports `new row violates row-level security policy for table "projects" (42501)`, run `supabase/migrations/20260907130000_fix_project_create_rls.sql` in the Supabase SQL Editor. It adds the owner read policy required to return the newly inserted project and limits project creation to active authenticated users creating projects for themselves.

## Project roles

- The owner creates, reads, updates, deletes and shares a project.
- An editor reads and updates the workspace JSON and can rename the project.
- A viewer reads only.

To grant access before the sharing UI exists:

```sql
insert into public.project_members (project_id, user_id, role)
values (
  'PROJECT_UUID',
  (select id from auth.users where email = 'editor@example.com'),
  'editor'
);
```

Set `role` to `viewer` for read-only access. The database policies enforce these permissions independently of the client UI.

## Environment

Copy `.env.example` to `.env` locally. On Plesk, set the same variables in the Node.js application environment:

```text
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Both values are public client configuration. Do not add `SUPABASE_SERVICE_ROLE_KEY` to this project or to a browser environment.

## Rename and delete projects

Open the project dropdown in the top bar and select a remote project. The same menu contains New, Save, Rename and Delete actions. Owners and editors can rename it; only owners see the delete action. Deletion requires confirmation with the project name and removes its memberships through the existing cascade. The open workspace remains a local copy, detached from remote autosave. These actions use the existing RLS policies and require no additional migration.

Both mutations match the current revision and only update the UI after the server returns the affected row. Renaming waits for pending saves; deletion waits for an in-flight save and cancels remote autosave after success. A changed, inaccessible or deleted project leaves the dialog open with an error.

## Duplicate projects

Dashboard cards expose a one-click duplicate icon for owners and editors.
The action reads the latest saved server document and creates a project owned by
the current user, using the original name plus the localized copy suffix.
Unsaved browser edits are not part of this snapshot.

The new document gets a new workspace ID and timestamps. Nested IDs and references
are preserved within its independent JSON copy, including ZVP references and
source provenance. Templates, library definitions, styles, fonts and cover data
are retained. Media URLs still reference the same files; media records and project
memberships are not copied. The new card appears first in the dashboard.

The service uses the existing read/create policies and requires no SQL migration.
Runtime verification remains manual.

## Duplicate library entries and templates

The editor Library sidebar exposes duplicate icons on ZVC/ZVP cards and a compact
template list. These call the existing builder duplicate action, preserving undo
and autosave. Source definitions become independent configuration copies of the
same source implementation. Template copies receive new template, instance and
definition/node IDs through the existing copy helpers.