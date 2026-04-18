import { supabase } from '@/supabase/client';

export async function assignCourse({ courseId, userId, groupId, subgroupId }) {
  const { data: existing } = await supabase
    .from('course_assignments')
    .select('id')
    .eq('course_id', courseId)
    .eq(userId ? 'user_id' : groupId ? 'group_id' : 'subgroup_id', userId || groupId || subgroupId)
    .maybeSingle();
  if (existing) throw new Error('Esta asignación ya existe');

  const { error } = await supabase.from('course_assignments').insert({
    course_id: courseId,
    user_id: userId || null,
    group_id: groupId || null,
    subgroup_id: subgroupId || null,
  });
  if (error) throw error;
}

export async function removeAssignment(id) {
  const { error } = await supabase.from('course_assignments').delete().eq('id', id);
  if (error) throw error;
}

export async function getCourseAssignments(courseId) {
  const { data, error } = await supabase
    .from('course_assignments')
    .select(`
      id, user_id, group_id, subgroup_id,
      profiles(id, display_name, username),
      groups(id, name),
      subgroups(id, name, color, group_id, groups(id, name))
    `)
    .eq('course_id', courseId);
  if (error) throw error;
  return data;
}

export async function getCoursesForStudent(userId) {
  // Asignaciones directas
  const { data: direct } = await supabase
    .from('course_assignments')
    .select('course_id')
    .eq('user_id', userId);

  // Grupo del alumno
  const { data: profileGroups } = await supabase
    .from('profile_groups')
    .select('group_id')
    .eq('user_id', userId);

  // Subgrupos del alumno
  const { data: profileSubgroups } = await supabase
    .from('profile_subgroups')
    .select('subgroup_id')
    .eq('user_id', userId);

  const groupIds = (profileGroups || []).map(g => g.group_id).filter(Boolean);
  console.log('profileGroups:', profileGroups, 'groupIds:', groupIds);
  const subgroupIds = (profileSubgroups || []).map(s => s.subgroup_id).filter(Boolean);

  // Asignaciones por grupo
  let byGroup = [];
  if (groupIds.length > 0) {
    const { data } = await supabase
      .from('course_assignments')
      .select('course_id')
      .in('group_id', groupIds);
    byGroup = data || [];
    console.log('byGroup data:', data, 'for groupIds:', groupIds);
  }

  // Asignaciones por subgrupo
  let bySubgroup = [];
  if (subgroupIds.length > 0) {
    const { data } = await supabase
      .from('course_assignments')
      .select('course_id')
      .in('subgroup_id', subgroupIds);
    bySubgroup = data || [];
  }

  const allIds = [
    ...(direct || []),
    ...byGroup,
    ...bySubgroup,
  ].map(r => r.course_id);

  return [...new Set(allIds)];
}
