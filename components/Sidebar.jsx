'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/services/authService';
import { useEffect, useState } from 'react';
import { getCourses, getLessonsByCourse } from '@/services/courseService';
import { useAnnouncements } from '@/context/AnnouncementsContext';
import { useCalendar } from '@/context/CalendarContext';
import { supabase } from '@/supabase/client';
import toast from 'react-hot-toast';
import {
  MdDashboard, MdAnnouncement,
  MdLibraryBooks, MdPerson, MdPeople, MdSchool, MdLogout,
  MdCheckCircle, MdRadioButtonUnchecked, MdLock, MdChevronLeft,
  MdAssignment, MdExpandMore, MdExpandLess, MdVisibility,
  MdEvent, MdClose
} from 'react-icons/md';
import Image from 'next/image';

const TYPE_CONFIG = {
  class: { label: '🎵 Clase', color: '#7c6af7' },
  event: { label: '🎉 Evento', color: '#4ade80' },
};
const MODALITY_CONFIG = {
  presential: { label: '🏫 Presencial', color: '#3ca2f7' },
  virtual: { label: '💻 Virtual', color: '#f7a23c' },
};

function formatEventDate(d) {
  const date = new Date(d);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (date.toDateString() === now.toDateString()) return 'Hoy';
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
  return date.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
}
function formatTime(d) {
  return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function formatFullDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function EventPopup({ event, onClose }) {
  if (!event) return null;
  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.class;
  const mod = event.modality ? MODALITY_CONFIG[event.modality] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />
      <div className="relative w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: '#1c1c26', border: `1px solid ${cfg.color}50` }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-white text-lg leading-tight">{event.title}</h3>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: cfg.color + '20', color: cfg.color }}>{cfg.label}</span>
              {mod && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: mod.color + '20', color: mod.color }}>{mod.label}</span>
              )}
              {event.target === 'group' && event.groups?.name && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#7c6af720', color: '#7c6af7' }}>👥 {event.groups.name}</span>
              )}
              {event.target === 'subgroup' && event.subgroups?.name && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#fbbf2420', color: '#fbbf24' }}>🔸 {event.subgroups.name}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg flex-shrink-0"
            style={{ color: '#5a5a70' }}
            onMouseEnter={e => e.currentTarget.style.color = '#e8e8f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#5a5a70'}>
            <MdClose size={20} />
          </button>
        </div>
        <div className="p-3 rounded-xl" style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}>
          <p className="text-sm font-semibold capitalize" style={{ color: cfg.color }}>
            {formatFullDate(event.starts_at)}
          </p>
          <p className="text-sm text-white mt-1">
            🕐 {formatTime(event.starts_at)}
            {event.ends_at ? ` — ${formatTime(event.ends_at)}` : ''}
          </p>
        </div>
        {event.description && (
          <p className="text-sm leading-relaxed" style={{ color: '#9090a8' }}>{event.description}</p>
        )}
      </div>
    </div>
  );
}

