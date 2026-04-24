'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCalendar } from '@/context/CalendarContext';
import { getEventsForStudent, rateEvent } from '@/services/calendarService';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

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

export default function EventRatingModal() {
  const { profile } = useAuth();
  const { refresh } = useCalendar();
  const [pendingRatings, setPendingRatings] = useState([]);
  const [currentRating, setCurrentRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [attended, setAttended] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile || loaded) return;
    async function load() {
      const data = await getEventsForStudent(profile.id);
      const now = new Date();
      const past = data.filter(e => {
        const isPast = e.ends_at ? new Date(e.ends_at) <= now : new Date(e.starts_at) <= now;
        const alreadyRated = e.event_ratings?.some(r => r.user_id === profile.id);
        return isPast && !alreadyRated;
      });
      if (past.length > 0) {
        setPendingRatings(past);
        setCurrentRating(past[0]);
        setRatingValue(0);
        setAttended(null);
        setShowModal(true);
      }
      setLoaded(true);
    }
    load();
  }, [profile, loaded]);

  async function handleRate() {
    if (attended === null) { toast.error('¿Asististe al evento?'); return; }
    if (attended && ratingValue === 0) { toast.error('Selecciona una calificación'); return; }
    try {
      await rateEvent({ event_id: currentRating.id, user_id: profile.id, rating: attended ? ratingValue : 0, attended: attended });
      toast.success('¡Gracias por tu respuesta!');
      const remaining = pendingRatings.filter(e => e.id !== currentRating.id);
      setPendingRatings(remaining);
      if (remaining.length > 0) {
        setCurrentRating(remaining[0]);
        setRatingValue(0);
        setAttended(null);
      } else {
        setShowModal(false);
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
      setShowModal(false);
      setCurrentRating(null);
    }
  }

  if (!currentRating) return null;

  return (
    <Modal isOpen={showModal} onClose={handleSkip} title="Evaluación de clase">
      <div className="flex flex-col gap-4">
        <div className="p-4 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
          <p className="font-semibold text-white mb-1">{currentRating.title}</p>
          <p className="text-sm" style={{ color: '#5a5a70' }}>{formatDate(currentRating.starts_at)}</p>
          {currentRating.modality && (
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
              }}>✓ Sí asistí</button>
            <button onClick={() => { setAttended(false); setRatingValue(0); }}
              className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
              style={{
                background: attended === false ? '#f75c6a20' : '#0f0f13',
                border: `1px solid ${attended === false ? '#f75c6a' : '#333344'}`,
                color: attended === false ? '#f75c6a' : '#9090a8',
              }}>✗ No asistí</button>
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
            <p className="text-sm" style={{ color: '#f75c6a' }}>Solo puedes calificar si asististe.</p>
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
  );
}
