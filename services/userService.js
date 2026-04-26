import { getAdminClient } from '@/supabase/adminClient';

const supabaseAdmin = getAdminClient();
import { supabase } from '@/supabase/client';


export async function getAllStudents() {
  const { data, error } = await supabaseAdmin
    .from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', id);
  if (error) throw error;
}

export async function toggleStudentStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
  if (error) throw error;
  return newStatus;
}

export async function getAssignedCourseIds(userId) {
  const { data, error } = await supabase
    .from('course_assignments').select('course_id').eq('user_id', userId);
  if (error) throw error;
  return data.map(row => row.course_id);
}

export async function assignCoursesToStudent(userId, courseIds) {
  const { error: deleteError } = await supabase
    .from('course_assignments').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;
  if (!courseIds || courseIds.length === 0) return;
  const rows = courseIds.map(course_id => ({ user_id: userId, course_id }));
  const { error } = await supabase.from('course_assignments').insert(rows);
  if (error) throw error;
}
