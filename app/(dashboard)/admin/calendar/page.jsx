'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventRatings } from '@/services/calendarService';
import { getGroups, getAllSubgroups } from '@/services/groupService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { MdAdd, MdDelete, MdEdit, MdChevronLeft, MdChevronRight } from 'react-icons/md';

const EMPTY_FORM = { title: '', description: '', type: 'class', modality: 'presential', starts_at: '', ends_at: '', target: 'all', group_id: '', subgroup_id: '' };

const TYPE_CONFIG = {
  class: { label: '🎵 Clase', color: '#7c6af7' },
  event: { label: '🎉 Evento', color: '#4ade80' },
};

const MODALITY_CONFIG = {
  presential: { label: '🏫 Presencial', color: '#3ca2f7' },
  virtual: { label: '💻 Virtual', color: '#f7a23c' },
};

function TargetBadge({ ev }) {
  if (ev.target === 'all') return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#4ade8020', color: '#4ade80' }}>🌐 General</span>;
  if (ev.target === 'group') return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#7c6af720', color: '#7c6af7' }}>👥 {ev.groups?.name}</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fbbf2420', color: '#fbbf24' }}>🔸 {ev.subgroups?.name}</span>;
}

function Stars({ rating, size = 14 }) {
  return (
    <span className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ color: s <= rating ? '#fbbf24' : '#2a2a38', fontSize: size }}>★</span>
      ))}
    </span>
  );
}

function EventForm({ form, setForm, groups, subgroups }) {
  return (
    <div className="flex flex-col gap-4">
      <Input label="Título" value={form.title} required
        onChange={e => setForm(p => ({...p, title: e.target.value}))} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Tipo</label>
        <div className="flex gap-2">
          {Object.entries(TYPE_CONFIG).map(([val, cfg]) => (
            <button key={val} type="button" onClick={() => setForm(p => ({...p, type: val}))}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: form.type === val ? cfg.color + '20' : '#0f0f13',
                border: `1px solid ${form.type === val ? cfg.color : '#333344'}`,
                color: form.type === val ? cfg.color : '#9090a8',
              }}>
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {form.type === 'class' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Modalidad</label>
          <div className="flex gap-2">
            {Object.entries(MODALITY_CONFIG).map(([val, cfg]) => (
              <button key={val} type="button" onClick={() => setForm(p => ({...p, modality: val}))}
                className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: form.modality === val ? cfg.color + '20' : '#0f0f13',
                  border: `1px solid ${form.modality === val ? cfg.color : '#333344'}`,
                  color: form.modality === val ? cfg.color : '#9090a8',
                }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Descripción (opcional)</label>
        <textarea value={form.description} rows={2}
          onChange={e => setForm(p => ({...p, description: e.target.value}))}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Inicio</label>
          <input type="datetime-local" value={form.starts_at} required
            onChange={e => setForm(p => ({...p, starts_at: e.target.value}))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Fin (opcional)</label>
          <input type="datetime-local" value={form.ends_at}
            onChange={e => setForm(p => ({...p, ends_at: e.target.value}))}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: '#0f0f13', border: '1px solid #333344', color: '#e8e8f0' }} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: '#9090a8' }}>Dirigido a</label>
        <div className="flex gap-2">
          {[{value:'all',label:'🌐 Todos'},{value:'group',label:'👥 Grupo'},{value:'subgroup',label:'🔸 Subgrupo'}].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setForm(p => ({...p, target: opt.value, group_id: '', subgroup_id: ''}))}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: form.target === opt.value ? '#7c6af720' : '#0f0f13',
                border: `1px solid ${form.target === opt.value ? '#7c6af7' : '#333344'}`,
                color: form.target === opt.value ? '#7c6af7' : '#9090a8',
              }}>{opt.label}</button>
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
    </div>
  );
}

