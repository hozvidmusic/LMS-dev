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
  const { data, error } = await supabase.from('courses').insert({ title, description, color, icon, sort_order }).select().single();
  if (error) throw error;
  return data;
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

export async function updateLessonsOrder(lessons) {
  const updates = lessons.map((lesson, index) =>
    supabase.from('lessons').update({ sort_order: index + 1 }).eq('id', lesson.id)
  );
  await Promise.all(updates);
}

export async function duplicateCourse(courseId) {
  // Obtener curso original
  const { data: course, error: ce } = await supabase
    .from('courses').select('*').eq('id', courseId).single();
  if (ce) throw ce;

  // Contar cursos existentes para sort_order
  const { data: existing } = await supabase.from('courses').select('id');
  const sort_order = (existing?.length || 0) + 1;

  // Crear nuevo curso
  const { data: newCourse, error: nce } = await supabase.from('courses').insert({
    title: `${course.title} (copia)`,
    description: course.description,
    color: course.color,
    icon: course.icon,
    sort_order,
  }).select().single();
  if (nce) throw nce;

  // Duplicar instrumento si existe
  const { data: inst } = await supabase
    .from('course_instrument').select('instrument').eq('course_id', courseId).single();
  if (inst?.instrument) {
    await supabase.from('course_instrument').insert({
      course_id: newCourse.id,
      instrument: inst.instrument,
    });
  }

  // Obtener lecciones del curso original
  const { data: lessons } = await supabase
    .from('lessons').select('*').eq('course_id', courseId).order('sort_order', { ascending: true });

  for (const lesson of (lessons || [])) {
    const { data: newLesson } = await supabase.from('lessons').insert({
      course_id: newCourse.id,
      title: lesson.title,
      description: lesson.description,
      sort_order: lesson.sort_order,
      status: lesson.status,
    }).select().single();

    // Obtener contenidos de la lección
    const { data: contents } = await supabase
      .from('contents').select('*').eq('lesson_id', lesson.id).order('sort_order', { ascending: true });

    for (const content of (contents || [])) {
      const { data: newContent } = await supabase.from('contents').insert({
        lesson_id: newLesson.id,
        title: content.title,
        description: content.description,
        sort_order: content.sort_order,
        status: content.status,
      }).select().single();

      // Obtener ítems del contenido
      const { data: items } = await supabase
        .from('items').select('*').eq('content_id', content.id).order('sort_order', { ascending: true });

      for (const item of (items || [])) {
        await supabase.from('items').insert({
          content_id: newContent.id,
          title: item.title,
          type: item.type,
          value: item.value,
          file_url: item.file_url,
          file_name: item.file_name,
          sort_order: item.sort_order,
        });
      }
    }
  }
  return newCourse;
}

export async function duplicateLesson(lessonId, courseId) {
  const { data: lesson, error: le } = await supabase
    .from('lessons').select('*').eq('id', lessonId).single();
  if (le) throw le;

  const { data: existing } = await supabase.from('lessons').select('id').eq('course_id', courseId);
  const sort_order = (existing?.length || 0) + 1;

  const { data: newLesson } = await supabase.from('lessons').insert({
    course_id: courseId,
    title: `${lesson.title} (copia)`,
    description: lesson.description,
    sort_order,
    status: lesson.status,
  }).select().single();

  const { data: contents } = await supabase
    .from('contents').select('*').eq('lesson_id', lessonId).order('sort_order', { ascending: true });

  for (const content of (contents || [])) {
    const { data: newContent } = await supabase.from('contents').insert({
      lesson_id: newLesson.id,
      title: content.title,
      description: content.description,
      sort_order: content.sort_order,
      status: content.status,
    }).select().single();

    const { data: items } = await supabase
      .from('items').select('*').eq('content_id', content.id).order('sort_order', { ascending: true });

    for (const item of (items || [])) {
      await supabase.from('items').insert({
        content_id: newContent.id,
        title: item.title,
        type: item.type,
        value: item.value,
        file_url: item.file_url,
        file_name: item.file_name,
        sort_order: item.sort_order,
      });
    }
  }
  return newLesson;
}
