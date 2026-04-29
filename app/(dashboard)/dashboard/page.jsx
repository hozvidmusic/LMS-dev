'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCalendar } from '@/context/CalendarContext';
import { getCourses, getLessonsByCourse } from '@/services/courseService';
import { getCoursesForStudent } from '@/services/assignmentService';
import { getAllStudents } from '@/services/userService';
import { getGroups, getAllSubgroups } from '@/services/groupService';
import { getEventsForStudent, rateEvent } from '@/services/calendarService';
import { getAdminClient } from '@/supabase/adminClient';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { MdSchool, MdPeople, MdTrendingUp, MdStar, MdWarning } from 'react-icons/md';
import toast from 'react-hot-toast';

const supabaseAdmin = getAdminClient();

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

function StatCard({ icon, label, value, color, sub }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: color + '20', color }}>
          {icon}
        </div>
      </div>
      <p className="font-bold text-3xl text-white">{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{label}</p>
      {sub && <p className="text-xs mt-1 font-medium" style={{ color }}>{sub}</p>}
    </Card>
  );
}

function ProgressBar({ value, color }) {
  return (
    <div className="flex-1 h-1.5 rounded-full" style={{ background: '#2a2a38' }}>
      <div className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(value, 100)}%`, background: color || '#7c6af7' }} />
    </div>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { refresh } = useCalendar();
  const router = useRouter();
  const isAdmin = profile?.role === 'admin';

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [myCourses, setMyCourses] = useState([]);
  const [studentStats, setStudentStats] = useState({ courses: 0 });
  const [pendingRatings, setPendingRatings] = useState([]);
  const [currentRating, setCurrentRating] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [attended, setAttended] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if (isAdmin) loadAdminStats();
    else loadStudentView();
  }, [profile, isAdmin]);

  async function loadAdminStats() {
    setLoadingStats(true);
    try {
      const [courses, students, groups, subgroups] = await Promise.all([
        getCourses(), getAllStudents(), getGroups(), getAllSubgroups(),
      ]);
      const activeCourses = courses.filter(c => c.status === 'active');
      const activeStudents = students.filter(s => s.status === 'active' && s.role === 'student');

      const courseProgress = await Promise.all(activeCourses.map(async course => {
        const lessons = await getLessonsByCourse(course.id);
        const activeL = lessons.filter(l => l.status === 'active');
        if (!activeL.length) return { ...course, avgProgress: 0, completions: 0, totalLessons: 0 };
        const { data: progress } = await supabaseAdmin
          .from('lesson_progress').select('user_id, lesson_id')
          .in('lesson_id', activeL.map(l => l.id)).eq('completed', true);
        const completions = progress?.length || 0;
        const maxPossible = activeL.length * activeStudents.length;
        const avgProgress = maxPossible > 0 ? Math.round((completions / maxPossible) * 100) : 0;
        return { ...course, avgProgress, completions, totalLessons: activeL.length };
      }));

      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data: recentProgress } = await supabaseAdmin
        .from('lesson_progress').select('user_id, created_at')
        .gte('created_at', since.toISOString()).eq('completed', true);
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const activeThisWeek = (authUsers?.users || []).filter(u => {
        if (!u.last_sign_in_at) return false;
        const isStudent = activeStudents.some(s => s.id === u.id);
        return isStudent && new Date(u.last_sign_in_at) >= since;
      }).length;

      const since14 = new Date();
      since14.setDate(since14.getDate() - 14);
      const recentUserIds = new Set(
        (authUsers?.users || []).filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= since14).map(u => u.id)
      );
      const inactiveStudents = activeStudents.filter(s => !recentUserIds.has(s.id));

      const groupProgress = await Promise.all(groups.map(async group => {
        const { data: members } = await supabaseAdmin
          .from('profile_groups').select('user_id').eq('group_id', group.id);
        const memberIds = (members || []).map(m => m.user_id);
        if (!memberIds.length) return { ...group, memberCount: 0, activeCount: 0, avgProgress: 0 };
        const { data: gProgress } = await supabaseAdmin
          .from('lesson_progress').select('user_id')
          .in('user_id', memberIds).eq('completed', true).gte('created_at', since.toISOString());
        const activeInGroup = new Set(gProgress?.map(p => p.user_id) || []).size;
        return { ...group, memberCount: memberIds.length, activeCount: activeInGroup,
          avgProgress: memberIds.length > 0 ? Math.round((activeInGroup / memberIds.length) * 100) : 0 };
      }));

      const { data: topProgress } = await supabaseAdmin
        .from('lesson_progress').select('user_id').eq('completed', true);
      const countByUser = {};
      (topProgress || []).forEach(p => { countByUser[p.user_id] = (countByUser[p.user_id] || 0) + 1; });
      const topStudents = activeStudents
        .map(s => ({ ...s, completions: countByUser[s.id] || 0 }))
        .sort((a, b) => b.completions - a.completions).slice(0, 5);

      setStats({
        totalCourses: activeCourses.length, totalStudents: activeStudents.length,
        totalGroups: groups.length, totalSubgroups: subgroups.length,
        activeThisWeek, inactiveStudents: inactiveStudents.slice(0, 5),
        courseProgress: courseProgress.sort((a, b) => b.avgProgress - a.avgProgress),
        groupProgress: groupProgress.sort((a, b) => b.avgProgress - a.avgProgress),
        topStudents, weeklyCompletions: recentProgress?.length || 0,
      });
    } catch (err) { console.error(err); }
    finally { setLoadingStats(false); }
  }

  async function loadStudentView() {
    const courses = await getCourses();
    const ids = await getCoursesForStudent(profile.id);
    const active = courses.filter(c => c.status === 'active' && ids.includes(c.id));
    setMyCourses(active.slice(0, 4));
    setStudentStats({ courses: active.length });
    const data = await getEventsForStudent(profile.id, profile.role);
    const now = new Date();
    const past = data.filter(e => {
      const isPast = new Date(e.starts_at) <= now;
      const alreadyRated = e.event_ratings?.some(r => r.user_id === profile.id);
      return isPast && !alreadyRated;
    });
    if (past.length > 0 && !showRatingModal) {
      setPendingRatings(past);
      setCurrentRating(past[0]);
      setRatingValue(0);
      setAttended(null);
      setShowRatingModal(true);
    }
  }

  async function handleRate() {
    if (attended === null) { toast.error('Asististe al evento?'); return; }
    if (attended && ratingValue === 0) { toast.error('Selecciona una calificacion'); return; }
    try {
      await rateEvent({ event_id: currentRating.id, user_id: profile.id, rating: attended ? ratingValue : 0, attended });
      toast.success('Gracias por tu respuesta!');
      const remaining = pendingRatings.filter(e => e.id !== currentRating.id);
      setPendingRatings(remaining);
      if (remaining.length > 0) { setCurrentRating(remaining[0]); setRatingValue(0); setAttended(null); }
      else { setShowRatingModal(false); setCurrentRating(null); }
    } catch { toast.error('Error al guardar'); }
  }

  function handleSkip() {
    const remaining = pendingRatings.filter(e => e.id !== currentRating.id);
    setPendingRatings(remaining);
    if (remaining.length > 0) { setCurrentRating(remaining[0]); setRatingValue(0); setAttended(null); }
    else { setShowRatingModal(false); setCurrentRating(null); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  if (!isAdmin) return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-white mb-1">
          {greeting}, {profile?.display_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm" style={{ color: '#5a5a70' }}>Bienvenido a tu plataforma</p>
      </div>
      <div className="grid gap-4 mb-8 grid-cols-1">
        <StatCard icon={<MdSchool />} label="Mis Cursos" value={studentStats.courses} color="#7c6af7" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white text-lg">Mis cursos</h2>
          <button onClick={() => router.push('/courses')} className="text-sm" style={{ color: '#7c6af7' }}>Ver todos</button>
        </div>
        {myCourses.length === 0
          ? <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>No tienes cursos asignados.</p></Card>
          : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myCourses.map(course => (
                <Card key={course.id} hover onClick={() => router.push('/courses')}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background: (course.color || '#7c6af7') + '20' }}>
                      {course.icon || '🎵'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{course.title}</h3>
                      <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>{course.description || 'Sin descripcion'}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>}
      </div>
      {currentRating && (
        <Modal isOpen={showRatingModal} onClose={handleSkip} title="Evaluacion de clase">
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
              <p className="font-semibold text-white mb-1">{currentRating.title}</p>
              <p className="text-sm" style={{ color: '#5a5a70' }}>{formatDate(currentRating.starts_at)}</p>
              {currentRating.modality && <span className="text-xs" style={{ color: MODALITY_CONFIG[currentRating.modality]?.color }}>{MODALITY_CONFIG[currentRating.modality]?.label}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-center font-medium text-white">Asististe a esta clase?</p>
              <div className="flex gap-3">
                <button onClick={() => setAttended(true)} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: attended === true ? '#4ade8020' : '#0f0f13', border: `1px solid ${attended === true ? '#4ade80' : '#333344'}`, color: attended === true ? '#4ade80' : '#9090a8' }}>Si asisti</button>
                <button onClick={() => { setAttended(false); setRatingValue(0); }} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: attended === false ? '#f75c6a20' : '#0f0f13', border: `1px solid ${attended === false ? '#f75c6a' : '#333344'}`, color: attended === false ? '#f75c6a' : '#9090a8' }}>No asisti</button>
              </div>
            </div>
            {attended === true && <div className="flex flex-col gap-2"><p className="text-sm text-center" style={{ color: '#9090a8' }}>Como estuvo la clase?</p><StarRating value={ratingValue} onChange={setRatingValue} /></div>}
            {attended === false && <div className="p-3 rounded-xl text-center" style={{ background: '#f75c6a10', border: '1px solid #f75c6a20' }}><p className="text-sm" style={{ color: '#f75c6a' }}>Solo puedes calificar si asististe.</p></div>}
            {pendingRatings.length > 1 && <p className="text-xs text-center" style={{ color: '#5a5a70' }}>{pendingRatings.length - 1} evento mas por evaluar</p>}
            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleRate} disabled={attended === null || (attended === true && ratingValue === 0)}>Enviar</Button>
              <Button variant="secondary" onClick={handleSkip}>Omitir</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-white mb-1">
          {greeting}, {profile?.display_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm" style={{ color: '#5a5a70' }}>Panel de administracion</p>
      </div>
      {loadingStats ? (
        <div className="flex items-center justify-center py-20">
          <p style={{ color: '#5a5a70' }}>Cargando estadisticas...</p>
        </div>
      ) : stats && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<MdSchool />} label="Cursos activos" value={stats.totalCourses} color="#7c6af7" />
            <StatCard icon={<MdPeople />} label="Alumnos activos" value={stats.totalStudents} color="#4ade80" />
            <StatCard icon={<MdTrendingUp />} label="Activos esta semana" value={stats.activeThisWeek}
              color="#fbbf24" sub={`${stats.totalStudents > 0 ? Math.round((stats.activeThisWeek/stats.totalStudents)*100) : 0}% del total`} />
            <StatCard icon={<MdStar />} label="Lecciones completadas" value={stats.weeklyCompletions} color="#f75c6a" sub="Ultimos 7 dias" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-lg mb-4">Progreso por curso</h2>
            <div className="flex flex-col gap-3">
              {stats.courseProgress.length === 0
                ? <Card><p className="text-center py-4" style={{ color: '#5a5a70' }}>No hay cursos activos.</p></Card>
                : stats.courseProgress.map(course => (
                  <Card key={course.id}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                        style={{ background: (course.color || '#7c6af7') + '20' }}>{course.icon || '🎵'}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-white">{course.title}</p>
                          <p className="text-sm font-bold" style={{ color: course.color || '#7c6af7' }}>{course.avgProgress}%</p>
                        </div>
                        <ProgressBar value={course.avgProgress} color={course.color || '#7c6af7'} />
                        <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>{course.completions} lecciones completadas · {course.totalLessons} totales</p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-lg mb-4">Actividad por grupo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.groupProgress.length === 0
                ? <Card><p className="text-center py-4" style={{ color: '#5a5a70' }}>No hay grupos creados.</p></Card>
                : stats.groupProgress.map(group => (
                  <Card key={group.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">{group.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#7c6af720', color: '#7c6af7' }}>{group.memberCount} alumnos</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={group.avgProgress} color="#4ade80" />
                      <p className="text-sm font-bold flex-shrink-0" style={{ color: '#4ade80' }}>{group.activeCount} activos</p>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#5a5a70' }}>esta semana</p>
                  </Card>
                ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="font-display font-semibold text-white text-lg mb-4">Top alumnos</h2>
              <Card>
                <div className="flex flex-col gap-3">
                  {stats.topStudents.length === 0
                    ? <p className="text-center py-4 text-sm" style={{ color: '#5a5a70' }}>Sin actividad aun.</p>
                    : stats.topStudents.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: i === 0 ? '#fbbf2420' : '#2a2a38', color: i === 0 ? '#fbbf24' : '#5a5a70' }}>{i + 1}</div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: '#7c6af720', color: '#7c6af7' }}>{s.display_name?.[0]?.toUpperCase()}</div>
                        <div className="flex-1">
                          <p className="text-sm text-white">{s.display_name}</p>
                          <p className="text-xs" style={{ color: '#5a5a70' }}>@{s.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: '#7c6af7' }}>{s.completions}</p>
                          <p className="text-xs" style={{ color: '#5a5a70' }}>lecciones</p>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
            <div>
              <h2 className="font-display font-semibold text-white text-lg mb-4">Alumnos inactivos +14 dias</h2>
              <Card>
                <div className="flex flex-col gap-3">
                  {stats.inactiveStudents.length === 0
                    ? <p className="text-center py-4 text-sm" style={{ color: '#4ade80' }}>Todos los alumnos estan activos</p>
                    : stats.inactiveStudents.map(s => (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: '#f75c6a20', color: '#f75c6a' }}>{s.display_name?.[0]?.toUpperCase()}</div>
                        <div className="flex-1">
                          <p className="text-sm text-white">{s.display_name}</p>
                          <p className="text-xs" style={{ color: '#5a5a70' }}>@{s.username}</p>
                        </div>
                        <MdWarning style={{ color: '#f75c6a', flexShrink: 0 }} />
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
