'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentsByLesson, createContent, updateContent, toggleContentStatus } from '@/services/courseService';
import { getAdminClient } from '@/supabase/adminClient';
import { MdAdd, MdEdit, MdDelete, MdChevronLeft, MdExpandMore, MdExpandLess, MdDragIndicator } from 'react-icons/md';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import RichTextEditor from '@/components/editor/RichTextEditor';
import toast from 'react-hot-toast';

const supabaseAdmin = getAdminClient();

function ItemForm({ contentId, onSave, onCancel, initialData }) {
  const TYPES = [
    { id: 'text', label: '📝 Texto' },
    { id: 'youtube', label: '▶️ YouTube' },
    { id: 'video', label: '🎬 Video' },
    { id: 'audio', label: '🎵 Audio' },
    { id: 'image', label: '🖼️ Imagen' },
    { id: 'pdf', label: '📄 PDF' },
    { id: 'link', label: '🔗 Enlace' },
  ];
  const [form, setForm] = useState(initialData || { type: 'text', title: '', value: '', file_url: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      content_id: contentId,
      type: form.type,
      title: form.title || null,
      value: form.type === 'text' ? form.value : form.file_url,
      file_url: form.type !== 'text' ? form.file_url : null,
    };
    if (initialData) {
      const { error } = await supabaseAdmin.from('items').update(payload).eq('id', initialData.id);
      if (error) { toast.error('Error al actualizar'); return; }
      toast.success('Item actualizado');
    } else {
      const { data: existing } = await supabaseAdmin.from('items').select('id').eq('content_id', contentId);
      payload.sort_order = (existing?.length || 0) + 1;
      const { error } = await supabaseAdmin.from('items').insert(payload);
      if (error) { toast.error('Error al crear: ' + error.message); return; }
      toast.success('Item creado');
    }
    onSave();
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
      <div className="flex gap-2 flex-wrap">
        {TYPES.map(t => (
          <button key={t.id} type="button"
            onClick={() => setForm(p => ({ ...p, type: t.id, value: '', file_url: '' }))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: form.type === t.id ? '#7c6af720' : '#22222e',
              color: form.type === t.id ? '#7c6af7' : '#9090a8',
              border: form.type === t.id ? '1px solid #7c6af740' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <Input label="Titulo (opcional)" value={form.title}
        onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      {form.type === 'text'
        ? <RichTextEditor value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} />
        : <Input
            label={form.type === 'youtube' ? 'URL de YouTube' : 'URL del archivo'}
            value={form.file_url}
            required
            onChange={e => setForm(p => ({ ...p, file_url: e.target.value }))} />
      }
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1" onClick={handleSubmit}>
          {initialData ? 'Actualizar' : 'Guardar'} item
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function ContentBlock({ content, onReload }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditItem, setShowEditItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showEditContent, setShowEditContent] = useState(false);
  const [editForm, setEditForm] = useState({ title: content.title, description: content.description || '' });
  const dragItem = useRef(null);
  const dragItemOver = useRef(null);

  function handleDragStart(index) { dragItem.current = index; }
  function handleDragEnter(index) { dragItemOver.current = index; }
  async function handleDragEnd() {
    const reordered = [...items];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragItemOver.current, 0, dragged);
    dragItem.current = null; dragItemOver.current = null;
    setItems(reordered);
    const updates = reordered.map((item, index) =>
      supabaseAdmin.from('items').update({ sort_order: index + 1 }).eq('id', item.id)
    );
    await Promise.all(updates);
    toast.success('Orden guardado');
  }

  async function loadItems() {
    const { data } = await supabaseAdmin.from('items').select('*')
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

  async function handleDeleteContent() {
    if (!confirm('Eliminar este contenido y todos sus items?')) return;
    await supabaseAdmin.from('items').delete().eq('content_id', content.id);
    await supabaseAdmin.from('contents').delete().eq('id', content.id);
    toast.success('Contenido eliminado');
    onReload();
  }

  async function handleDeleteItem(id) {
    if (!confirm('Eliminar este item?')) return;
    await supabaseAdmin.from('items').delete().eq('id', id);
    toast.success('Item eliminado');
    loadItems();
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2a2a38' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#16161f' }}>
        <button onClick={() => setExpanded(p => !p)} className="flex-1 flex items-center gap-2 text-left">
          <span style={{ color: '#5a5a70' }}>{expanded ? <MdExpandLess /> : <MdExpandMore />}</span>
          <span className="text-sm font-medium text-white">{content.title}</span>
          <Badge status={content.status} />
        </button>
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => setShowEditContent(true)}><MdEdit /></Button>
          <Button size="sm" variant={content.status === 'active' ? 'danger' : 'secondary'}
            onClick={async () => { await toggleContentStatus(content.id, content.status); onReload(); }}>
            {content.status === 'active' ? 'Desactivar' : 'Activar'}
          </Button>
          <Button size="sm" variant="danger" onClick={handleDeleteContent}><MdDelete /></Button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 p-4" style={{ background: '#0f0f13' }}>
          {items.map((item, index) => (
            <div key={item.id} draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="flex flex-col gap-2 p-3 rounded-xl"
              style={{ background: '#16161f', border: '1px solid #2a2a38', cursor: 'grab' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MdDragIndicator style={{ color: '#5a5a70', flexShrink: 0 }} size={18} />
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: '#7c6af720', color: '#7c6af7' }}>{item.type}</span>
                    {item.title && <span className="text-sm text-white ml-2">{item.title}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => {
                    setSelectedItem({ ...item, file_url: item.file_url || item.value || '' });
                    setShowEditItem(true);
                  }}><MdEdit /></Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteItem(item.id)}><MdDelete /></Button>
                </div>
              </div>
              {item.type === 'text' && item.value && (
                <div className="text-xs rounded-lg p-2 line-clamp-2"
                  style={{ background: '#0f0f13', color: '#5a5a70' }}
                  dangerouslySetInnerHTML={{ __html: item.value }} />
              )}
              {item.type !== 'text' && (item.file_url || item.value) && (
                <p className="text-xs truncate" style={{ color: '#5a5a70' }}>{item.file_url || item.value}</p>
              )}
            </div>
          ))}
          {items.length === 0 && !showAddItem && (
            <p className="text-xs text-center py-2" style={{ color: '#5a5a70' }}>Sin items todavia.</p>
          )}
          {showAddItem
            ? <ItemForm contentId={content.id}
                onSave={() => { setShowAddItem(false); loadItems(); }}
                onCancel={() => setShowAddItem(false)} />
            : <Button size="sm" variant="secondary" onClick={() => setShowAddItem(true)}>
                <MdAdd /> Agregar item
              </Button>}
        </div>
      )}

      {showEditContent && (
        <Modal isOpen onClose={() => setShowEditContent(false)} title="Editar contenido">
          <form onSubmit={handleEditContent} className="flex flex-col gap-4">
            <Input label="Titulo" value={editForm.title}
              onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
            <Input label="Descripcion" value={editForm.description}
              onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEditContent(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {showEditItem && selectedItem && (
        <Modal isOpen onClose={() => { setShowEditItem(false); setSelectedItem(null); }} title="Editar item">
          <ItemForm
            contentId={content.id}
            initialData={selectedItem}
            onSave={() => { setShowEditItem(false); setSelectedItem(null); loadItems(); }}
            onCancel={() => { setShowEditItem(false); setSelectedItem(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

export default function ContentsPage() {
  const { courseId, lessonId } = useParams();
  const router = useRouter();
  const [contents, setContents] = useState([]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [showAddContent, setShowAddContent] = useState(false);
  const [contentForm, setContentForm] = useState({ title: '', description: '' });
  const dragContent = useRef(null);
  const dragContentOver = useRef(null);
  function handleContentDragStart(index) { dragContent.current = index; }
  function handleContentDragEnter(index) { dragContentOver.current = index; }
  async function handleContentDragEnd() {
    const reordered = [...contents];
    const dragged = reordered.splice(dragContent.current, 1)[0];
    reordered.splice(dragContentOver.current, 0, dragged);
    dragContent.current = null; dragContentOver.current = null;
    setContents(reordered);
    const updates = reordered.map((c, i) =>
      supabaseAdmin.from('contents').update({ sort_order: i + 1 }).eq('id', c.id)
    );
    await Promise.all(updates);
    toast.success('Orden guardado');
  }

  async function loadContents() {
    const data = await getContentsByLesson(lessonId);
    setContents(data);
  }

  useEffect(() => {
    loadContents();
    supabaseAdmin.from('lessons').select('title').eq('id', lessonId).single()
      .then(({ data }) => { if (data) setLessonTitle(data.title); });
  }, [lessonId]);

  async function handleAddContent(e) {
    e.preventDefault();
    await createContent({ lessonId, ...contentForm });
    toast.success('Contenido creado');
    setShowAddContent(false);
    setContentForm({ title: '', description: '' });
    loadContents();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push(`/admin/courses/${courseId}/lessons`)}
        className="flex items-center gap-1 text-sm mb-4" style={{ color: '#9090a8' }}>
        <MdChevronLeft /> Volver a lecciones
      </button>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Contenidos</h1>
          {lessonTitle && <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{lessonTitle}</p>}
        </div>
        <Button onClick={() => setShowAddContent(true)}><MdAdd /> Agregar contenido</Button>
      </div>

      <div className="flex flex-col gap-3">
        {contents.map((content, index) => (
          <div key={content.id} draggable
            onDragStart={() => handleContentDragStart(index)}
            onDragEnter={() => handleContentDragEnter(index)}
            onDragEnd={handleContentDragEnd}
            onDragOver={e => e.preventDefault()}>
            <ContentBlock content={content} onReload={loadContents} />
          </div>
        ))}
        {contents.length === 0 && !showAddContent && (
          <Card>
            <p className="text-center py-8" style={{ color: '#5a5a70' }}>Sin contenidos todavia. Agrega el primero.</p>
          </Card>
        )}
      </div>

      {showAddContent && (
        <div className="mt-4">
          <form onSubmit={handleAddContent} className="flex flex-col gap-3 p-4 rounded-xl"
            style={{ background: '#16161f', border: '1px solid #2a2a38' }}>
            <Input label="Titulo del contenido" value={contentForm.title} required
              onChange={e => setContentForm(p => ({ ...p, title: e.target.value }))} />
            <Input label="Descripcion (opcional)" value={contentForm.description}
              onChange={e => setContentForm(p => ({ ...p, description: e.target.value }))} />
            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">Crear contenido</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddContent(false)}>Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
