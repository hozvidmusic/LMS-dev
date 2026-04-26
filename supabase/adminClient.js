import { createClient } from '@supabase/supabase-js';

let adminInstance = null;

export function getAdminClient() {
  if (!adminInstance) {
    adminInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: 'admin-auth-token',
        }
      }
    );
  }
  return adminInstance;
}