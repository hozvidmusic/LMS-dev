'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCalendar } from '@/context/CalendarContext';
import { getEventsForStudent, rateEvent } from '@/services/calendarService';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const TYPE_CONFIG = {
  class: { label: '🎵 Clase', color: '#7c6af7' },
  event: { label: '🎉 Evento', color: '#4ade80' },
};
const MODALITY_CONFIG = {
  presential: { label: '🏫 Presencial', color: '#3ca2f7' },
  virtual: { label: '💻 Virtual', color: '#f7a23c' },
};

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2 justify-center">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button"
          onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="text-4xl transition-all"
          style={{ color: star <= (hover || value) ? '#fbbf24' : '#2a2a38' }}>★</button>
      ))}
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const { refresh } = useCalendar();
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [pendingRatings, setPendingRatings] = useState([]);
  const [currentRating, setCurrentRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [attended, setAttended] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  async function load() {
    if (!profile) return;
    const data = await getEventsForStudent(profile.id);
    setAllEvents(data);
    const now = new Date();
    const past = data.filter(e => {
      const isPast = new Date(e.starts_at) <= now;
      const alreadyRated = e.event_ratings?.some(r => r.user_id === profile.id);
      return isPast && !alreadyRated;
    });
    setPendingRatings(past);
    if (past.length > 0) {
      setCurrentRating(past[0]);
      setRatingValue(0);
      setAttended(null);
      setShowRatingModal(true);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  async function handleRate() {
    if (attended === null) { toast.error('¿Asististe al evento?'); return; }
    if (attended && ratingValue === 0) { toast.error('Selecciona una calificación'); return; }
    try {
      await rateEvent({ event_id: currentRating.id, user_id: profile.id, rating: attended ? ratingValue : 0, attended });
      toast.success('¡Gracias por tu respuesta!');
      const remaining = pendingRatings.filter(e => e.id !== currentRating.id);
      setPendingRatings(remaining);
      if (remaining.length > 0) {
        setCurrentRating(remaining[0]);
        setRatingValue(0);
        setAttended(null);
      } else {
        setShowRatingModal(false);
        setCurrentRating(null);
      }
      await refresh();
    } catch { toast.error('Error al guardar'); }
  }

  function handleSkip() {
    const remaining = pendingRatings.filter(e => e.id !== currentRating.id);
    setPendingRatings(remaining);
    if (remaining.length > 0) {
      setCurrentRating(remaining[0]);
      setRatingValue(0);
      setAttended(null);
    } else {
      setShowRatingModal(false);
      setCurrentRating(null);
    }
  }

  // Mini calendario
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dayNames = ['D','L','M','X','J','V','S'];

  function getEventsForDay(day) {
    return allEvents.filter(ev => {
      const d = new Date(ev.starts_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const now = new Date();
  const futureEvents = allEvents.filter(e => new Date(e.starts_at) > now);
  const grouped = futureEvents.reduce((acc, ev) => {
    const date = new Date(ev.starts_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(ev);
    return acc;
  }, {});

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Calendario</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>
          {futureEvents.length > 0 ? `${futureEvents.length} próximos eventos` : 'Sin eventos próximos'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mini calendario */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              className="p-1 rounded-lg" style={{ color: '#9090a8' }}
              onMouseEnter={e => e.currentTarget.style.background = '#22222e'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <MdChevronLeft size={20} />
            </button>
            <h2 className="font-semibold text-white text-sm">{monthNames[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              className="p-1 rounded-lg" style={{ color: '#9090a8' }}
              onMouseEnter={e => e.currentTarget.style.background = '#22222e'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <MdChevronRight size={20} />
            </button>
          </div>
          <Card>
            <div className="grid grid-cols-7 mb-1">
              {dayNames.map(d => (
                <div key={d} className="text-center text-xs py-1 font-semibold" style={{ color: '#5a5a70' }}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDay(day);
                const isToday = now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
                const isSelected = selectedDay === day;
                const hasFuture = dayEvents.some(ev => new Date(ev.starts_at) > now);
                const hasPast = dayEvents.some(ev => new Date(ev.starts_at) <= now);
                return (
                  <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                    className="relative p-1 rounded-lg text-xs transition-all min-h-[36px] flex flex-col items-center"
                    style={{
                      background: isSelected ? '#7c6af720' : isToday ? '#7c6af710' : 'transparent',
                      border: `1px solid ${isSelected ? '#7c6af7' : isToday ? '#7c6af740' : 'transparent'}`,
                      color: isToday ? '#7c6af7' : '#e8e8f0',
                    }}>
                    <span>{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasFuture && <div className="w-1 h-1 rounded-full" style={{ background: '#7c6af7' }} />}
                        {hasPast && <div className="w-1 h-1 rounded-full" style={{ background: '#5a5a70' }} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid #2a2a38' }}>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#7c6af7' }} />
                <span className="text-xs" style={{ color: '#5a5a70' }}>Próximo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: '#5a5a70' }} />
                <span className="text-xs" style={{ color: '#5a5a70' }}>Pasado</span>
              </div>
            </div>
          </Card>

          {/* Eventos del día seleccionado */}
          {selectedDay && (
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2 text-white">
                {selectedDay} de {monthNames[month]}
              </p>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm" style={{ color: '#5a5a70' }}>Sin eventos este día</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedDayEvents.map(ev => (
                    <div key={ev.id} className="p-3 rounded-xl flex items-start gap-2"
                      style={{ background: '#1c1c26', border: `1px solid ${TYPE_CONFIG[ev.type]?.color}30` }}>
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: TYPE_CONFIG[ev.type]?.color }} />
                      <div>
                        <p className="text-sm font-medium text-white">{ev.title}</p>
                        <p className="text-xs" style={{ color: '#5a5a70' }}>
                          {formatTime(ev.starts_at)}{ev.ends_at ? ` — ${formatTime(ev.ends_at)}` : ''}
                        </p>
                        {ev.type === 'class' && ev.modality && (
                          <span className="text-xs" style={{ color: MODALITY_CONFIG[ev.modality]?.color }}>
                            {MODALITY_CONFIG[ev.modality]?.label}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista próximos eventos */}
        <div>
          <h2 className="font-semibold text-white mb-3 text-sm">Próximos eventos</h2>
          {loading ? <p style={{ color: '#5a5a70' }}>Cargando...</p> :
          Object.keys(grouped).length === 0 ? (
            <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>No tienes eventos próximos.</p></Card>
          ) : (
            <div className="flex flex-col gap-4">
              {Object.entries(grouped).map(([date, dayEvents]) => (
                <div key={date}>
                  <p className="text-xs font-semibold mb-2 capitalize" style={{ color: '#7c6af7' }}>
                    {formatDate(dayEvents[0].starts_at)}
                  </p>
                  <div className="flex flex-col gap-2">
                    {dayEvents.map(ev => (
                      <Card key={ev.id}>
                        <div className="flex items-start gap-2">
                          <div className="w-1 rounded-full flex-shrink-0 self-stretch"
                            style={{ background: TYPE_CONFIG[ev.type]?.color, minHeight: '36px' }} />
                          <div className="flex-1">
                            <p className="font-semibold text-white text-sm">{ev.title}</p>
                            <div className="flex gap-2 flex-wrap mt-0.5">
                              <span className="text-xs" style={{ color: TYPE_CONFIG[ev.type]?.color }}>
                                {TYPE_CONFIG[ev.type]?.label}
                              </span>
                              {ev.type === 'class' && ev.modality && (
                                <span className="text-xs" style={{ color: MODALITY_CONFIG[ev.modality]?.color }}>
                                  {MODALITY_CONFIG[ev.modality]?.label}
                                </span>
                              )}
                            </div>
                            {ev.description && <p className="text-xs mt-1" style={{ color: '#9090a8' }}>{ev.description}</p>}
                            <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>
                              🕐 {formatTime(ev.starts_at)}{ev.ends_at ? ` — ${formatTime(ev.ends_at)}` : ''}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal evaluación con asistencia */}
      {currentRating && (
        <Modal isOpen={showRatingModal} onClose={handleSkip} title="Evaluación de clase">
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
              <p className="font-semibold text-white mb-1">{currentRating.title}</p>
              <p className="text-sm" style={{ color: '#5a5a70' }}>{formatDate(currentRating.starts_at)}</p>
              {currentRating.type === 'class' && currentRating.modality && (
                <span className="text-xs" style={{ color: MODALITY_CONFIG[currentRating.modality]?.color }}>
                  {MODALITY_CONFIG[currentRating.modality]?.label}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm text-center font-medium text-white">¿Asististe a esta clase?</p>
              <div className="flex gap-3">
                <button onClick={() => setAttended(true)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: attended === true ? '#4ade8020' : '#0f0f13',
                    border: `1px solid ${attended === true ? '#4ade80' : '#333344'}`,
                    color: attended === true ? '#4ade80' : '#9090a8',
                  }}>
                  ✓ Sí asistí
                </button>
                <button onClick={() => { setAttended(false); setRatingValue(0); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: attended === false ? '#f75c6a20' : '#0f0f13',
                    border: `1px solid ${attended === false ? '#f75c6a' : '#333344'}`,
                    color: attended === false ? '#f75c6a' : '#9090a8',
                  }}>
                  ✗ No asistí
                </button>
              </div>
            </div>

            {attended === true && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-center" style={{ color: '#9090a8' }}>¿Cómo estuvo la clase?</p>
                <StarRating value={ratingValue} onChange={setRatingValue} />
              </div>
            )}

            {attended === false && (
              <div className="p-3 rounded-xl text-center" style={{ background: '#f75c6a10', border: '1px solid #f75c6a20' }}>
                <p className="text-sm" style={{ color: '#f75c6a' }}>
                  Solo puedes calificar si asististe a la clase.
                </p>
              </div>
            )}

            {pendingRatings.length > 1 && (
              <p className="text-xs text-center" style={{ color: '#5a5a70' }}>
                {pendingRatings.length - 1} evento{pendingRatings.length > 2 ? 's' : ''} más por evaluar
              </p>
            )}

            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleRate}
                disabled={attended === null || (attended === true && ratingValue === 0)}>
                Enviar
              </Button>
              <Button variant="secondary" onClick={handleSkip}>Omitir</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
