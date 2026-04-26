import { supabase } from '@/supabase/client';
import { getAdminClient } from '@/supabase/adminClient';

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
  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: username.toLowerCase().trim(),
      display_name: displayName,
      role: 'student',
    },
  });
  if (error) {
    if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
      throw new Error('Este nombre de usuario ya existe');
    }
    throw new Error(error.message || 'Error al crear alumno');
  }
  return data;
}

export async function changeCurrentUserPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function changeStudentPassword(userId, newPassword) {
  const { error } = await getAdminClient().auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) throw error;
}