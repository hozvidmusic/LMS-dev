import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function getGlossary() {
  const { data, error } = await supabaseAdmin
    .from('glossary')
    .select('*')
    .order('term', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTerm({ term, definition, created_by }) {
  const { data, error } = await supabaseAdmin
    .from('glossary')
    .insert({ term, definition, created_by })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateTerm(id, updates) {
  const { error } = await supabaseAdmin
    .from('glossary').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteTerm(id) {
  const { error } = await supabaseAdmin
    .from('glossary').delete().eq('id', id);
  if (error) throw error;
}
