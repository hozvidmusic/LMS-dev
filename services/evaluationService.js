import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ─── EVALUACIONES ─────────────────────────────────────────────────────────────
export async function getEvaluations() {
  const { data, error } = await supabaseAdmin
    .from('evaluations')
    .select('*, evaluation_tag_relations(tag_id, evaluation_tags(id, name, color))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getEvaluation(id) {
  const { data, error } = await supabaseAdmin
    .from('evaluations')
    .select('*, evaluation_tag_relations(tag_id, evaluation_tags(id, name, color))')
    .eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createEvaluation({ title, description, max_attempts, time_limit, random_order, created_by }) {
  const { data, error } = await supabaseAdmin
    .from('evaluations')
    .insert({ title, description, max_attempts, time_limit: time_limit || null, random_order, created_by })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateEvaluation(id, updates) {
  const { error } = await supabaseAdmin.from('evaluations').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteEvaluation(id) {
  const { error } = await supabaseAdmin.from('evaluations').delete().eq('id', id);
  if (error) throw error;
}

// ─── ETIQUETAS ────────────────────────────────────────────────────────────────
export async function getTags() {
  const { data, error } = await supabaseAdmin
    .from('evaluation_tags').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTag({ name, color, created_by }) {
  const { data, error } = await supabaseAdmin
    .from('evaluation_tags').insert({ name, color, created_by }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTag(id) {
  const { error } = await supabaseAdmin.from('evaluation_tags').delete().eq('id', id);
  if (error) throw error;
}

export async function setEvaluationTags(evaluationId, tagIds) {
  await supabaseAdmin.from('evaluation_tag_relations').delete().eq('evaluation_id', evaluationId);
  if (!tagIds.length) return;
  const rows = tagIds.map(tag_id => ({ evaluation_id: evaluationId, tag_id }));
  const { error } = await supabaseAdmin.from('evaluation_tag_relations').insert(rows);
  if (error) throw error;
}

// ─── PREGUNTAS ────────────────────────────────────────────────────────────────
export async function getQuestions(evaluationId) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*, question_options(*), question_zones(*), question_pairs(*), question_order_items(*)')
    .eq('evaluation_id', evaluationId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createQuestion({ evaluation_id, type, question, image_url, audio_url, order_index }) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert({ evaluation_id, type, question, image_url, audio_url, order_index })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateQuestion(id, updates) {
  const { error } = await supabaseAdmin.from('questions').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteQuestion(id) {
  const { error } = await supabaseAdmin.from('questions').delete().eq('id', id);
  if (error) throw error;
}

// Opciones
export async function saveOptions(questionId, options) {
  await supabaseAdmin.from('question_options').delete().eq('question_id', questionId);
  if (!options.length) return;
  const rows = options.map((o, i) => ({ question_id: questionId, text: o.text, is_correct: o.is_correct, order_index: i }));
  const { error } = await supabaseAdmin.from('question_options').insert(rows);
  if (error) throw error;
}

// Zonas de imagen
export async function saveZones(questionId, zones) {
  await supabaseAdmin.from('question_zones').delete().eq('question_id', questionId);
  if (!zones.length) return;
  const rows = zones.map(z => ({ question_id: questionId, x: z.x, y: z.y, width: z.width, height: z.height }));
  const { error } = await supabaseAdmin.from('question_zones').insert(rows);
  if (error) throw error;
}

// Pares emparejar
export async function savePairs(questionId, pairs) {
  await supabaseAdmin.from('question_pairs').delete().eq('question_id', questionId);
  if (!pairs.length) return;
  const rows = pairs.map((p, i) => ({ question_id: questionId, left_text: p.left, right_text: p.right, order_index: i }));
  const { error } = await supabaseAdmin.from('question_pairs').insert(rows);
  if (error) throw error;
}

// Ítems ordenar
export async function saveOrderItems(questionId, items) {
  await supabaseAdmin.from('question_order_items').delete().eq('question_id', questionId);
  if (!items.length) return;
  const rows = items.map((item, i) => ({ question_id: questionId, text: item.text, correct_position: i }));
  const { error } = await supabaseAdmin.from('question_order_items').insert(rows);
  if (error) throw error;
}

// ─── ASIGNACIONES ─────────────────────────────────────────────────────────────
export async function assignEvaluation({ evaluation_id, lesson_id, course_id }) {
  const { error } = await supabaseAdmin
    .from('evaluation_assignments')
    .insert({ evaluation_id, lesson_id: lesson_id || null, course_id: course_id || null });
  if (error) throw error;
}

export async function removeAssignment(id) {
  const { error } = await supabaseAdmin.from('evaluation_assignments').delete().eq('id', id);
  if (error) throw error;
}

export async function getAssignmentsForLesson(lessonId) {
  const { data, error } = await supabaseAdmin
    .from('evaluation_assignments')
    .select('*, evaluations(*)')
    .eq('lesson_id', lessonId);
  if (error) throw error;
  return data;
}

export async function getAssignmentsForCourse(courseId) {
  const { data, error } = await supabaseAdmin
    .from('evaluation_assignments')
    .select('*, evaluations(*)')
    .eq('course_id', courseId);
  if (error) throw error;
  return data;
}

// ─── RESULTADOS ───────────────────────────────────────────────────────────────
export async function saveResult({ evaluation_id, user_id, score, attempt, answers }) {
  const { error } = await supabaseAdmin
    .from('evaluation_results')
    .insert({ evaluation_id, user_id, score, attempt, answers });
  if (error) throw error;
}

export async function getResultsForUser(userId) {
  const { data, error } = await supabaseAdmin
    .from('evaluation_results')
    .select('*, evaluations(title)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAttemptsCount(evaluationId, userId) {
  const { count } = await supabaseAdmin
    .from('evaluation_results')
    .select('*', { count: 'exact', head: true })
    .eq('evaluation_id', evaluationId)
    .eq('user_id', userId);
  return count || 0;
}
