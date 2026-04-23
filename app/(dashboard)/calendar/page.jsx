'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEventsForStudent, rateEvent } from '@/services/calendarService';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  class: { label: '🎵 Clase', color: '#7c6af7' },
  important: { label: '⭐ Fecha importante', color: '#fbbf24' },
};

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="text-3xl transition-all"
          style={{ color: star <= (hover || value) ? '#fbbf24' : '#2a2a38' }}>
          ★
        </button>
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingRatings, setPendingRatings] = useState([]);
  const [currentRating, setCurrentRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  async function load() {
    if (!profile) return;
    const data = await getEventsForStudent(profile.id);
    const now = new Date();

    // Eventos futuros
    const future = data.filter(e => new Date(e.starts_at) > now);
    setEvents(future);

    // Eventos pasados sin calificar
    const past = data.filter(e => {
      const isPast = new Date(e.starts_at) <= now;
      const alreadyRated = e.event_ratings?.some(r => r.user_id === profile.id);
      return isPast && !alreadyRated;
    });
    setPendingRatings(past);

    // Mostrar modal del primer evento pendiente
    if (past.length > 0) {
      setCurrentRating(past[0]);
      setRatingValue(0);
      setShowRatingModal(true);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile]);

  async function handleRate() {
    if (ratingValue === 0) { toast.error('Selecciona una calificación'); return; }
    try {
      await rateEvent({ event_id: currentRating.id, user_id: profile.id, rating: ratingValue });
      toast.success('¡Gracias por tu evaluación!');
      const remaining = pendingRatings.filter(e => e.id !== currentRating.id);
      setPendingRatings(remaining);
      if (remaining.length > 0) {
        setCurrentRating(remaining[0]);
        setRatingValue(0);
      } else {
        setShowRatingModal(false);
        setCurrentRating(null);
      }
    } catch { toast.error('Error al guardar evaluación'); }
  }

  async function handleSkip() {
    const remaining = pendingRatings.filter(e => e.id !== currentRating.id);
    setPendingRatings(remaining);
    if (remaining.length > 0) {
      setCurrentRating(remaining[0]);
      setRatingValue(0);
    } else {
      setShowRatingModal(false);
      setCurrentRating(null);
    }
  }

  // Agrupar por fecha
  const grouped = events.reduce((acc, ev) => {
    const date = new Date(ev.starts_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(ev);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Calendario</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>
          {events.length > 0 ? `${events.length} próximos eventos` : 'Sin eventos próximos'}
        </p>
      </div>

      {loading ? <p style={{ color: '#5a5a70' }}>Cargando...</p> : (
        Object.keys(grouped).length === 0 ? (
          <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>No tienes eventos próximos.</p></Card>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date}>
                <p className="text-sm font-semibold mb-3 capitalize" style={{ color: '#7c6af7' }}>
                  {formatDate(dayEvents[0].starts_at)}
                </p>
                <div className="flex flex-col gap-2">
                  {dayEvents.map(ev => (
                    <Card key={ev.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-1 h-full rounded-full flex-shrink-0 self-stretch"
                          style={{ background: TYPE_CONFIG[ev.type]?.color || '#7c6af7', minHeight: '40px' }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-white">{ev.title}</h3>
                            <span className="text-xs" style={{ color: '#5a5a70' }}>{TYPE_CONFIG[ev.type]?.label}</span>
                          </div>
                          {ev.description && <p className="text-sm mb-1" style={{ color: '#9090a8' }}>{ev.description}</p>}
                          <p className="text-xs" style={{ color: '#5a5a70' }}>
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
        )
      )}

      {/* Modal evaluación */}
      {currentRating && (
        <Modal isOpen={showRatingModal} onClose={handleSkip} title="¿Cómo estuvo la clase?">
          <div className="flex flex-col gap-4 text-center">
            <div className="p-4 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
              <p className="font-semibold text-white mb-1">{currentRating.title}</p>
              <p className="text-sm" style={{ color: '#5a5a70' }}>{formatDate(currentRating.starts_at)}</p>
            </div>
            <p className="text-sm" style={{ color: '#9090a8' }}>
              Califica tu experiencia del 1 al 5 estrellas
            </p>
            <StarRating value={ratingValue} onChange={setRatingValue} />
            {pendingRatings.length > 1 && (
              <p className="text-xs" style={{ color: '#5a5a70' }}>
                {pendingRatings.length - 1} evento{pendingRatings.length > 2 ? 's' : ''} más por evaluar
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleRate}>Enviar evaluación</Button>
              <Button variant="secondary" onClick={handleSkip}>Omitir</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