export default function AdminCalendar() {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subgroups, setSubgroups] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRatings, setShowRatings] = useState(false);
  const [selected, setSelected] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    const [e, g, s] = await Promise.all([getAllEvents(), getGroups(), getAllSubgroups()]);
    setEvents(e); setGroups(g); setSubgroups(s);
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.starts_at) { toast.error('Completa título y fecha de inicio'); return; }
    try {
      await createEvent({ ...form, created_by: profile.id, starts_at: new Date(form.starts_at).toISOString(), ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null });
      toast.success('Evento creado');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch { toast.error('Error al crear evento'); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    try {
      await updateEvent(selected.id, {
        title: selected.title, description: selected.description,
        type: selected.type, modality: selected.type === 'class' ? selected.modality : null,
        starts_at: new Date(selected.starts_at).toISOString(),
        ends_at: selected.ends_at ? new Date(selected.ends_at).toISOString() : null,
        target: selected.target, group_id: selected.group_id || null, subgroup_id: selected.subgroup_id || null,
      });
      toast.success('Evento actualizado');
      setShowEdit(false);
      load();
    } catch { toast.error('Error al actualizar'); }
  }

  async function handleDelete(ev) {
    if (!confirm(`¿Eliminar "${ev.title}"?`)) return;
    try { await deleteEvent(ev.id); toast.success('Evento eliminado'); load(); }
    catch { toast.error('Error al eliminar'); }
  }

  async function openRatings(ev) {
    setSelected(ev);
    setLoadingRatings(true);
    setShowRatings(true);
    const data = await getEventRatings(ev.id);
    setRatings(data);
    setLoadingRatings(false);
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  function getEventsForDay(day) {
    return events.filter(ev => {
      const d = new Date(ev.starts_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function isPast(ev) { return new Date(ev.starts_at) < new Date(); }
  function formatTime(d) { return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];
  const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : null;
  const attendedCount = ratings.filter(r => r.attended).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Calendario</h1>
          <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{events.length} eventos</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><MdAdd /> Nuevo evento</Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="p-2 rounded-xl transition-all" style={{ color: '#9090a8' }}
          onMouseEnter={e => e.currentTarget.style.background = '#22222e'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <MdChevronLeft size={24} />
        </button>
        <h2 className="font-display font-bold text-white text-lg">{monthNames[month]} {year}</h2>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="p-2 rounded-xl transition-all" style={{ color: '#9090a8' }}
          onMouseEnter={e => e.currentTarget.style.background = '#22222e'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <MdChevronRight size={24} />
        </button>
      </div>

      <Card>
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(d => (
            <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: '#5a5a70' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const isSelected = selectedDay === day;
            return (
              <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                className="relative p-2 rounded-xl text-sm transition-all min-h-[56px] flex flex-col items-center"
                style={{
                  background: isSelected ? '#7c6af720' : isToday ? '#7c6af710' : 'transparent',
                  border: `1px solid ${isSelected ? '#7c6af7' : isToday ? '#7c6af740' : 'transparent'}`,
                  color: isToday ? '#7c6af7' : '#e8e8f0',
                }}>
                <span className="font-medium">{day}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: TYPE_CONFIG[ev.type]?.color || '#7c6af7' }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <div className="mt-4">
          <h3 className="font-semibold text-white mb-3">
            {selectedDay} de {monthNames[month]}
            {selectedDayEvents.length === 0 && <span className="text-sm font-normal ml-2" style={{ color: '#5a5a70' }}>— Sin eventos</span>}
          </h3>
          <div className="flex flex-col gap-2">
            {selectedDayEvents.map(ev => {
              const past = isPast(ev);
              return (
                <Card key={ev.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: TYPE_CONFIG[ev.type]?.color || '#7c6af7' }} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white">{ev.title}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: TYPE_CONFIG[ev.type]?.color + '20', color: TYPE_CONFIG[ev.type]?.color }}>
                          {TYPE_CONFIG[ev.type]?.label}
                        </span>
                        {ev.type === 'class' && ev.modality && (
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: MODALITY_CONFIG[ev.modality]?.color + '20', color: MODALITY_CONFIG[ev.modality]?.color }}>
                            {MODALITY_CONFIG[ev.modality]?.label}
                          </span>
                        )}
                        <TargetBadge ev={ev} />
                        {past && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#5a5a7020', color: '#5a5a70' }}>Pasado</span>}
                      </div>
                      {ev.description && <p className="text-sm mt-1" style={{ color: '#9090a8' }}>{ev.description}</p>}
                      <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>
                        🕐 {formatTime(ev.starts_at)}{ev.ends_at ? ` — ${formatTime(ev.ends_at)}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                      {past && (
                        <Button size="sm" variant="secondary" onClick={() => openRatings(ev)}>⭐ Evaluaciones</Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => {
                        const toLocal = iso => iso ? new Date(iso).toISOString().slice(0,16) : '';
                        setSelected({ ...ev, starts_at: toLocal(ev.starts_at), ends_at: toLocal(ev.ends_at) });
                        setShowEdit(true);
                      }}><MdEdit /></Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(ev)}><MdDelete /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nuevo evento">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <EventForm form={form} setForm={setForm} groups={groups} subgroups={subgroups} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear evento</Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>

      {selected && showEdit && (
        <Modal isOpen onClose={() => setShowEdit(false)} title="Editar evento">
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <EventForm form={selected} setForm={setSelected} groups={groups} subgroups={subgroups} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}

      {selected && showRatings && (
        <Modal isOpen onClose={() => setShowRatings(false)} title={`Evaluaciones: ${selected.title}`}>
          <div className="flex flex-col gap-4">
            {loadingRatings ? <p style={{ color: '#5a5a70' }}>Cargando...</p> :
            ratings.length === 0 ? (
              <p className="text-center py-8" style={{ color: '#5a5a70' }}>Ningún alumno ha evaluado este evento todavía.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl text-center" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                    <p className="text-3xl font-bold text-white mb-1">{avgRating}</p>
                    <div className="flex justify-center"><Stars rating={Math.round(avgRating)} size={20} /></div>
                    <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>{ratings.length} evaluación{ratings.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <div className="p-4 rounded-xl text-center" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                    <p className="text-3xl font-bold" style={{ color: '#4ade80' }}>{attendedCount}</p>
                    <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>de {ratings.length} asistieron</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: '#f75c6a' }}>{ratings.length - attendedCount}</p>
                    <p className="text-xs" style={{ color: '#5a5a70' }}>no asistieron</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[5,4,3,2,1].map(star => {
                    const attended = ratings.filter(r => r.attended);
                    const count = attended.filter(r => r.rating === star).length;
                    const pct = attended.length > 0 ? (count / attended.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs w-2" style={{ color: '#fbbf24' }}>{star}</span>
                        <span style={{ color: '#fbbf24', fontSize: 14 }}>★</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#2a2a38' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#fbbf24' }} />
                        </div>
                        <span className="text-xs w-4 text-right" style={{ color: '#5a5a70' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  {ratings.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{r.profiles?.display_name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: r.attended ? '#4ade8020' : '#f75c6a20', color: r.attended ? '#4ade80' : '#f75c6a' }}>
                          {r.attended ? '✓ Asistió' : '✗ No asistió'}
                        </span>
                      </div>
                      {r.attended && <Stars rating={r.rating} size={14} />}
                    </div>
                  ))}
                </div>
              </>
            )}
            <Button variant="secondary" onClick={() => setShowRatings(false)}>Cerrar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
