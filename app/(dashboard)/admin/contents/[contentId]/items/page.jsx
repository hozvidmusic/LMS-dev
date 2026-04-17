'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getItemsByContent, createItem, toggleItemStatus, deleteItem } from '@/services/courseService';
import { uploadFile } from '@/services/storageService';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import RichTextEditor from '@/components/editor/RichTextEditor';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdChevronLeft, MdUpload } from 'react-icons/md';

const ITEM_TYPES = [
  { value: 'text', label: '📝 Texto enriquecido' },
  { value: 'youtube', label: '▶️ YouTube' },
  { value: 'image', label: '🖼️ Imagen' },
  { value: 'audio', label: '🎵 Audio' },
  { value: 'video', label: '🎬 Video' },
  { value: 'pdf', label: '📄 PDF' },
  { value: 'link', label: '🔗 Enlace' },
  { value: 'file', label: '📎 Archivo descargable' },
];

const FILE_TYPES = ['image', 'audio', 'video', 'pdf', 'file'];
const VALUE_TYPES = ['youtube', 'link'];

export default function AdminItems() {
  const { contentId } = useParams();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const empty = { title: '', type: 'text', value: '', file_url: '', file_name: '' };
  const [form, setForm] = useState(empty);

  async function load() { setItems(await getItemsByContent(contentId)); }
  useEffect(() => { load(); }, [contentId]);

  async function handleFileUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const folder = { image:'images', audio:'audio', video:'videos', pdf:'pdfs' }[form.type] || 'files';
      const result = await uploadFile(file, folder, setUploadProgress);
      setForm(p => ({ ...p, file_url: result.url, file_name: result.fileName }));
      toast.success('Archivo subido correctamente');
    } catch (err) {
      toast.error('Error al subir el archivo: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (form.type === 'text' && !form.value) { toast.error('El texto no puede estar vacío'); return; }
    if (FILE_TYPES.includes(form.type) && !form.file_url && !form.value) {
      toast.error('Debes subir un archivo o pegar una URL'); return;
    }
    await createItem({ content_id: contentId, ...form });
    toast.success('Ítem creado');
    setShowCreate(false);
    setForm(empty);
    load();
  }

  async function handleDelete(item) {
    if (!confirm(`¿Eliminar "${item.title || item.type}"?`)) return;
    await deleteItem(item.id);
    toast.success('Ítem eliminado');
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
          <h1 className="font-display font-bold text-2xl text-white">Ítems del contenido</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{items.length} ítems</p>
        </div>
        <Button onClick={() => { setForm(empty); setShowCreate(true); }}>
          <MdAdd /> Nuevo ítem
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {items.map(item => (
          <Card key={item.id}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {ITEM_TYPES.find(t => t.value === item.type)?.label.split(' ')[0] || '📄'}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{item.title || item.type}</span>
                  <Badge status={item.status} />
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#22222e', color: '#9090a8' }}>{item.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant={item.status === 'active' ? 'danger' : 'secondary'}
                  onClick={async () => { await toggleItemStatus(item.id, item.status); toast.success('Estado actualizado'); load(); }}>
                  {item.status === 'active' ? 'Desactivar' : 'Activar'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(item)}>
                  <MdDelete />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>Sin ítems. ¡Agrega el primero!</p></Card>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo ítem" size="lg">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Título (opcional)" value={form.title}
            onChange={e => setForm(p => ({...p, title: e.target.value}))}
            placeholder="Ej: Introducción a los acordes" />

          <Select label="Tipo de ítem" value={form.type}
            onChange={e => setForm(p => ({...p, type: e.target.value, value: '', file_url: '', file_name: ''}))}
            options={ITEM_TYPES} />

          {form.type === 'text' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Contenido</label>
              <RichTextEditor value={form.value} onChange={v => setForm(p => ({...p, value: v}))} />
            </div>
          )}

          {VALUE_TYPES.includes(form.type) && (
            <Input
              label={form.type === 'youtube' ? 'URL de YouTube' : 'URL del enlace'}
              value={form.value}
              onChange={e => setForm(p => ({...p, value: e.target.value}))}
              placeholder={form.type === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://...'} />
          )}

          {FILE_TYPES.includes(form.type) && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Archivo</label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
                  style={{ borderColor: '#333344' }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#7c6af7'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#333344'}>
                  <MdUpload className="text-3xl mx-auto mb-2" style={{ color: '#5a5a70' }} />
                  <p className="text-sm" style={{ color: '#5a5a70' }}>
                    {form.file_name || 'Haz clic para seleccionar archivo'}
                  </p>
                  {uploading && (
                    <div className="mt-3">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#22222e' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${uploadProgress}%`, background: '#7c6af7' }} />
                      </div>
                    </div>
                  )}
                  {form.file_url && !uploading && (
                    <p className="text-xs mt-2" style={{ color: '#4ade80' }}>✓ Archivo subido</p>
                  )}
                </div>
                <input ref={fileInputRef} type="file" className="hidden"
                  onChange={e => handleFileUpload(e.target.files[0])} />
              </div>
              <Input label="O pega una URL directa" value={form.value}
                onChange={e => setForm(p => ({...p, value: e.target.value}))}
                placeholder="https://..." />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? 'Subiendo...' : 'Crear ítem'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
