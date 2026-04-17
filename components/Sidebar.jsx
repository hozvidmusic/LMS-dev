'use client';
import Link from 'next/link';
import { usePathname, useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/services/authService';
import { useEffect, useState } from 'react';
import { getCourses, getLessonsByCourse } from '@/services/courseService';
import { supabase } from '@/supabase/client';
import toast from 'react-hot-toast';
import { MdDashboard, MdLibraryBooks, MdPerson, MdPeople, MdSchool, MdLogout, MdCheckCircle, MdRadioButtonUnchecked, MdChevronLeft, MdGroups } from 'react-icons/md';
import Image from 'next/image';

export default function Sidebar({ isOpen, onClose }) {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await logout();
      router.push('/login');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  }

  const sidebarStyle = {
    background: '#16161d',
    borderRight: '1px solid #2a2a38',
    width: '240px',
    flexShrink: 0,
  };

  // Detectar si estamos dentro de una lección
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
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', profile.id)
          .eq('completed', true);
        setCompleted((data || []).map(d => d.lesson_id));
      }
    }
    load();
  }, [courseId, profile]);

  const color = course?.color || '#7c6af7';

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 px-3 py-4 mb-4">
        <Image src="/logo.png" alt="Hozvid Academy" width={32} height={32} />
        <span className="font-display font-bold text-white text-lg">Hozvid</span>
      </div>

      <button onClick={() => { router.push('/courses'); onClose?.(); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium mb-4 transition-all w-full"
        style={{ color: '#9090a8', background: '#22222e' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#e8e8f0'; e.currentTarget.style.background = '#2a2a38'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9090a8'; e.currentTarget.style.background = '#22222e'; }}>
        <MdChevronLeft /> Mis Cursos
      </button>

      {course && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-xl"
          style={{ background: color + '15' }}>
          <span className="text-xl">{course.icon || '🎵'}</span>
          <span className="text-sm font-semibold text-white leading-tight">{course.title}</span>
        </div>
      )}

      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
        {lessons.map(l => {
          const isDone = completed.includes(l.id);
          const isActive = l.id === lessonId;
          return (
            <button key={l.id}
              onClick={() => { router.push(`/courses/${courseId}/lessons/${l.id}`); onClose?.(); }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all w-full"
              style={{
                background: isActive ? color + '20' : 'transparent',
                border: `1px solid ${isActive ? color + '40' : 'transparent'}`,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#22222e'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
              {isDone
                ? <MdCheckCircle className="flex-shrink-0 text-lg" style={{ color }} />
                : <MdRadioButtonUnchecked className="flex-shrink-0 text-lg" style={{ color: '#5a5a70' }} />
              }
              <span className="text-sm truncate"
                style={{ color: isActive ? '#e8e8f0' : isDone ? '#9090a8' : '#c0c0d0' }}>
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

function NavItem({ href, icon, label, onClose }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        isActive ? 'bg-[#7c6af720] text-[#7c6af7]' : 'text-[#9090a8] hover:text-white hover:bg-[#22222e]'
      }`}>
      {icon} {label}
    </Link>
  );
}

function SidebarContent({ profile, onLogout, onClose }) {
  const isAdmin = profile?.role === 'admin';
  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-2 px-3 py-4 mb-6">
        <Image src="/logo.png" alt="Hozvid Academy" width={32} height={32} />
        <span className="font-display font-bold text-white text-lg">Hozvid</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        <NavItem href="/dashboard" icon={<MdDashboard className="text-lg" />} label="Dashboard" onClose={onClose} />
        <NavItem href="/courses" icon={<MdLibraryBooks className="text-lg" />} label="Mis Cursos" onClose={onClose} />
        <NavItem href="/profile" icon={<MdPerson className="text-lg" />} label="Mi Perfil" onClose={onClose} />
        {isAdmin && (
          <>
            <div className="mt-6 mb-2 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5a5a70' }}>
                Administración
              </span>
            </div>
            <NavItem href="/admin/students" icon={<MdPeople className="text-lg" />} label="Alumnos" onClose={onClose} />
            <NavItem href="/admin/groups" icon={<MdGroups className="text-lg" />} label="Grupos" onClose={onClose} />
            <NavItem href="/admin/courses" icon={<MdSchool className="text-lg" />} label="Cursos" onClose={onClose} />
          </>
        )}
      </nav>
      <div className="mt-auto pt-4" style={{ borderTop: '1px solid #2a2a38' }}>
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
