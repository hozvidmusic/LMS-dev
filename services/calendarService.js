import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function getAllEvents() {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('*, profiles(display_name), groups(name), subgroups(name)')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getEventsForStudent(userId) {
  const { data: pg } = await supabaseAdmin
    .from('profile_groups').select('group_id').eq('user_id', userId).single();
  const { data: psg } = await supabaseAdmin
    .from('profile_subgroups').select('subgroup_id').eq('user_id', userId);

  const groupId = pg?.group_id || null;
  const subgroupIds = (psg || []).map(s => s.subgroup_id);

  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .select('*, profiles(display_name), groups(name), subgroups(name), event_ratings(rating, user_id)')
    .order('starts_at', { ascending: true });
  if (error) throw error;

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

export async function createEvent({ title, description, type, starts_at, ends_at, target, group_id, subgroup_id, created_by }) {
  const { data, error } = await supabaseAdmin
    .from('calendar_events')
    .insert({ title, description, type, starts_at, ends_at: ends_at || null, target, group_id: group_id || null, subgroup_id: subgroup_id || null, created_by })
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

export async function rateEvent({ event_id, user_id, rating }) {
  const { error } = await supabaseAdmin
    .from('event_ratings')
    .upsert({ event_id, user_id, rating }, { onConflict: 'event_id,user_id' });
  if (error) throw error;
}
