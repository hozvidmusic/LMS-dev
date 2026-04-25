'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getEvaluations, createEvaluation, updateEvaluation, deleteEvaluation, getTags, createTag, deleteTag, setEvaluationTags } from '@/services/evaluationService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete, MdQuiz, MdLabel } from 'react-icons/md';

const PRESET_COLORS = ['#7c6af7','#f75c6a','#f7a23c','#3cf7a2','#3ca2f7','#fbbf24','#4ade80','#a78bfa'];
const EMPTY_FORM = { title: '', description: '', max_attempts: 1, time_limit: '', random_order: false };

export default function AdminEvaluations() {
  const { profile } = useAuth();
  const router = useRouter();
  const [evaluations, setEvaluations] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterTag, setFilterTag] = useState('all');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#7c6af7');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [e, t] = await Promise.all([getEvaluations(), getTags()]);
      setEvaluations(e); setTags(t);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const ev = await createEvaluation({ ...form, time_limit: form.time_limit ? Number(form.time_limit) : null, created_by: profile.id });
      if (selectedTags.length) await setEvaluationTags(ev.id, selectedTags);
      toast.success('Evaluación creada');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setSelectedTags([]);
      load();
    } catch { toast.error('Error al crear'); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await updateEvaluation(selected.id, {
        title: selected.title, description: selected.description,
        max_attempts: selected.max_attempts,
        time_limit: selected.time_limit ? Number(selected.time_limit) : null,
        random_order: selected.random_order,
      });
      await setEvaluationTags(selected.id, selectedTags);
      toast.success('Evaluación actualizada');
      setShowEdit(false);
      load();
    } catch { toast.error('Error al actualizar'); }
  }

  async function handleDelete(ev) {
    if (!confirm(`¿Eliminar "${ev.title}"?`)) return;
    try { await deleteEvaluation(ev.id); toast.success('Eliminada'); load(); }
    catch { toast.error('Error al eliminar'); }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    try {
      await createTag({ name: newTagName.trim(), color: newTagColor, created_by: profile.id });
      setNewTagName(''); setNewTagColor('#7c6af7');
      load();
    } catch { toast.error('Esa etiqueta ya existe'); }
  }

  async function handleDeleteTag(tag) {
    if (!confirm(`¿Eliminar etiqueta "${tag.name}"?`)) return;
    try { await deleteTag(tag.id); load(); }
    catch { toast.error('Error al eliminar'); }
  }

  function openEdit(ev) {
    setSelected({ ...ev, time_limit: ev.time_limit || '' });
    setSelectedTags(ev.evaluation_tag_relations?.map(r => r.tag_id) || []);
    setShowEdit(true);
  }

  function toggleTag(id) {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function getEvTags(ev) {
    return ev.evaluation_tag_relations?.map(r => r.evaluation_tags).filter(Boolean) || [];
  }

  const filtered = evaluations.filter(ev => {
    const matchTag = filterTag === 'all' || ev.evaluation_tag_relations?.some(r => r.tag_id === filterTag);
    const matchSearch = ev.title.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  function EvalForm({ data, setData }) {
    return (
      <div className="flex flex-col gap-4">
        <Input label="Título" value={data.title} required onChange={e => setData(p => ({...p, title: e.target.value}))} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Descripción</label>
          <textarea value={data.description || ''} rows={2} onChange={e => setData(p => ({...p, description: e.target.value}))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Intentos permitidos</label>
            <div className="flex gap-2">
              {[1,2,3,5].map(n => (
                <button key={n} type="button" onClick={() => setData(p => ({...p, max_attempts: n}))}
                  className="flex-1 py-2 rounded-xl text-sm font-bold"
                  style={{ background: data.max_attempts === n ? '#7c6af720' : '#0f0f13', color: data.max_attempts === n ? '#7c6af7' : '#9090a8', border: `1px solid ${data.max_attempts === n ? '#7c6af7' : '#333344'}` }}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setData(p => ({...p, max_attempts: 999}))}
                className="flex-1 py-2 rounded-xl text-xs font-bold"
                style={{ background: data.max_attempts === 999 ? '#7c6af720' : '#0f0f13', color: data.max_attempts === 999 ? '#7c6af7' : '#9090a8', border: `1px solid ${data.max_attempts === 999 ? '#7c6af7' : '#333344'}` }}>
                ∞
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tiempo límite (min)</label>
            <input type="number" value={data.time_limit || ''} min={1} placeholder="Sin límite"
              onChange={e => setData(p => ({...p, time_limit: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setData(p => ({...p, random_order: !p.random_order}))}
            className="w-10 h-6 rounded-full transition-all relative"
            style={{ background: data.random_order ? '#7c6af7' : '#2a2a38' }}>
            <div className="w-4 h-4 rounded-full absolute top-1 transition-all"
              style={{ background: 'white', left: data.random_order ? '22px' : '4px' }} />
          </button>
          <span className="text-sm" style={{ color: '#9090a8' }}>Orden aleatorio de preguntas</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Etiquetas</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                className="px-2 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: selectedTags.includes(tag.id) ? tag.color + '30' : '#0f0f13',
                  color: selectedTags.includes(tag.id) ? tag.color : '#9090a8',
                  border: `1px solid ${selectedTags.includes(tag.id) ? tag.color : '#333344'}`,
                }}>
                {tag.name}
              </button>
            ))}
            {tags.length === 0 && <p className="text-xs" style={{ color: '#5a5a70' }}>No hay etiquetas. Crea una primero.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Banco de evaluaciones</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{evaluations.length} evaluaciones</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowTags(true)}><MdLabel /> Etiquetas</Button>
          <Button onClick={() => { setForm(EMPTY_FORM); setSelectedTags([]); setShowCreate(true); }}><MdAdd /> Nueva evaluación</Button>
        </div>
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar evaluación..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: '#16161d', border: '1px solid #2a2a38', color: '#e8e8f0', minWidth: '200px' }} />
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterTag('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: filterTag === 'all' ? '#7c6af720' : '#22222e', color: filterTag === 'all' ? '#7c6af7' : '#9090a8', border: `1px solid ${filterTag === 'all' ? '#7c6af7' : '#333344'}` }}>
            Todas
          </button>
          {tags.map(tag => (
            <button key={tag.id} onClick={() => setFilterTag(tag.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: filterTag === tag.id ? tag.color + '20' : '#22222e', color: filterTag === tag.id ? tag.color : '#9090a8', border: `1px solid ${filterTag === tag.id ? tag.color : '#333344'}` }}>
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? <p style={{ color: '#5a5a70' }}>Cargando...</p> : (
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>No hay evaluaciones todavía.</p></Card>
          ) : filtered.map(ev => (
            <Card key={ev.id}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#7c6af720', color: '#7c6af7' }}>
                  <MdQuiz size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-white">{ev.title}</h3>
                    {getEvTags(ev).map(tag => (
                      <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: tag.color + '20', color: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  {ev.description && <p className="text-xs mb-2" style={{ color: '#5a5a70' }}>{ev.description}</p>}
                  <div className="flex gap-3 text-xs flex-wrap" style={{ color: '#5a5a70' }}>
                    <span>🔁 {ev.max_attempts === 999 ? 'Intentos ilimitados' : `${ev.max_attempts} intento${ev.max_attempts !== 1 ? 's' : ''}`}</span>
                    {ev.time_limit && <span>⏱ {ev.time_limit} min</span>}
                    {ev.random_order && <span>🔀 Orden aleatorio</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/evaluations/${ev.id}`)}>
                    📝 Preguntas
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(ev)}><MdEdit /></Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(ev)}><MdDelete /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal crear */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva evaluación">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <EvalForm data={form} setData={setForm} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear evaluación</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal editar */}
      {selected && (
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar evaluación">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <EvalForm data={selected} setData={setSelected} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal etiquetas */}
      <Modal isOpen={showTags} onClose={() => setShowTags(false)} title="Gestionar etiquetas">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input type="text" value={newTagName} onChange={e => setNewTagName(e.target.value)}
              placeholder="Nombre de la etiqueta" onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewTagColor(c)}
                  className="w-6 h-6 rounded-full"
                  style={{ background: c, outline: newTagColor === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
            <Button onClick={handleCreateTag}>Crear</Button>
          </div>
          <div className="flex flex-col gap-2">
            {tags.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: '#5a5a70' }}>No hay etiquetas.</p>
            ) : tags.map(tag => (
              <div key={tag.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: tag.color }} />
                  <span className="text-sm text-white">{tag.name}</span>
                </div>
                <button onClick={() => handleDeleteTag(tag)} style={{ color: '#f75c6a' }}>
                  <MdDelete size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
