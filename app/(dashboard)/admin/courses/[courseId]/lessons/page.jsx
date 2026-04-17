'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLessonsByCourse, createLesson, updateLesson, toggleLessonStatus } from '@/services/courseService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdChevronLeft, MdChevronRight, MdDelete } from 'react-icons/md';

export default function AdminLessons() {
  const { courseId } = useParams();
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });

  async function load() { setLessons(await getLessonsByCourse(courseId)); }
  useEffect(() => { load(); }, [courseId]);

  async function handleCreate(e) {
    e.preventDefault();
    await createLesson({ courseId, ...form });
    toast.success('Lección creada');
    setShowCreate(false);
    setForm({ title: '', description: '' });
    load();
  }

  async function handleEdit(e) {
    e.preventDefault();
    await updateLesson(selected.id, { title: selected.title, description: selected.description });
    toast.success('Lección actualizada');
    setShowEdit(false);
    load();
  }

  async function handleDelete(lesson) {
    if (!confirm(`¿Eliminar "${lesson.title}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
    if (error) { toast.error('Error al eliminar lección'); return; }
    toast.success('Lección eliminada');
    load();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.push('/admin/courses')}
        className="flex items-center gap-1 text-sm mb-4" style={{ color: '#9090a8' }}
        onMouseEnter={e => e.currentTarget.style.color = '#7c6af7'}
        onMouseLeave={e => e.currentTarget.style.color = '#9090a8'}>
        <MdChevronLeft /> Volver a cursos
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Lecciones</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{lessons.length} lecciones</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nueva lección</Button>
      </div>

      <div className="flex flex-col gap-3">
        {lessons.map(lesson => (
          <Card key={lesson.id}>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: '#7c6af720', color: '#7c6af7' }}>
                {lesson.sort_order}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{lesson.title}</h3>
                  <Badge status={lesson.status} />
                </div>
                {lesson.description && (
                  <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{lesson.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary"
                  onClick={() => { setSelected({...lesson}); setShowEdit(true); }}>
                  <MdEdit />
                </Button>
                <Button size="sm" variant={lesson.status === 'active' ? 'danger' : 'secondary'}
                  onClick={async () => { await toggleLessonStatus(lesson.id, lesson.status); toast.success('Estado actualizado'); load(); }}>
                  {lesson.status === 'active' ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => router.push(`/admin/lessons/${lesson.id}/contents`)}>
                  Contenidos <MdChevronRight />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(lesson)}>
                  <MdDelete />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {lessons.length === 0 && (
          <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>Sin lecciones. ¡Crea la primera!</p></Card>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva lección">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Título" value={form.title} required
            onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          <Input label="Descripción" value={form.description}
            onChange={e => setForm(p => ({...p, description: e.target.value}))} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar lección">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Input label="Título" value={selected.title}
              onChange={e => setSelected(p => ({...p, title: e.target.value}))} />
            <Input label="Descripción" value={selected.description || ''}
              onChange={e => setSelected(p => ({...p, description: e.target.value}))} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
