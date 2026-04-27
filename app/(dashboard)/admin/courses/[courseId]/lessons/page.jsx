'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getLessonsByCourse, createLesson, updateLesson, toggleLessonStatus,
  getContentsByLesson, createContent, updateContent, toggleContentStatus,
  updateLessonsOrder,
} from '@/services/courseService';
import { getAdminClient } from '@/supabase/adminClient';
import { MdAdd, MdEdit, MdDelete, MdDragIndicator, MdChevronLeft } from 'react-icons/md';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import RichTextEditor from '@/components/editor/RichTextEditor';
import toast from 'react-hot-toast';

const supabaseAdmin = getAdminClient();

export default function AdminLessons() {
  const { courseId } = useParams();
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const dragLesson = useRef(null);
  const dragLessonOver = useRef(null);

  async function load() {
    setLessons(await getLessonsByCourse(courseId));
  }
  useEffect(() => { load(); }, [courseId]);

  async function handleCreate(e) {
    e.preventDefault();
    await createLesson({ courseId, ...form });
    toast.success('Leccion creada');
    setShowCreate(false);
    setForm({ title: '', description: '' });
    load();
  }

  async function handleEdit(e) {
    e.preventDefault();
    await updateLesson(selected.id, { title: selected.title, description: selected.description });
    toast.success('Leccion actualizada');
    setShowEdit(false);
    load();
  }

  async function handleDelete(lesson) {
    if (!confirm(`Eliminar "${lesson.title}"?`)) return;
    const { error } = await supabaseAdmin.from('lessons').delete().eq('id', lesson.id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Leccion eliminada');
    load();
  }

  async function handleToggleStatus(lesson) {
    await toggleLessonStatus(lesson.id, lesson.status);
    toast.success('Estado actualizado');
    load();
  }

  function handleDragStart(index) { dragLesson.current = index; }
  function handleDragEnter(index) { dragLessonOver.current = index; }
  async function handleDragEnd() {
    const reordered = [...lessons];
    const dragged = reordered.splice(dragLesson.current, 1)[0];
    reordered.splice(dragLessonOver.current, 0, dragged);
    dragLesson.current = null;
    dragLessonOver.current = null;
    setLessons(reordered);
    await updateLessonsOrder(reordered);
    toast.success('Orden guardado');
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.push('/admin/courses')}
        className="flex items-center gap-1 text-sm mb-4" style={{ color: '#9090a8' }}>
        <MdChevronLeft /> Volver a cursos
      </button>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Lecciones</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{lessons.length} lecciones</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nueva leccion</Button>
      </div>

      <div className="flex flex-col gap-3">
        {lessons.map((lesson, index) => (
          <div key={lesson.id} draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={e => e.preventDefault()}>
            <Card>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <MdDragIndicator className="cursor-grab flex-shrink-0" style={{ color: '#5a5a70' }} size={20} />
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#7c6af720', color: '#7c6af7' }}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-white">{lesson.title}</h3>
                      <Badge status={lesson.status} />
                    </div>
                    {lesson.description && (
                      <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{lesson.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="secondary"
                    onClick={() => { setSelected({...lesson}); setShowEdit(true); }}>
                    <MdEdit />
                  </Button>
                  <Button size="sm" variant={lesson.status === 'active' ? 'danger' : 'secondary'}
                    onClick={() => handleToggleStatus(lesson)}>
                    {lesson.status === 'active' ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button size="sm" variant="secondary"
                    onClick={() => router.push('/admin/courses/' + courseId + '/lessons/' + lesson.id + '/contents')}>
                    Contenido
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(lesson)}>
                    <MdDelete />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ))}
        {lessons.length === 0 && (
          <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>Sin lecciones. Crea la primera!</p></Card>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva leccion">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Titulo" value={form.title} required
            onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          <Input label="Descripcion" value={form.description}
            onChange={e => setForm(p => ({...p, description: e.target.value}))} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {selected && showEdit && (
        <Modal isOpen onClose={() => setShowEdit(false)} title="Editar leccion">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Input label="Titulo" value={selected.title}
              onChange={e => setSelected(p => ({...p, title: e.target.value}))} />
            <Input label="Descripcion" value={selected.description || ''}
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
