import { useSupabaseClient } from './supabase.js';

export async function listRemoteProjects(userId) {
  const supabase = useSupabaseClient();
  const [{ data: projects, error }, { data: memberships, error: membershipError }] = await Promise.all([
    supabase.from('projects').select('id, name, owner_id, revision, updated_at').order('updated_at', { ascending: false }),
    supabase.from('project_members').select('project_id, role').eq('user_id', userId)
  ]);
  if (error || membershipError) throw error ?? membershipError;
  const roles = new Map((memberships ?? []).map(item => [item.project_id, item.role]));
  return (projects ?? []).map(project => ({ ...project, role: project.owner_id === userId ? 'owner' : roles.get(project.id) ?? 'viewer' }));
}

export async function getRemoteProject(id) {
  const { data, error } = await useSupabaseClient().from('projects').select('id, name, owner_id, revision, document, updated_at').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createRemoteProject(name, document, userId) {
  const { data, error } = await useSupabaseClient().from('projects').insert({ name, owner_id: userId, document, schema_version: document.schemaVersion ?? 1 }).select('id, name, owner_id, revision, updated_at').single();
  if (error) throw error;
  return { ...data, role: 'owner' };
}

export async function saveRemoteProject(project, document) {
  const { data, error } = await useSupabaseClient().from('projects').update({ document, schema_version: document.schemaVersion ?? 1 }).eq('id', project.id).eq('revision', project.revision).select('id, name, owner_id, revision, updated_at').maybeSingle();
  if (error) throw error;
  return data;
}

export async function renameRemoteProject(project, name) {
  const { data, error } = await useSupabaseClient().from('projects').update({ name }).eq('id', project.id).eq('revision', project.revision).select('id, name, owner_id, revision, updated_at').maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteRemoteProject(project) {
  const { data, error } = await useSupabaseClient().from('projects').delete().eq('id', project.id).eq('revision', project.revision).select('id').maybeSingle();
  if (error) throw error;
  return data;
}
