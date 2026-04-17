import { supabase } from '@/supabase/client';

const toEmail = (username) => `${username.toLowerCase().trim()}@plataforma.local`;

export async function loginWithUsername(username, password) {
  const email = toEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function createStudent({ username, displayName, password }) {
  const email = toEmail(username);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username: username.toLowerCase().trim(),
          display_name: displayName,
          role: 'student',
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Error al crear alumno');
  }

  return data;
}

export async function changeCurrentUserPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
