'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getLessonsByCourse, createLesson, updateLesson, toggleLessonStatus,
  updateLessonsOrder,
} from '@/services/courseService';
import { getAdminClient } from '@/supabase/adminClient';
import { MdAdd, MdEdit, MdDelete, MdDragIndicator, MdChevronLeft, MdLock, MdLockOpen } from 'react-icons/md';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
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
    if (!confirm('Eliminar esta leccion?')) return;
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

  const [showLock, setShowLock] = useState(false);
  const [lockForm, setLockForm] = useState({ requires_previous: false, unlock_date: '' });

  async function handleSaveLock(e) {
    e.preventDefault();
    await supabaseAdmin.from('lessons').update({
      requires_previous: lockForm.requires_previous,
      unlock_date: lockForm.unlock_date ? new Date(lockForm.unlock_date).toISOString() : null,
    }).eq('id', selected.id);
    toast.success('Configuracion guardada');
    setShowLock(false);
    load();
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
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <MdDragIndicator style={{ color:'#5a5a70', flexShrink:0, cursor:'grab' }} size={20} />
                <div style={{ width:32, height:32, borderRadius:8, background:'#7c6af720', color:'#7c6af7', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                  {index + 1}
                </div>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <h3 style={{ fontWeight:500, color:'white', margin:0 }}>{lesson.title}</h3>
                    <Badge status={lesson.status} />
                  </div>
                  {lesson.description && (
                    <p style={{ fontSize:12, color:'#5a5a70', margin:0 }}>{lesson.description}</p>
                  )}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, flexWrap:'wrap', maxWidth:'100%' }}>
                  <Button size="sm" variant="secondary"
                    onClick={() => { setSelected({...lesson}); setShowEdit(true); }}>
                    <MdEdit />
                  </Button>
                  <Button size="sm" variant={lesson.status === 'active' ? 'danger' : 'secondary'}
                    onClick={() => handleToggleStatus(lesson)}>
                    {lesson.status === 'active' ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button size="sm" variant="secondary"
                    onClick={() => {
                      setSelected(lesson);
                      setLockForm({
                        requires_previous: lesson.requires_previous || false,
                        unlock_date: lesson.unlock_date ? new Date(lesson.unlock_date).toISOString().slice(0,16) : '',
                      });
                      setShowLock(true);
                    }}
                    title="Configurar bloqueo">
                    {lesson.requires_previous || lesson.unlock_date ? <MdLock /> : <MdLockOpen />}
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
          <Card><p className="text-center py-8" style={{ color:'#5a5a70' }}>Sin lecciones. Crea la primera!</p></Card>
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
      {selected && showLock && (
        <Modal isOpen onClose={() => setShowLock(false)} title="Configurar bloqueo">
          <form onSubmit={handleSaveLock} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                <input type="checkbox" checked={lockForm.requires_previous}
                  onChange={e => setLockForm(p => ({...p, requires_previous: e.target.checked}))}
                  style={{ width: 16, height: 16, accentColor: '#7c6af7' }} />
                <div>
                  <p className="text-sm font-medium text-white">Requiere completar leccion anterior</p>
                  <p className="text-xs" style={{ color: '#5a5a70' }}>El alumno debe completar la leccion anterior para desbloquear esta</p>
                </div>
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>
                Fecha y hora de desbloqueo <span style={{ color: '#5a5a70' }}>(opcional)</span>
              </label>
              <input type="datetime-local" value={lockForm.unlock_date}
                onChange={e => setLockForm(p => ({...p, unlock_date: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
              <p className="text-xs" style={{ color: '#5a5a70' }}>
                Si defines una fecha, la leccion no estara disponible hasta ese momento aunque el alumno haya completado la anterior.
              </p>
              {lockForm.unlock_date && (
                <button type="button" onClick={() => setLockForm(p => ({...p, unlock_date: ''}))}
                  className="text-xs text-left" style={{ color: '#f75c6a' }}>
                  Quitar fecha de desbloqueo
                </button>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowLock(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
