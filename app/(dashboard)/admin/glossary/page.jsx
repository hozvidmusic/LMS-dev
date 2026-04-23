'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getGlossary, createTerm, updateTerm, deleteTerm } from '@/services/glossaryService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md';

const EMPTY_FORM = { term: '', definition: '' };

export default function AdminGlossary() {
  const { profile } = useAuth();
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try { setTerms(await getGlossary()); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createTerm({ ...form, created_by: profile.id });
      toast.success('Término creado');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err.message?.includes('unique') ? 'Este término ya existe' : 'Error al crear término');
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await updateTerm(selected.id, { term: selected.term, definition: selected.definition });
      toast.success('Término actualizado');
      setShowEdit(false);
      load();
    } catch { toast.error('Error al actualizar'); }
  }

  async function handleDelete(t) {
    if (!confirm(`¿Eliminar "${t.term}"?`)) return;
    try {
      await deleteTerm(t.id);
      toast.success('Término eliminado');
      load();
    } catch { toast.error('Error al eliminar'); }
  }

  const filtered = terms.filter(t =>
    t.term.toLowerCase().includes(search.toLowerCase()) ||
    t.definition.toLowerCase().includes(search.toLowerCase())
  );

  // Agrupar por letra
  const grouped = filtered.reduce((acc, t) => {
    const letter = t.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Glosario musical</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{terms.length} términos</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nuevo término</Button>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar término..."
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-6"
        style={{ background: '#16161d', border: '1px solid #2a2a38', color: '#e8e8f0' }} />

      {loading ? (
        <p style={{ color: '#5a5a70' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>No hay términos todavía.</p></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.keys(grouped).sort().map(letter => (
            <div key={letter}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-display font-bold text-2xl" style={{ color: '#7c6af7' }}>{letter}</span>
                <div className="flex-1 h-px" style={{ background: '#2a2a38' }} />
              </div>
              <div className="flex flex-col gap-2">
                {grouped[letter].map(t => (
                  <Card key={t.id}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{t.term}</h3>
                        <p className="text-sm mt-1 leading-relaxed" style={{ color: '#9090a8' }}>{t.definition}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="secondary" onClick={() => { setSelected({...t}); setShowEdit(true); }}>
                          <MdEdit />
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(t)}>
                          <MdDelete />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo término">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Término" value={form.term} required
            onChange={e => setForm(p => ({...p, term: e.target.value}))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Definición</label>
            <textarea value={form.definition} required
              onChange={e => setForm(p => ({...p, definition: e.target.value}))}
              rows={4} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar término">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <Input label="Término" value={selected.term}
              onChange={e => setSelected(p => ({...p, term: e.target.value}))} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Definición</label>
              <textarea value={selected.definition}
                onChange={e => setSelected(p => ({...p, definition: e.target.value}))}
                rows={4} className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
            </div>
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
