import { getAdminClient } from '@/supabase/adminClient';

const supabaseAdmin = getAdminClient();


export async function getAllAnnouncements() {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*, profiles(display_name), groups(name), subgroups(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAnnouncementsForStudent(userId, role) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .select('*, profiles(display_name), groups(name), subgroups(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;

  // El admin ve todos los anuncios sin filtrar
  if (role === 'admin') return data;

  const { data: pg } = await supabaseAdmin
    .from('profile_groups').select('group_id').eq('user_id', userId).maybeSingle();
  const { data: psg } = await supabaseAdmin
    .from('profile_subgroups').select('subgroup_id').eq('user_id', userId);

  const groupId = pg?.group_id || null;
  const subgroupIds = (psg || []).map(s => s.subgroup_id);
  const now = new Date().toISOString();

  return data.filter(a => {
    if (a.expires_at && a.expires_at < now) return false;
    if (a.target === 'all') return true;
    if (a.target === 'group' && a.group_id === groupId) return true;
    if (a.target === 'subgroup' && subgroupIds.includes(a.subgroup_id)) return true;
    return false;
  });
}

export async function getUnreadCountForStudent(userId, role) {
  const announcements = await getAnnouncementsForStudent(userId, role);
  return announcements.filter(a => !a.read_by?.includes(userId)).length;
}

export async function markAsRead(announcementId, userId, currentReadBy) {
  if (currentReadBy?.includes(userId)) return;
  const { error } = await supabaseAdmin
    .from('announcements')
    .update({ read_by: [...(currentReadBy || []), userId] })
    .eq('id', announcementId);
  if (error) throw error;
}

export async function createAnnouncement({ title, body, target, group_id, subgroup_id, created_by, expires_at }) {
  const { data, error } = await supabaseAdmin
    .from('announcements')
    .insert({
      title, body, target,
      group_id: group_id || null,
      subgroup_id: subgroup_id || null,
      created_by,
      read_by: [],
      expires_at: expires_at || null,
    })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateAnnouncement(id, { title, body, expires_at }) {
  const { error } = await supabaseAdmin
    .from('announcements')
    .update({ title, body, expires_at: expires_at || null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabaseAdmin.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
