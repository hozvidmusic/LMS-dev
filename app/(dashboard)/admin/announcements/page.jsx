'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/services/announcementService';
import { sendPushNotification } from '@/services/notificationService';
import { getAdminClient } from '@/supabase/adminClient';
import { getGroups, getAllSubgroups } from '@/services/groupService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdAnnouncement, MdEdit } from 'react-icons/md';

const supabase = getAdminClient();
const EMPTY_FORM = { title: '', body: '', target: 'all', group_id: '', subgroup_id: '', expires_at: '' };

function TargetBadge({ announcement }) {
  if (announcement.target === 'all') return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#4ade8020', color: '#4ade80' }}>🌐 General</span>
  );
  if (announcement.target === 'group') return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#7c6af720', color: '#7c6af7' }}>👥 {announcement.groups?.name}</span>
  );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fbbf2420', color: '#fbbf24' }}>🔸 {announcement.subgroups?.name}</span>
  );
}

function isExpired(a) {
  if (!a.expires_at) return false;
  return new Date(a.expires_at) < new Date();
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAnnouncements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', title: '', body: '', expires_at: '', target: 'all', group_id: '', subgroup_id: '' });

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await updateAnnouncement(editForm.id, {
        title: editForm.title,
        body: editForm.body,
        expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null,
        target: editForm.target,
        group_id: editForm.group_id,
        subgroup_id: editForm.subgroup_id,
      });
      toast.success('Anuncio actualizado');
      setShowEdit(false);
      load();
    } catch { toast.error('Error al actualizar'); }
  }
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const [a, g, s] = await Promise.all([getAllAnnouncements(), getGroups(), getAllSubgroups()]);
      setAnnouncements(a); setGroups(g); setSubgroups(s);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.body) { toast.error('Completa título y mensaje'); return; }
    if (form.target === 'group' && !form.group_id) { toast.error('Selecciona un grupo'); return; }
    if (form.target === 'subgroup' && !form.subgroup_id) { toast.error('Selecciona un subgrupo'); return; }
    try {
      await createAnnouncement({
        ...form,
        created_by: profile.id,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      });
      // Obtener destinatarios y enviar notificación
      let user_ids = null;
      if (form.target === 'group' && form.group_id) {
        const { data: members } = await supabase.from('profile_groups').select('user_id').eq('group_id', form.group_id);
        user_ids = (members || []).map(m => m.user_id);
      } else if (form.target === 'subgroup' && form.subgroup_id) {
        const { data: members } = await supabase.from('profile_subgroups').select('user_id').eq('subgroup_id', form.subgroup_id);
        user_ids = (members || []).map(m => m.user_id);
      }
      sendPushNotification({ user_ids, title: '📢 ' + form.title, body: form.body, url: '/announcements' });
      toast.success('Anuncio publicado');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch { toast.error('Error al publicar'); }
  }

  async function handleDelete(a) {
    if (!confirm(`¿Eliminar "${a.title}"?`)) return;
    try { await deleteAnnouncement(a.id); toast.success('Anuncio eliminado'); load(); }
    catch { toast.error('Error al eliminar'); }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Anuncios</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{announcements.length} anuncios</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nuevo anuncio</Button>
      </div>

      {loading ? <p style={{ color: '#5a5a70' }}>Cargando...</p> : (
        <div className="flex flex-col gap-3">
          {announcements.length === 0 ? (
            <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>No hay anuncios todavía.</p></Card>
          ) : announcements.map(a => {
            const expired = isExpired(a);
            return (
              <Card key={a.id}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: expired ? '#5a5a7020' : '#7c6af720', color: expired ? '#5a5a70' : '#7c6af7' }}>
                    <MdAnnouncement size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold" style={{ color: expired ? '#5a5a70' : 'white' }}>{a.title}</h3>
                      {expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#f75c6a20', color: '#f75c6a' }}>
                          ⏰ Expirado
                        </span>
                      )}
                      <TargetBadge announcement={a} />
                    </div>
                    <p className="text-sm leading-relaxed mb-2" style={{ color: expired ? '#3a3a50' : '#9090a8' }}>{a.body}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-xs" style={{ color: '#5a5a70' }}>
                        {a.profiles?.display_name} · {formatDate(a.created_at)}
                      </p>
                      {a.expires_at && (
                        <p className="text-xs" style={{ color: expired ? '#f75c6a' : '#fbbf24' }}>
                          {expired ? '⏰ Expiró' : '⏳ Expira'}: {formatDateTime(a.expires_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => {
                      setEditForm({
                        id: a.id,
                        title: a.title,
                        body: a.body,
                        expires_at: a.expires_at ? new Date(a.expires_at).toISOString().slice(0,16) : '',
                        target: a.target || 'all',
                        group_id: a.group_id || '',
                        subgroup_id: a.subgroup_id || '',
                      });
                      setShowEdit(true);
                    }}><MdEdit /></Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(a)}><MdDelete /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar anuncio">
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <Input label="Título" value={editForm.title} required
            onChange={e => setEditForm(p => ({...p, title: e.target.value}))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Mensaje</label>
            <textarea value={editForm.body} required rows={4}
              onChange={e => setEditForm(p => ({...p, body: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Dirigido a</label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: '🌐 Todos' },
                { value: 'group', label: '👥 Grupo' },
                { value: 'subgroup', label: '🔸 Subgrupo' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setEditForm(p => ({...p, target: opt.value, group_id: '', subgroup_id: ''}))}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: editForm.target === opt.value ? '#7c6af720' : '#0f0f13',
                    border: `1px solid ${editForm.target === opt.value ? '#7c6af7' : '#333344'}`,
                    color: editForm.target === opt.value ? '#7c6af7' : '#9090a8',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {editForm.target === 'group' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Grupo</label>
              <select value={editForm.group_id} onChange={e => setEditForm(p => ({...p, group_id: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                <option value="">— Selecciona grupo —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {editForm.target === 'subgroup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Subgrupo</label>
              <select value={editForm.subgroup_id} onChange={e => setEditForm(p => ({...p, subgroup_id: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                <option value="">— Selecciona subgrupo —</option>
                {subgroups.map(s => <option key={s.id} value={s.id}>{s.name} — {s.groups?.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>
              Fecha de expiración <span style={{ color: '#5a5a70' }}>(opcional)</span>
            </label>
            <input type="datetime-local" value={editForm.expires_at}
              onChange={e => setEditForm(p => ({...p, expires_at: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
            <p className="text-xs" style={{ color: '#5a5a70' }}>
              Si defines una fecha, el anuncio dejará de mostrarse a los alumnos después de esa fecha.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Guardar cambios</Button>
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo anuncio">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Título" value={form.title} required
            onChange={e => setForm(p => ({...p, title: e.target.value}))} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Mensaje</label>
            <textarea value={form.body} required rows={4}
              onChange={e => setForm(p => ({...p, body: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Dirigido a</label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: '🌐 Todos' },
                { value: 'group', label: '👥 Grupo' },
                { value: 'subgroup', label: '🔸 Subgrupo' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm(p => ({...p, target: opt.value, group_id: '', subgroup_id: ''}))}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: form.target === opt.value ? '#7c6af720' : '#0f0f13',
                    border: `1px solid ${form.target === opt.value ? '#7c6af7' : '#333344'}`,
                    color: form.target === opt.value ? '#7c6af7' : '#9090a8',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {form.target === 'group' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Grupo</label>
              <select value={form.group_id} onChange={e => setForm(p => ({...p, group_id: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                <option value="">— Selecciona grupo —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {form.target === 'subgroup' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Subgrupo</label>
              <select value={form.subgroup_id} onChange={e => setForm(p => ({...p, subgroup_id: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }}>
                <option value="">— Selecciona subgrupo —</option>
                {subgroups.map(s => <option key={s.id} value={s.id}>{s.name} — {s.groups?.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: '#9090a8' }}>
              Fecha de expiración <span style={{ color: '#5a5a70' }}>(opcional)</span>
            </label>
            <input type="datetime-local" value={form.expires_at}
              onChange={e => setForm(p => ({...p, expires_at: e.target.value}))}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
            <p className="text-xs" style={{ color: '#5a5a70' }}>
              Si defines una fecha, el anuncio dejará de mostrarse a los alumnos después de esa fecha.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Publicar</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
