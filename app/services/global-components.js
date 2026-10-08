import { useSupabaseClient } from './supabase.js';

// Supabase IO for the shared global ZVC/ZVP library (table public.global_components).
const COLUMNS = 'id, kind, name, export_name, zaux_version, revision, owner_id, updated_at, created_at';
const table = () => useSupabaseClient().from('global_components');

export async function listGlobalComponents({ definitions = false, thumbnails = false } = {}) {
  const columns = COLUMNS + (definitions ? ', definition' : '') + (thumbnails ? ', thumbnail' : '');
  const { data, error } = await table().select(columns).is('archived_at', null).order('name').order('id');
  if (error) throw error;
  return data ?? [];
}

// Latest row with its definition; archived rows are returned with archived_at set.
export async function getGlobalComponent(id) {
  const { data, error } = await table().select(COLUMNS + ', definition, archived_at').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createGlobalComponent(record, userId) {
  const { data, error } = await table().insert({ ...record, owner_id: userId }).select(COLUMNS).single();
  if (error) throw error;
  return data;
}

// Revision-matched: null means the row changed elsewhere (conflict). Also restores an archived row.
export async function updateGlobalComponent(record, revision) {
  const { id, kind, name, export_name, definition, zaux_version } = record;
  const { data, error } = await table().update({ kind, name, export_name, definition, zaux_version, archived_at: null })
    .eq('id', id).eq('revision', revision).select(COLUMNS).maybeSingle();
  if (error) throw error;
  return data;
}

export async function archiveGlobalComponent(id, revision) {
  const { data, error } = await table().update({ archived_at: new Date().toISOString() })
    .eq('id', id).eq('revision', revision).select(COLUMNS).maybeSingle();
  if (error) throw error;
  return data;
}

// Thumbnails do not change the revision (see the migration trigger).
export async function saveGlobalThumbnail(id, thumbnail) {
  const { data, error } = await table().update({ thumbnail: thumbnail || null }).eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('zx_builder_global_missing');
}
