-- The original check references both storage_key and id, so its generated name
-- can differ between installations. Replace only checks involving storage_key.
begin;

do $$
declare
  existing_constraint record;
begin
  for existing_constraint in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.media_assets'::regclass
      and c.contype = 'c'
      and a.attname = 'storage_key'
  loop
    execute format('alter table public.media_assets drop constraint %I', existing_constraint.conname);
  end loop;
end $$;

alter table public.media_assets
  add constraint media_assets_storage_key_check check (
    storage_key in (id::text || '.jpg', id::text || '.png', id::text || '.webp', id::text || '.svg')
  );

commit;
