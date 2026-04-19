'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getLessonsByCourse, createLesson, updateLesson, toggleLessonStatus,
  getContentsByLesson, createContent, updateContent,
  getItemsByContent, createItem, updateItem, deleteItem, updateItemsOrder
} from '@/services/courseService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import RichTextEditor from '@/components/editor/RichTextEditor';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdChevronLeft, MdDelete, MdExpandMore, MdExpandLess, MdDragIndicator } from 'react-icons/md';

const ITEM_TYPES = [
  { value: 'text', label: '📝 Texto' },
  { value: 'youtube', label: '▶️ YouTube' },
  { value: 'video', label: '🎬 Video privado' },
  { value: 'image', label: '🖼️ Imagen' },
  { value: 'audio', label: '🎵 Audio' },
  { value: 'pdf', label: '📄 PDF' },
  { value: 'link', label: '🔗 Enlace' },
  { value: 'file', label: '⬇️ Archivo' },
];

function extractDriveId(url) {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/?\s]+)/);
  if (match) return match[1];
  const match2 = url.match(/drive\.google\.com\/open\?id=([^&\s]+)/);
  if (match2) return match2[1];
  const match3 = url.match(/id=([^&\s]+)/);
  if (match3) return match3[1];
  return null;
}

function toImageUrl(url) {
  const id = extractDriveId(url);
  if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  return url;
}

function toPreviewUrl(url) {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return url;
}

function toDownloadUrl(url) {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return url;
}

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function ItemRenderer({ item }) {
  const url = item.file_url || item.value;
  switch (item.type) {
    case 'text':
      return <div className="text-sm leading-relaxed" style={{ color: '#c0c0d0' }}
        dangerouslySetInnerHTML={{ __html: item.value }} />;
    case 'youtube':
    case 'video': {
      const videoId = extractYoutubeId(url);
      return videoId ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe className="absolute inset-0 w-full h-full rounded-xl"
            src={`https://www.youtube.com/embed/${videoId}`} allowFullScreen title={item.title} />
        </div>
      ) : <p style={{ color: '#f87171' }}>URL de YouTube inválida</p>;
    }
    case 'image':
      return <img src={toImageUrl(url)} alt={item.title}
        className="w-full rounded-xl object-contain max-h-96"
        onError={e => { e.target.src = toPreviewUrl(url); }} />;
    case 'audio':
      return (
        <iframe src={toPreviewUrl(url)} className="w-full rounded-xl"
          style={{ height: '80px', border: 'none' }} allow="autoplay" />
      );
    case 'pdf':
      return (
        <iframe src={toPreviewUrl(url)} className="w-full rounded-xl"
          style={{ height: '500px', border: 'none' }} />
      );
    case 'link':
      return <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
        🔗 Abrir enlace
      </a>;
    case 'file':
      return <a href={toDownloadUrl(url)} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
        ⬇️ Descargar {item.file_name || 'archivo'}
      </a>;
    default: return null;
  }
}

