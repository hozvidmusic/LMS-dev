import { supabase } from '@/supabase/client';

// ─── GRUPOS ───────────────────────────────────────────────────

export async function getGroups() {
  const { data, error } = await supabase
    .from('groups').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGroup({ name, description }) {
  const { error } = await supabase.from('groups').insert({ name, description });
  if (error) throw error;
}

export async function updateGroup(id, updates) {
  const { error } = await supabase.from('groups').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteGroup(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleGroupStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateGroup(id, { status: newStatus });
}

// ─── SUBGRUPOS ────────────────────────────────────────────────

export async function getSubgroupsByGroup(groupId) {
  const { data, error } = await supabase
    .from('subgroups').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createSubgroup({ groupId, name, description }) {
  const { error } = await supabase.from('subgroups').insert({ group_id: groupId, name, description });
  if (error) throw error;
}

export async function updateSubgroup(id, updates) {
  const { error } = await supabase.from('subgroups').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteSubgroup(id) {
  const { error } = await supabase.from('subgroups').delete().eq('id', id);
  if (error) throw error;
}

// ─── ASIGNACIÓN DE ALUMNOS A GRUPOS ──────────────────────────

export async function getGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('profile_groups')
    .select('*, profiles(id, display_name, username), subgroups(id, name)')
    .eq('group_id', groupId);
  if (error) throw error;
  return data;
}

export async function assignStudentToGroup({ userId, groupId, subgroupId }) {
  const { error } = await supabase.from('profile_groups').insert({
    user_id: userId,
    group_id: groupId,
    subgroup_id: subgroupId || null,
  });
  if (error) throw error;
}

export async function removeStudentFromGroup(id) {
  const { error } = await supabase.from('profile_groups').delete().eq('id', id);
  if (error) throw error;
}

export async function getStudentGroups(userId) {
  const { data, error } = await supabase
    .from('profile_groups')
    .select('*, groups(id, name), subgroups(id, name)')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}
