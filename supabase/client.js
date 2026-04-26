import { createClient } from '@supabase/supabase-js';

let clientInstance = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();