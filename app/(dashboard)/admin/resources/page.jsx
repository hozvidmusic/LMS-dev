'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getResources, createResource, updateResource, deleteResource } from '@/services/resourceService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete, MdPictureAsPdf, MdMusicNote, MdVideoLibrary, MdImage, MdInsertDriveFile, MdLibraryMusic } from 'react-icons/md';

const RESOURCE_TYPES = [
  { value: 'pdf', label: '📄 PDF', icon: <MdPictureAsPdf /> },
  { value: 'audio', label: '🎵 Audio', icon: <MdMusicNote /> },
  { value: 'video', label: '🎬 Video', icon: <MdVideoLibrary /> },
  { value: 'image', label: '🖼️ Imagen', icon: <MdImage /> },
  { value: 'score', label: '🎼 Partitura', icon: <MdLibraryMusic /> },
  { value: 'file', label: '📁 Archivo', icon: <MdInsertDriveFile /> },
];

function getTypeInfo(type) {
  return RESOURCE_TYPES.find(t => t.value === type) || RESOURCE_TYPES[5];
}

const EMPTY_FORM = { title: '', description: '', type: 'pdf', drive_url: '' };

export default function AdminResources() {
  const { profile } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const data = await getResources();
      setResources(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.drive_url) { toast.error('Ingresa la URL de Drive'); return; }
    try {
      await createResource({ ...form, created_by: profile.id });
      toast.success('Recurso creado');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch { toast.error('Error al crear recurso'); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await updateResource(selected.id, {
        title: selected.title,
        description: selected.description,
        type: selected.type,
        drive_url: selected.drive_url,
      });
      toast.success('Recurso actualizado');
      setShowEdit(false);
      load();
    } catch { toast.error('Error al actualizar'); }
  }

  async function handleDelete(resource) {
    if (!confirm(`¿Eliminar "${resource.title}"?`)) return;
    try {
      await deleteResource(resource.id);
      toast.success('Recurso eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const filtered = filter === 'all' ? resources : resources.filter(r => r.type === filter);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Biblioteca de recursos</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{resources.length} recursos</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nuevo recurso</Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('all')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: filter === 'all' ? '#7c6af720' : '#22222e',
            color: filter === 'all' ? '#7c6af7' : '#9090a8',
            border: `1px solid ${filter === 'all' ? '#7c6af740' : '#333344'}`,
          }}>
          Todos
        </button>
        {RESOURCE_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filter === t.value ? '#7c6af720' : '#22222e',
              color: filter === t.value ? '#7c6af7' : '#9090a8',
              border: `1px solid ${filter === t.value ? '#7c6af740' : '#333344'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#5a5a70' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-center py-12" style={{ color: '#5a5a70' }}>
            No hay recursos{filter !== 'all' ? ' de este tipo' : ''} todavía.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(resource => {
            const typeInfo = getTypeInfo(resource.type);
            return (
              <Card key={resource.id}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: '#7c6af720', color: '#7c6af7' }}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{resource.title}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: '#7c6af720', color: '#7c6af7' }}>
                        {typeInfo.label}
                      </span>
                    </div>
                    {resource.description && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: '#5a5a70' }}>{resource.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={resource.drive_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="secondary">Ver</Button>
                    </a>
                    <Button size="sm" variant="secondary" onClick={() => { setSelected({...resource}); setShowEdit(true); }}>
                      <MdEdit />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(resource)}>
                      <MdDelete />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal crear */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo recurso">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Título" value={form.title} required
            onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
              rows={2} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {RESOURCE_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setForm(p => ({...p, type: t.value}))}
                  className="px-3 py-2 rounded-xl text-sm transition-all"
                  style={{
                    background: form.type === t.value ? '#7c6af720' : '#0f0f13',
                    border: `1px solid ${form.type === t.value ? '#7c6af7' : '#333344'}`,
                    color: form.type === t.value ? '#7c6af7' : '#9090a8',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="URL de Google Drive" value={form.drive_url} required
            placeholder="https://drive.google.com/file/d/..."
            onChange={e => setForm(p => ({...p, drive_url: e.target.value}))} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear recurso</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      {selected && (
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar recurso">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Input label="Título" value={selected.title}
              onChange={e => setSelected(p => ({...p, title: e.target.value}))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Descripción</label>
              <textarea value={selected.description || ''} onChange={e => setSelected(p => ({...p, description: e.target.value}))}
                rows={2} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {RESOURCE_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setSelected(p => ({...p, type: t.value}))}
                    className="px-3 py-2 rounded-xl text-sm transition-all"
                    style={{
                      background: selected.type === t.value ? '#7c6af720' : '#0f0f13',
                      border: `1px solid ${selected.type === t.value ? '#7c6af7' : '#333344'}`,
                      color: selected.type === t.value ? '#7c6af7' : '#9090a8',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="URL de Google Drive" value={selected.drive_url}
              placeholder="https://drive.google.com/file/d/..."
              onChange={e => setSelected(p => ({...p, drive_url: e.target.value}))} />
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
