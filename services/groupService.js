import { supabase } from '@/supabase/client';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY
);

export async function getGroups() {
  const { data, error } = await supabaseAdmin
    .from('groups').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createGroup(name, color) {
  const { data, error } = await supabaseAdmin
    .from('groups').insert({ name, color }).select().single();
  if (error) throw error;
  return data;
}

export async function updateGroup(id, updates) {
  const { error } = await supabaseAdmin.from('groups').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteGroup(id) {
  const { error } = await supabaseAdmin.from('groups').delete().eq('id', id);
  if (error) throw error;
}

export async function getSubgroupsByGroup(groupId) {
  const { data, error } = await supabaseAdmin
    .from('subgroups').select('*, groups(name)').eq('group_id', groupId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllSubgroups() {
  const { data, error } = await supabaseAdmin
    .from('subgroups').select('*, groups(name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createSubgroup(groupId, name, color) {
  const { data, error } = await supabaseAdmin
    .from('subgroups').insert({ group_id: groupId, name, color }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSubgroup(id, updates) {
  const { error } = await supabaseAdmin.from('subgroups').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteSubgroup(id) {
  const { error } = await supabaseAdmin.from('subgroups').delete().eq('id', id);
  if (error) throw error;
}

export async function getGroupMembers(groupId) {
  const { data, error } = await supabaseAdmin
    .from('profile_groups').select('*, profiles(*)').eq('group_id', groupId);
  if (error) throw error;
  return data;
}

export async function getSubgroupMembers(subgroupId) {
  const { data, error } = await supabaseAdmin
    .from('profile_subgroups').select('*, profiles(*)').eq('subgroup_id', subgroupId);
  if (error) throw error;
  return data;
}

export async function addMemberToGroup(userId, groupId) {
  const { error } = await supabaseAdmin
    .from('profile_groups').upsert({ user_id: userId, group_id: groupId });
  if (error) throw error;
}

export async function removeMemberFromGroup(userId) {
  const { error } = await supabaseAdmin
    .from('profile_groups').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function addMemberToSubgroup(userId, subgroupId) {
  const { error } = await supabaseAdmin
    .from('profile_subgroups').upsert({ user_id: userId, subgroup_id: subgroupId });
  if (error) throw error;
}

export async function removeMemberFromSubgroup(userId, subgroupId) {
  const { error } = await supabaseAdmin
    .from('profile_subgroups').delete().eq('user_id', userId).eq('subgroup_id', subgroupId);
  if (error) throw error;
}

export async function getUserGroup(userId) {
  const { data, error } = await supabaseAdmin
    .from('profile_groups').select('*, groups(*)').eq('user_id', userId).single();
  if (error) return null;
  return data;
}
