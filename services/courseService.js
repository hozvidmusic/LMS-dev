import { supabase } from '@/supabase/client';

export async function getCourses() {
  const { data, error } = await supabase
    .from('courses').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
export async function createCourse({ title, description, color, icon }) {
  const { data: existing } = await supabase.from('courses').select('id');
  const sort_order = (existing?.length || 0) + 1;
  const { error } = await supabase.from('courses').insert({ title, description, color, icon, sort_order });
  if (error) throw error;
}
export async function updateCourse(id, updates) {
  const { error } = await supabase.from('courses').update(updates).eq('id', id);
  if (error) throw error;
}
export async function toggleCourseStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateCourse(id, { status: newStatus });
  return newStatus;
}
export async function getLessonsByCourse(courseId) {
  const { data, error } = await supabase
    .from('lessons').select('*').eq('course_id', courseId).order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
export async function createLesson({ courseId, title, description }) {
  const { data: existing } = await supabase.from('lessons').select('id').eq('course_id', courseId);
  const sort_order = (existing?.length || 0) + 1;
  const { error } = await supabase.from('lessons').insert({ course_id: courseId, title, description, sort_order });
  if (error) throw error;
}
export async function updateLesson(id, updates) {
  const { error } = await supabase.from('lessons').update(updates).eq('id', id);
  if (error) throw error;
}
export async function toggleLessonStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateLesson(id, { status: newStatus });
}
export async function getContentsByLesson(lessonId) {
  const { data, error } = await supabase
    .from('contents').select('*').eq('lesson_id', lessonId).order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
export async function createContent({ lessonId, title, description }) {
  const { data: existing } = await supabase.from('contents').select('id').eq('lesson_id', lessonId);
  const sort_order = (existing?.length || 0) + 1;
  const { error } = await supabase.from('contents').insert({ lesson_id: lessonId, title, description, sort_order });
  if (error) throw error;
}
export async function updateContent(id, updates) {
  const { error } = await supabase.from('contents').update(updates).eq('id', id);
  if (error) throw error;
}
export async function toggleContentStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateContent(id, { status: newStatus });
}
export async function getItemsByContent(contentId) {
  const { data, error } = await supabase
    .from('items').select('*').eq('content_id', contentId).order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}
export async function createItem(itemData) {
  const { data: existing } = await supabase.from('items').select('id').eq('content_id', itemData.content_id);
  const sort_order = (existing?.length || 0) + 1;
  const { error } = await supabase.from('items').insert({ ...itemData, sort_order });
  if (error) throw error;
}
export async function updateItem(id, updates) {
  const { error } = await supabase.from('items').update(updates).eq('id', id);
  if (error) throw error;
}
export async function toggleItemStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await updateItem(id, { status: newStatus });
}
export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}
export async function updateItemsOrder(items) {
  const updates = items.map((item, index) =>
    supabase.from('items').update({ sort_order: index + 1 }).eq('id', item.id)
  );
  await Promise.all(updates);
}