function ItemForm({ contentId, item, onSave, onCancel }) {
  const [form, setForm] = useState(item || { title: '', type: 'text', value: '', file_url: '', file_name: '' });

  const needsYoutubeUrl = ['youtube', 'video'].includes(form.type);
  const needsLinkUrl = form.type === 'link';
  const needsDriveUrl = ['image', 'audio', 'pdf', 'file'].includes(form.type);
  const needsText = form.type === 'text';

  const urlLabels = {
    image: 'URL de imagen (Google Drive)',
    audio: 'URL de audio (Google Drive)',
    pdf: 'URL de PDF (Google Drive)',
    file: 'URL de archivo (Google Drive)',
  };

  const urlPlaceholders = {
    image: 'https://drive.google.com/file/d/...',
    audio: 'https://drive.google.com/file/d/...',
    pdf: 'https://drive.google.com/file/d/...',
    file: 'https://drive.google.com/file/d/...',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const data = { ...form };
      if (item) {
        await updateItem(item.id, data);
        toast.success('Ítem actualizado');
      } else {
        await createItem({ ...data, content_id: contentId });
        toast.success('Ítem creado');
      }
      onSave();
    } catch { toast.error('Error al guardar ítem'); }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl"
      style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
      <Input label="Título (opcional)" value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tipo</label>
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => setForm(p => ({ ...p, type: t.value, value: '', file_url: '', file_name: '' }))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: form.type === t.value ? '#7c6af720' : '#22222e',
                color: form.type === t.value ? '#7c6af7' : '#9090a8',
                border: `1px solid ${form.type === t.value ? '#7c6af740' : '#333344'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {needsText && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Contenido</label>
          <RichTextEditor value={form.value} onChange={val => setForm(p => ({ ...p, value: val }))} />
        </div>
      )}

      {needsYoutubeUrl && (
        <Input label="URL de YouTube" value={form.value}
          placeholder="https://youtube.com/watch?v=..."
          onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
      )}

      {needsLinkUrl && (
        <Input label="URL del enlace" value={form.value}
          placeholder="https://..."
          onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
      )}

      {needsDriveUrl && (
        <div className="flex flex-col gap-2">
          <Input label={urlLabels[form.type]} value={form.value}
            placeholder={urlPlaceholders[form.type]}
            onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
          {form.type === 'file' && (
            <Input label="Nombre del archivo (opcional)" value={form.file_name}
              placeholder="ej: Partitura Lección 1.pdf"
              onChange={e => setForm(p => ({ ...p, file_name: e.target.value }))} />
          )}
          {/* Vista previa */}
          {form.value && form.type === 'image' && (
            <div className="p-2 rounded-xl" style={{ background: '#1c1c26' }}>
              <p className="text-xs mb-2" style={{ color: '#5a5a70' }}>Vista previa:</p>
              <img src={toImageUrl(form.value)} alt="preview"
                className="w-full rounded-xl object-contain max-h-48"
                onError={e => e.target.style.display = 'none'} />
            </div>
          )}
          {form.value && form.type === 'pdf' && (
            <div className="p-2 rounded-xl" style={{ background: '#1c1c26' }}>
              <p className="text-xs mb-2" style={{ color: '#5a5a70' }}>Vista previa:</p>
              <iframe src={toPreviewUrl(form.value)} className="w-full rounded-xl"
                style={{ height: '300px', border: 'none' }} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="flex-1">{item ? 'Guardar' : 'Agregar'}</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

function ContentBlock({ content, onReload }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showEditContent, setShowEditContent] = useState(false);
  const [editForm, setEditForm] = useState({ title: content.title, description: content.description || '' });
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  async function loadItems() {
    const data = await getItemsByContent(content.id);
    setItems(data);
  }

  async function handleExpand() {
    if (!expanded) await loadItems();
    setExpanded(p => !p);
  }

  async function handleDeleteItem(item) {
    if (!confirm(`¿Eliminar "${item.title || 'este ítem'}"?`)) return;
    await deleteItem(item.id);
    toast.success('Ítem eliminado');
    loadItems();
  }

  async function handleEditContent(e) {
    e.preventDefault();
    await updateContent(content.id, editForm);
    toast.success('Contenido actualizado');
    setShowEditContent(false);
    onReload();
  }

  async function handleDeleteContent() {
    if (!confirm(`¿Eliminar el contenido "${content.title}"?`)) return;
    const { error } = await supabase.from('contents').delete().eq('id', content.id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Contenido eliminado');
    onReload();
  }

  function handleDragStart(index) { dragItem.current = index; }
  function handleDragEnter(index) { dragOver.current = index; }
  async function handleDragEnd() {
    const reordered = [...items];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    setItems(reordered);
    await updateItemsOrder(reordered);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a38' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#16161f' }}>
        <button onClick={handleExpand} className="flex items-center gap-2 flex-1 text-left">
          <span style={{ color: expanded ? '#7c6af7' : '#9090a8' }}>
            {expanded ? <MdExpandLess size={20} /> : <MdExpandMore size={20} />}
          </span>
          <span className="font-medium text-white text-sm">{content.title}</span>
          {content.description && (
            <span className="text-xs" style={{ color: '#5a5a70' }}>— {content.description}</span>
          )}
        </button>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowEditContent(true)}><MdEdit /></Button>
          <Button size="sm" variant="danger" onClick={handleDeleteContent}><MdDelete /></Button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2 p-4" style={{ background: '#12121a' }}>
          {items.map((item, index) => (
            <div key={item.id} draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="rounded-xl p-3" style={{ background: '#1c1c26', border: '1px solid #2a2a38' }}>
              <div className="flex items-start gap-2">
                <MdDragIndicator className="mt-0.5 cursor-grab flex-shrink-0" style={{ color: '#5a5a70' }} />
                <div className="flex-1 min-w-0">
                  {item.title && <p className="text-sm font-medium text-white mb-2">{item.title}</p>}
                  <ItemRenderer item={item} />
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => setEditingItem(item)}><MdEdit /></Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteItem(item)}><MdDelete /></Button>
                </div>
              </div>
              {editingItem?.id === item.id && (
                <div className="mt-3">
                  <ItemForm contentId={content.id} item={item}
                    onSave={() => { setEditingItem(null); loadItems(); }}
                    onCancel={() => setEditingItem(null)} />
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && !showAddItem && (
            <p className="text-xs text-center py-3" style={{ color: '#5a5a70' }}>Sin ítems todavía</p>
          )}
          {showAddItem ? (
            <ItemForm contentId={content.id}
              onSave={() => { setShowAddItem(false); loadItems(); }}
              onCancel={() => setShowAddItem(false)} />
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setShowAddItem(true)}>
              <MdAdd /> Agregar ítem
            </Button>
          )}
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
          <p className="text-sm text-center py-4" style={{ color: '#5a5a70' }}>
            Esta lección no tiene contenidos todavía.
          </p>
        )}
        {showAddContent ? (
          <form onSubmit={handleAddContent} className="flex flex-col gap-3 p-4 rounded-xl"
            style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
            <Input label="Título del contenido" value={contentForm.title} required
              onChange={e => setContentForm(p => ({ ...p, title: e.target.value }))} />
            <Input label="Descripción (opcional)" value={contentForm.description}
              onChange={e => setContentForm(p => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">Crear contenido</Button>
              <Button type="button" size="sm" variant="secondary"
                onClick={() => setShowAddContent(false)}>Cancelar</Button>
            </div>
          </form>
        ) : (
          <Button variant="secondary" onClick={() => setShowAddContent(true)}>
            <MdAdd /> Agregar contenido
          </Button>
        )}
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
    if (!confirm(`¿Eliminar "${lesson.title}"?`)) return;
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
                  onClick={() => { setSelected(lesson); setShowContents(true); }}>
                  📋 Gestionar contenido
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
export async function generateStaticParams() { return []; }
