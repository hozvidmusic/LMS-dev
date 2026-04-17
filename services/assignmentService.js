import { supabase } from '@/supabase/client';

export async function assignCourse({ courseId, userId, groupId, subgroupId }) {
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
      id,
      user_id,
      group_id,
      subgroup_id,
      profiles(id, display_name, username),
      groups(id, name),
      subgroups(id, name)
    `)
    .eq('course_id', courseId);
  if (error) throw error;
  return data;
}

export async function getCoursesForStudent(userId) {
  console.log('getCoursesForStudent userId:', userId);

  // Asignaciones directas al alumno
  const { data: direct, error: e1 } = await supabase
    .from('course_assignments')
    .select('course_id')
    .eq('user_id', userId);
  console.log('direct assignments:', direct, e1);

  // Grupos del alumno
  const { data: profileGroups, error: e2 } = await supabase
    .from('profile_groups')
    .select('group_id, subgroup_id')
    .eq('user_id', userId);
  console.log('profile groups:', profileGroups, e2);

  const groupIds = profileGroups?.map(pg => pg.group_id) || [];
  const subgroupIds = profileGroups?.map(pg => pg.subgroup_id).filter(Boolean) || [];
  console.log('groupIds:', groupIds, 'subgroupIds:', subgroupIds);

  // Asignaciones por grupo
  let byGroup = [];
  if (groupIds.length > 0) {
    const { data, error: e3 } = await supabase
      .from('course_assignments')
      .select('course_id')
      .in('group_id', groupIds);
    console.log('byGroup:', data, e3);
    byGroup = data || [];
  }

  // Asignaciones por subgrupo
  let bySubgroup = [];
  if (subgroupIds.length > 0) {
    const { data, error: e4 } = await supabase
      .from('course_assignments')
      .select('course_id')
      .in('subgroup_id', subgroupIds);
    console.log('bySubgroup:', data, e4);
    bySubgroup = data || [];
  }

  const allIds = [
    ...(direct || []),
    ...byGroup,
    ...bySubgroup,
  ].map(r => r.course_id);

  console.log('allIds:', allIds);
  return [...new Set(allIds)];
}
