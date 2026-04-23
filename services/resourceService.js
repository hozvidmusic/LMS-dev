import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function getResources() {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createResource({ title, description, type, drive_url, created_by }) {
  const { data, error } = await supabaseAdmin
    .from('resources')
    .insert({ title, description, type, drive_url, created_by })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateResource(id, updates) {
  const { error } = await supabaseAdmin
    .from('resources').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteResource(id) {
  const { error } = await supabaseAdmin
    .from('resources').delete().eq('id', id);
  if (error) throw error;
}
