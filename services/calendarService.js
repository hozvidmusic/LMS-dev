import { getAdminClient } from '@/supabase/adminClient';

const supabaseAdmin = getAdminClient();


export async function getAllEvents() {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('*, profiles(display_name), groups(name), subgroups(name)')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getEventsForStudent(userId, role) {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('*, profiles(display_name), groups(name), subgroups(name), event_ratings(rating, user_id, attended)')
    .order('starts_at', { ascending: true });
  if (error) throw error;

  // El admin ve todos los eventos
  if (role === 'admin') return data;

  const { data: pg } = await supabaseAdmin
    .from('profile_groups').select('group_id').eq('user_id', userId).maybeSingle();
  const { data: psg } = await supabaseAdmin
    .from('profile_subgroups').select('subgroup_id').eq('user_id', userId);

  const groupId = pg?.group_id || null;
  const subgroupIds = (psg || []).map(s => s.subgroup_id);

  return data.filter(e => {
    if (e.target === 'all') return true;
    if (e.target === 'group' && e.group_id === groupId) return true;
    if (e.target === 'subgroup' && subgroupIds.includes(e.subgroup_id)) return true;
    return false;
  });
}

export async function getEventRatings(eventId) {
  const { data, error } = await supabaseAdmin
    .from('event_ratings')
    .select('*, profiles(display_name)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createEvent({ title, description, type, modality, starts_at, ends_at, target, group_id, subgroup_id, created_by }) {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .insert({ title, description, type, modality: type === 'class' ? modality : null, starts_at, ends_at: ends_at || null, target, group_id: group_id || null, subgroup_id: subgroup_id || null, created_by })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, updates) {
  const { error } = await supabaseAdmin
    .from('calendar_events').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id) {
  const { error } = await supabaseAdmin.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}

export async function rateEvent({ event_id, user_id, rating, attended }) {
  const { error } = await supabaseAdmin
    .from('event_ratings')
    .upsert({ event_id, user_id, rating, attended }, { onConflict: 'event_id,user_id' });
  if (error) throw error;
}

export async function getPendingRatingsCount(userId, role) {
  const events = await getEventsForStudent(userId, role);
  const now = new Date();
  return events.filter(e => {
    const isPast = new Date(e.starts_at) <= now;
    const alreadyRated = e.event_ratings?.some(r => r.user_id === userId);
    return isPast && !alreadyRated;
  }).length;
}

export async function getUpcomingCount(userId, role) {
  const events = await getEventsForStudent(userId, role);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59);
  return events.filter(e => {
    const d = new Date(e.starts_at);
    return d > now && d <= tomorrow;
  }).length;
}
