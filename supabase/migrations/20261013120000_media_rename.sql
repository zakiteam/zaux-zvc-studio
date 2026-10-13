-- Allow renaming catalog entries. The existing update policy already limits rows
-- to the global owner or project owners/editors; the name check keeps 1-200 chars.
grant update (name) on public.media_assets to authenticated;
