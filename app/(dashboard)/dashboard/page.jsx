'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCalendar } from '@/context/CalendarContext';
import { getCourses } from '@/services/courseService';
import { getAllStudents } from '@/services/userService';
import { getEventsForStudent, rateEvent } from '@/services/calendarService';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { MdSchool, MdPeople } from 'react-icons/md';
import toast from 'react-hot-toast';

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

const MODALITY_CONFIG = {
  presential: { label: '🏫 Presencial', color: '#3ca2f7' },
  virtual: { label: '💻 Virtual', color: '#f7a23c' },
};

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' });
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { refresh } = useCalendar();
  const router = useRouter();
  const [stats, setStats] = useState({ courses: 0, students: 0 });
  const [myCourses, setMyCourses] = useState([]);
  const isAdmin = profile?.role === 'admin';

  // Evaluaciones pendientes
  const [pendingRatings, setPendingRatings] = useState([]);
  const [currentRating, setCurrentRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [attended, setAttended] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    async function load() {
      const courses = await getCourses();
      if (isAdmin) {
        const students = await getAllStudents();
        setStats({ courses: courses.length, students: students.length });
        setMyCourses(courses.filter(c => c.status === 'active').slice(0, 4));
      } else {
        const active = courses.filter(c => c.status === 'active');
        setMyCourses(active.slice(0, 4));
        setStats({ courses: active.length });

        // Cargar eventos pasados sin evaluar
        const data = await getEventsForStudent(profile.id);
        const now = new Date();
        const past = data.filter(e => {
          const isPast = new Date(e.starts_at) <= now;
          const alreadyRated = e.event_ratings?.some(r => r.user_id === profile.id);
          return isPast && !alreadyRated;
        });
        if (past.length > 0) {
          setPendingRatings(past);
          setCurrentRating(past[0]);
          setRatingValue(0);
          setAttended(null);
          setShowRatingModal(true);
        }
      }
    }
    if (profile) load();
  }, [profile, isAdmin]);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-white mb-1">
          {greeting}, {profile?.display_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm" style={{ color: '#5a5a70' }}>
          {isAdmin ? 'Panel de administración' : 'Bienvenido a tu plataforma'}
        </p>
      </div>

      <div className={`grid gap-4 mb-8 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <StatCard icon={<MdSchool />} label={isAdmin ? 'Total Cursos' : 'Mis Cursos'}
          value={stats.courses} color="#7c6af7" />
        {isAdmin && <StatCard icon={<MdPeople />} label="Alumnos"
          value={stats.students} color="#4ade80" />}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white text-lg">
            {isAdmin ? 'Cursos recientes' : 'Mis cursos'}
          </h2>
          <button onClick={() => router.push(isAdmin ? '/admin/courses' : '/courses')}
            className="text-sm" style={{ color: '#7c6af7' }}>
            Ver todos →
          </button>
        </div>
        {myCourses.length === 0 ? (
          <Card>
            <p className="text-center py-8" style={{ color: '#5a5a70' }}>
              {isAdmin ? 'No hay cursos creados aún.' : 'No tienes cursos asignados.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myCourses.map(course => (
              <Card key={course.id} hover
                onClick={() => router.push(isAdmin ? '/admin/courses' : '/courses')}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: (course.color || '#7c6af7') + '20' }}>
                    {course.icon || '🎵'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{course.title}</h3>
                    <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>
                      {course.description || 'Sin descripción'}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal evaluación — aparece al entrar al dashboard */}
      {currentRating && (
        <Modal isOpen={showRatingModal} onClose={handleSkip} title="Evaluación de clase">
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
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className="font-bold text-3xl text-white">{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{label}</p>
    </Card>
  );
}