function UpcomingEventsList({ events, pendingRatings }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.starts_at) > now).slice(0, 5);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a70' }}>
          Próximos eventos
        </span>
        {pendingRatings > 0 && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: '#fbbf24', color: '#0f0f13' }}>
            🔔 {pendingRatings}
          </span>
        )}
      </div>
      {upcoming.length === 0 ? (
        <p className="text-xs px-3 pb-2" style={{ color: '#3a3a50' }}>Sin eventos próximos</p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {upcoming.map(ev => {
            const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.class;
            return (
              <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                className="flex items-start gap-2 px-3 py-2 rounded-xl text-left transition-all w-full"
                onMouseEnter={e => e.currentTarget.style.background = '#22222e'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: cfg.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#c0c0d0' }}>{ev.title}</p>
                  <p className="text-xs" style={{ color: '#5a5a70' }}>
                    {formatEventDate(ev.starts_at)} · {formatTime(ev.starts_at)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {selectedEvent && <EventPopup event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    try { await logout(); router.push('/login'); }
    catch { toast.error('Error al cerrar sesión'); }
  }

  const sidebarStyle = {
    background: '#16161d',
    borderRight: '1px solid #2a2a38',
    width: '240px',
    flexShrink: 0,
  };

  const lessonMatch = pathname.match(/^\/courses\/([^/]+)\/lessons\/([^/]+)/);
  const isInLesson = !!lessonMatch;
  const activeCourseId = lessonMatch?.[1];
  const activeLessonId = lessonMatch?.[2];

  return (
    <>
      <aside className="hidden md:flex flex-col h-full" style={sidebarStyle}>
        {isInLesson
          ? <LessonSidebar courseId={activeCourseId} lessonId={activeLessonId} profile={profile} onLogout={handleLogout} />
          : <SidebarContent profile={profile} onLogout={handleLogout} />
        }
      </aside>
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={sidebarStyle}>
        {isInLesson
          ? <LessonSidebar courseId={activeCourseId} lessonId={activeLessonId} profile={profile} onLogout={handleLogout} onClose={onClose} />
          : <SidebarContent profile={profile} onLogout={handleLogout} onClose={onClose} />
        }
      </aside>
    </>
  );
}

function LessonSidebar({ courseId, lessonId, profile, onLogout, onClose }) {
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    async function load() {
      const allCourses = await getCourses();
      const found = allCourses.find(c => c.id === courseId);
      setCourse(found);
      const allLessons = await getLessonsByCourse(courseId);
      setLessons(allLessons.filter(l => l.status === 'active'));
      if (profile) {
        const { data } = await supabase
          .from('lesson_progress').select('lesson_id')
          .eq('user_id', profile.id).eq('completed', true);
        setCompleted((data || []).map(d => d.lesson_id));
      }
    }
    load();
  }, [courseId, profile]);

  useEffect(() => {
    function handleUpdate() {
      if (!profile) return;
      supabase.from('lesson_progress').select('lesson_id')
        .eq('user_id', profile.id).eq('completed', true)
        .then(({ data }) => setCompleted((data || []).map(d => d.lesson_id)));
    }
    window.addEventListener('lesson-progress-updated', handleUpdate);
    return () => window.removeEventListener('lesson-progress-updated', handleUpdate);
  }, [profile]);

  const color = course?.color || '#7c6af7';

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 px-3 py-4 mb-4">
        <Image src="/logo.png" alt="Hozvid Academy" width={48} height={48} />
        <span className="font-display font-bold text-white text-sm mt-1">Hozvid Academy</span>
      </div>
      <button onClick={() => { router.push('/courses'); onClose?.(); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium mb-4 transition-all w-full"
        style={{ color: '#9090a8', background: '#22222e' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#e8e8f0'; e.currentTarget.style.background = '#2a2a38'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9090a8'; e.currentTarget.style.background = '#22222e'; }}>
        <MdChevronLeft /> Mis Cursos
      </button>
      {course && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: color + '15' }}>
          <span className="text-xl">{course.icon || '🎵'}</span>
          <span className="text-sm font-semibold text-white leading-tight">{course.title}</span>
        </div>
      )}
      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {lessons.map((l, index) => {
          const isDone = completed.includes(l.id);
          const isActive = l.id === lessonId;
          const now = new Date();
          const lockedByDate = l.unlock_date && new Date(l.unlock_date) > now;
          const lockedByPrev = l.requires_previous && index > 0 && !completed.includes(lessons[index-1].id);
          const isLocked = profile?.role !== 'admin' && (lockedByDate || lockedByPrev);
          return (
            <button key={l.id}
              onClick={() => { if (!isLocked) { router.push('/courses/' + courseId + '/lessons/' + l.id); onClose?.(); } }}
              disabled={isLocked}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all w-full"
              style={{
                background: isActive ? color + '20' : 'transparent',
                border: '1px solid ' + (isActive ? color + '40' : 'transparent'),
                opacity: isLocked ? 0.5 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!isActive && !isLocked) e.currentTarget.style.background = '#22222e'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? color + '20' : 'transparent'; }}>
              {isDone
                ? <MdCheckCircle className="flex-shrink-0 text-lg" style={{ color }} />
                : isLocked
                  ? <MdLock className="flex-shrink-0 text-lg" style={{ color: '#5a5a70' }} />
                  : <MdRadioButtonUnchecked className="flex-shrink-0 text-lg" style={{ color: '#5a5a70' }} />
              }
              <span className="text-sm truncate"
                style={{ color: isActive ? '#e8e8f0' : isDone ? '#9090a8' : isLocked ? '#5a5a70' : '#c0c0d0' }}>
                {l.title}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto pt-4" style={{ borderTop: '1px solid #2a2a38' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: '#7c6af720', color: '#7c6af7' }}>
            {profile?.display_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.display_name}</p>
          </div>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#f87171' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8717120'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <MdLogout className="text-lg" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, onClose, badge }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive ? 'bg-[#7c6af720] text-[#7c6af7]' : 'text-[#9090a8] hover:text-white hover:bg-[#22222e]'
      }`}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
          style={{ background: '#f75c6a', color: 'white' }}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

function StudentViewMenu({ onClose, unreadCount, upcomingEvents, pendingRatings }) {
  const pathname = usePathname();
  const studentPaths = ['/courses', '/profile', '/announcements'];
  const isAnyActive = studentPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
  const [open, setOpen] = useState(isAnyActive);
  const totalPending = unreadCount + pendingRatings;

  return (
    <div>
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full"
        style={{
          background: isAnyActive ? '#7c6af710' : 'transparent',
          color: isAnyActive ? '#7c6af7' : '#9090a8',
        }}
        onMouseEnter={e => { if (!isAnyActive) { e.currentTarget.style.background = '#22222e'; e.currentTarget.style.color = '#e8e8f0'; } }}
        onMouseLeave={e => { if (!isAnyActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9090a8'; } }}>
        <MdVisibility className="text-lg flex-shrink-0" />
        <span className="flex-1 text-left">Vista de alumno</span>
        {totalPending > 0 && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center mr-1"
            style={{ background: '#7c6af7', color: 'white' }}>
            {totalPending > 9 ? '9+' : totalPending}
          </span>
        )}
        {open ? <MdExpandLess className="text-lg" /> : <MdExpandMore className="text-lg" />}
      </button>
      {open && (
        <div className="ml-3 mt-1 flex flex-col gap-1 pl-3" style={{ borderLeft: '1px solid #2a2a38' }}>
          <NavItem href="/courses" icon={<MdLibraryBooks className="text-lg" />} label="Mis Cursos" onClose={onClose} />
          <NavItem href="/profile" icon={<MdPerson className="text-lg" />} label="Mi Perfil" onClose={onClose} />
          <NavItem href="/announcements" icon={<MdAnnouncement className="text-lg" />} label="Anuncios" onClose={onClose} badge={unreadCount} />
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid #2a2a38' }}>
            <UpcomingEventsList events={upcomingEvents} pendingRatings={pendingRatings} />
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarContent({ profile, onLogout, onClose }) {
  const isAdmin = profile?.role === 'admin';
  const { unreadCount } = useAnnouncements();
  const { pendingRatings, upcomingEvents } = useCalendar();

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex flex-col items-center px-3 py-4 mb-4">
        <Image src="/logo.png" alt="Hozvid Academy" width={48} height={48} />
        <span className="font-display font-bold text-white text-sm mt-1">Hozvid Academy</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto pr-1">
        <NavItem href="/dashboard" icon={<MdDashboard className="text-lg" />} label="Dashboard" onClose={onClose} />

        {isAdmin ? (
          <>
            <StudentViewMenu onClose={onClose} unreadCount={unreadCount} upcomingEvents={upcomingEvents} pendingRatings={pendingRatings} />
            <div className="mt-4 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a70' }}>
                Administración
              </span>
            </div>
            <NavItem href="/admin/students" icon={<MdPeople className="text-lg" />} label="Alumnos" onClose={onClose} />
            <NavItem href="/admin/assignments" icon={<MdAssignment className="text-lg" />} label="Asignaciones" onClose={onClose} />
            <NavItem href="/admin/courses" icon={<MdSchool className="text-lg" />} label="Cursos" onClose={onClose} />
            <NavItem href="/admin/announcements" icon={<MdAnnouncement className="text-lg" />} label="Anuncios" onClose={onClose} />
            <NavItem href="/admin/calendar" icon={<MdEvent className="text-lg" />} label="Calendario" onClose={onClose} />
          </>
        ) : (
          <>
            <NavItem href="/courses" icon={<MdLibraryBooks className="text-lg" />} label="Mis Cursos" onClose={onClose} />
            <NavItem href="/profile" icon={<MdPerson className="text-lg" />} label="Mi Perfil" onClose={onClose} />
            <NavItem href="/announcements" icon={<MdAnnouncement className="text-lg" />} label="Anuncios" onClose={onClose} badge={unreadCount} />
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid #2a2a38' }}>
              <UpcomingEventsList events={upcomingEvents} pendingRatings={pendingRatings} />
            </div>
          </>
        )}
      </nav>

      <div className="pt-4 mt-2" style={{ borderTop: '1px solid #2a2a38' }}>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: '#7c6af720', color: '#7c6af7' }}>
            {profile?.display_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.display_name}</p>
            <p className="text-xs truncate" style={{ color: '#5a5a70' }}>
              {profile?.role === 'admin' ? 'Administrador' : 'Alumno'}
            </p>
          </div>
        </div>
        <button onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#f87171' }}
          onMouseEnter={e => e.currentTarget.style.background = '#f8717120'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <MdLogout className="text-lg" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}
