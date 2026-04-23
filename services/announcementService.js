import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/supabase/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function getAllAnnouncements() {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*, profiles(display_name), groups(name), subgroups(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAnnouncementsForStudent(userId) {
  // Obtener grupo y subgrupos del alumno
  const { data: pg } = await supabaseAdmin
    .from('profile_groups').select('group_id').eq('user_id', userId).single();
  const { data: psg } = await supabaseAdmin
    .from('profile_subgroups').select('subgroup_id').eq('user_id', userId);

  const groupId = pg?.group_id || null;
  const subgroupIds = (psg || []).map(s => s.subgroup_id);

  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*, profiles(display_name), groups(name), subgroups(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return data.filter(a => {
    if (a.target === 'all') return true;
    if (a.target === 'group' && a.group_id === groupId) return true;
    if (a.target === 'subgroup' && subgroupIds.includes(a.subgroup_id)) return true;
    return false;
  });
}

export async function createAnnouncement({ title, body, target, group_id, subgroup_id, created_by }) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .insert({ title, body, target, group_id: group_id || null, subgroup_id: subgroup_id || null, created_by })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabaseAdmin.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
