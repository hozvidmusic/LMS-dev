'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getLessonsByCourse, createLesson, updateLesson, toggleLessonStatus,
  getContentsByLesson, createContent, updateContent, toggleContentStatus,
  updateLessonsOrder,
} from '@/services/courseService';
import { supabase } from '@/supabase/client';
import { MdAdd, MdEdit, MdDelete, MdDragIndicator, MdChevronLeft, MdExpandMore, MdExpandLess } from 'react-icons/md';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import RichTextEditor from '@/components/editor/RichTextEditor';

function ItemForm({ contentId, onSave, onCancel }) {
  const TYPES = [
    { id: 'text', label: '📝 Texto' }, { id: 'video', label: '🎬 Video' },
    { id: 'audio', label: '🎵 Audio' }, { id: 'image', label: '🖼️ Imagen' },
    { id: 'pdf', label: '📄 PDF' }, { id: 'link', label: '🔗 Enlace' },
  ];
  const [form, setForm] = useState({ type: 'text', title: '', content: '' });
  async function handleSubmit(e) {
    e.preventDefault();
    const { data: existing } = await supabase.from('items').select('id').eq('content_id', contentId);
    const sort_order = (existing?.length || 0) + 1;
    const { error } = await supabase.from('items')
      .insert({ content_id: contentId, ...form, sort_order });
    if (error) { toast.error('Error al crear ítem'); return; }
    toast.success('Ítem creado');
    onSave();
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
      <div className="flex gap-2 flex-wrap">
        {TYPES.map(t => (
          <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, type: t.id }))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: form.type === t.id ? '#7c6af720' : '#22222e',
              color: form.type === t.id ? '#7c6af7' : '#9090a8',
              border: `1px solid ${form.type === t.id ? '#7c6af740' : 'transparent'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <Input label="Título (opcional)" value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      {form.type === 'text'
        ? <RichTextEditor value={form.content} onChange={v => setForm(p => ({ ...p, content: v }))} />
        : <Input label="URL" value={form.content} required
            onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1">Guardar ítem</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

function ContentBlock({ content, onReload }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditContent, setShowEditContent] = useState(false);
  const [editForm, setEditForm] = useState({ title: content.title, description: content.description || '' });

  async function loadItems() {
    const { data } = await supabase.from('items').select('*')
      .eq('content_id', content.id).order('sort_order', { ascending: true });
    setItems(data || []);
  }

  useEffect(() => { if (expanded) loadItems(); }, [expanded]);

  async function handleEditContent(e) {
    e.preventDefault();
    await updateContent(content.id, editForm);
    toast.success('Contenido actualizado');
    setShowEditContent(false);
    onReload();
  }

  async function handleDeleteItem(id) {
    if (!confirm('¿Eliminar este ítem?')) return;
    await supabase.from('items').delete().eq('id', id);
    toast.success('Ítem eliminado');
    loadItems();
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a38' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#16161f' }}>
        <button onClick={() => setExpanded(p => !p)} className="flex-1 flex items-center gap-2 text-left">
          <span style={{ color: '#5a5a70' }}>{expanded ? <MdExpandLess /> : <MdExpandMore />}</span>
          <span className="text-sm font-medium text-white">{content.title}</span>
          <Badge status={content.status} />
        </button>
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={() => setShowEditContent(true)}><MdEdit /></Button>
          <Button size="sm" variant={content.status === 'active' ? 'danger' : 'secondary'}
            onClick={async () => { await toggleContentStatus(content.id, content.status); onReload(); }}>
            {content.status === 'active' ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2 p-3" style={{ background: '#0f0f13' }}>
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: '#16161f', border: '1px solid #2a2a38' }}>
              <div>
                <span className="text-xs font-medium" style={{ color: '#7c6af7' }}>{item.type}</span>
                {item.title && <span className="text-sm text-white ml-2">{item.title}</span>}
              </div>
              <Button size="sm" variant="danger" onClick={() => handleDeleteItem(item.id)}><MdDelete /></Button>
            </div>
          ))}
          {items.length === 0 && !showAddItem && (
            <p className="text-xs text-center py-2" style={{ color: '#5a5a70' }}>Sin ítems todavía.</p>
          )}
          {showAddItem
            ? <ItemForm contentId={content.id} onSave={() => { setShowAddItem(false); loadItems(); }} onCancel={() => setShowAddItem(false)} />
            : <Button size="sm" variant="secondary" onClick={() => setShowAddItem(true)}><MdAdd /> Agregar ítem</Button>}
        </div>
      )}
      {showEditContent && (
        <Modal isOpen onClose={() => setShowEditContent(false)} title="Editar contenido">
          <form onSubmit={handleEditContent} className="flex flex-col gap-4">
            <Input label="Título" value={editForm.title}
              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
            <Input label="Descripción" value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEditContent(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function LessonContentModal({ lesson, onClose }) {
  const [contents, setContents] = useState([]);
  const [showAddContent, setShowAddContent] = useState(false);
  const [contentForm, setContentForm] = useState({ title: '', description: '' });

  async function loadContents() {
    const data = await getContentsByLesson(lesson.id);
    setContents(data);
  }
  useEffect(() => { loadContents(); }, [lesson.id]);

  async function handleAddContent(e) {
    e.preventDefault();
    await createContent({ lessonId: lesson.id, ...contentForm });
    toast.success('Contenido creado');
    setShowAddContent(false);
    setContentForm({ title: '', description: '' });
    loadContents();
  }

  return (
    <Modal isOpen onClose={onClose} title={`Contenidos: ${lesson.title}`} size="lg">
      <div className="flex flex-col gap-3">
        {contents.map(content => (
          <ContentBlock key={content.id} content={content} onReload={loadContents} />
        ))}
        {contents.length === 0 && !showAddContent && (
          <p className="text-sm text-center py-4" style={{ color: '#5a5a70' }}>Esta lección no tiene contenidos todavía.</p>
        )}
        {showAddContent
          ? <form onSubmit={handleAddContent} className="flex flex-col gap-3 p-4 rounded-xl"
              style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
              <Input label="Título del contenido" value={contentForm.title} required
                onChange={e => setContentForm(p => ({ ...p, title: e.target.value }))} />
              <Input label="Descripción (opcional)" value={contentForm.description}
                onChange={e => setContentForm(p => ({ ...p, description: e.target.value }))} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1">Crear contenido</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddContent(false)}>Cancelar</Button>
              </div>
            </form>
          : <Button variant="secondary" onClick={() => setShowAddContent(true)}><MdAdd /> Agregar contenido</Button>}
        <Button variant="secondary" onClick={onClose} className="mt-2">Cerrar</Button>
      </div>
    </Modal>
  );
}

export default function AdminLessons() {
  const { courseId } = useParams();
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showContents, setShowContents] = useState(false);
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
    if (!confirm(`¿Eliminar "${lesson.title}"?`)) return;
    const { error } = await supabase.from('lessons').delete().eq('id', lesson.id);
    if (error) { toast.error('Error al eliminar lección'); return; }
    toast.success('Lección eliminada');
    load();
  }

  function handleDragStart(index) { dragLesson.current = index; }
  function handleDragEnter(index) { dragLessonOver.current = index; }
  async function handleDragEnd() {
    const reordered = [...lessons];
    const dragged = reordered.splice(dragLesson.current, 1)[0];
    reordered.splice(dragLessonOver.current, 0, dragged);
    dragLesson.current = null; dragLessonOver.current = null;
    setLessons(reordered);
    await updateLessonsOrder(reordered);
    toast.success('Orden guardado');
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
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{lessons.length} lecciones · Arrastra para reordenar</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nueva lección</Button>
      </div>

      <div className="flex flex-col gap-3">
        {lessons.map((lesson, index) => (
          <div key={lesson.id} draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={e => e.preventDefault()}>
            <Card>
              <div className="flex items-center gap-4">
                <MdDragIndicator className="cursor-grab flex-shrink-0" style={{ color: '#5a5a70' }} size={20} />
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: '#7c6af720', color: '#7c6af7' }}>
                  {index + 1}
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
                    onClick={() => { setSelected(lesson); setShowContents(true); }}>
                    📋 Gestionar contenido
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

      {selected && showEdit && (
        <Modal isOpen onClose={() => setShowEdit(false)} title="Editar lección">
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

      {selected && showContents && (
        <LessonContentModal lesson={selected} onClose={() => { setShowContents(false); setSelected(null); }} />
      )}
    </div>
  );
}