'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentsByLesson, createContent, updateContent, toggleContentStatus } from '@/services/courseService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdChevronLeft, MdChevronRight, MdDelete } from 'react-icons/md';

export default function AdminContents() {
  const { lessonId } = useParams();
  const router = useRouter();
  const [contents, setContents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });

  async function load() { setContents(await getContentsByLesson(lessonId)); }
  useEffect(() => { load(); }, [lessonId]);

  async function handleCreate(e) {
    e.preventDefault();
    await createContent({ lessonId, ...form });
    toast.success('Contenido creado');
    setShowCreate(false);
    setForm({ title: '', description: '' });
    load();
  }

  async function handleEdit(e) {
    e.preventDefault();
    await updateContent(selected.id, { title: selected.title, description: selected.description });
    toast.success('Contenido actualizado');
    setShowEdit(false);
    load();
  }

  async function handleDelete(content) {
    if (!confirm(`¿Eliminar "${content.title}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('contents').delete().eq('id', content.id);
    if (error) { toast.error('Error al eliminar contenido'); return; }
    toast.success('Contenido eliminado');
    load();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()}
        className="flex items-center gap-1 text-sm mb-4" style={{ color: '#9090a8' }}
        onMouseEnter={e => e.currentTarget.style.color = '#7c6af7'}
        onMouseLeave={e => e.currentTarget.style.color = '#9090a8'}>
        <MdChevronLeft /> Volver
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Contenidos</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{contents.length} contenidos</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nuevo contenido</Button>
      </div>

      <div className="flex flex-col gap-3">
        {contents.map(content => (
          <Card key={content.id}>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: '#7c6af720', color: '#7c6af7' }}>
                {content.sort_order}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-white">{content.title}</h3>
                  <Badge status={content.status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary"
                  onClick={() => { setSelected({...content}); setShowEdit(true); }}>
                  <MdEdit />
                </Button>
                <Button size="sm" variant={content.status === 'active' ? 'danger' : 'secondary'}
                  onClick={async () => { await toggleContentStatus(content.id, content.status); toast.success('Estado actualizado'); load(); }}>
                  {content.status === 'active' ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => router.push(`/admin/contents/${content.id}/items`)}>
                  Ítems <MdChevronRight />
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(content)}>
                  <MdDelete />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {contents.length === 0 && (
          <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>Sin contenidos.</p></Card>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo contenido">
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
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar contenido">
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
