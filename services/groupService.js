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
export async function createSubgroup({ groupId, name, description, color }) {
  const { error } = await supabase.from('subgroups').insert({
    group_id: groupId, name, description, color: color || '#7c6af7'
  });
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

// ─── MEMBRESÍA DE GRUPO ───────────────────────────────────────
export async function getGroupMembers(groupId) {
  const { data, error } = await supabase
    .from('profile_groups')
    .select('*, profiles(id, display_name, username)')
    .eq('group_id', groupId);
  if (error) throw error;
  return data;
}

export async function getStudentCurrentGroup(userId) {
  const { data, error } = await supabase
    .from('profile_groups')
    .select('*, groups(id, name)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function assignStudentToGroup({ userId, groupId }) {
  const existing = await getStudentCurrentGroup(userId);
  if (existing && existing.group_id !== groupId) {
    throw new Error(`Este alumno ya pertenece al grupo "${existing.groups?.name}". Quítalo primero desde la pestaña Alumnos.`);
  }
  const { error } = await supabase.from('profile_groups')
    .upsert({ user_id: userId, group_id: groupId }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function removeStudentFromGroup(userId) {
  // Al quitar del grupo también quitamos todos sus subgrupos
  await supabase.from('profile_subgroups').delete().eq('user_id', userId);
  const { error } = await supabase.from('profile_groups').delete().eq('user_id', userId);
  if (error) throw error;
}

// ─── MEMBRESÍA DE SUBGRUPOS ───────────────────────────────────
export async function getStudentSubgroups(userId) {
  const { data, error } = await supabase
    .from('profile_subgroups')
    .select('*, subgroups(id, name, color)')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function getSubgroupMembers(subgroupId) {
  const { data, error } = await supabase
    .from('profile_subgroups')
    .select('*, profiles(id, display_name, username)')
    .eq('subgroup_id', subgroupId);
  if (error) throw error;
  return data;
}

export async function assignStudentToSubgroup({ userId, subgroupId }) {
  const { error } = await supabase.from('profile_subgroups')
    .upsert({ user_id: userId, subgroup_id: subgroupId }, { onConflict: 'user_id,subgroup_id' });
  if (error) throw error;
}

export async function removeStudentFromSubgroup({ userId, subgroupId }) {
  const { error } = await supabase.from('profile_subgroups')
    .delete().eq('user_id', userId).eq('subgroup_id', subgroupId);
  if (error) throw error;
}

export async function getStudentGroups(userId) {
  const { data, error } = await supabase
    .from('profile_groups')
    .select('*, groups(id, name)')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function getAllSubgroups() {
  const { data, error } = await supabase
    .from('subgroups').select('*, groups(id, name)').order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}
