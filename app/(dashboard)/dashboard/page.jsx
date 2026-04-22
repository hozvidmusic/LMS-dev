'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourses } from '@/services/courseService';
import { getAllStudents } from '@/services/userService';
import Card from '@/components/ui/Card';
import { MdSchool, MdPeople, MdMusicNote, MdTrendingUp } from 'react-icons/md';

export default function Dashboard() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ courses: 0, students: 0 });
  const [myCourses, setMyCourses] = useState([]);
  const isAdmin = profile?.role === 'admin';

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
      }
    }
    if (profile && !loading) load();
  }, [profile, isAdmin, loading]);

  if (loading || !profile) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-white mb-1">
          {greeting}, {profile?.display_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm" style={{ color: '#5a5a70' }}>
          {isAdmin ? 'Panel de administración' : `${profile?.instrument || 'Estudiante'} · ${profile?.level || ''}`}
        </p>
      </div>

      <div className={`grid gap-4 mb-8 ${isAdmin ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
        <StatCard icon={<MdSchool />} label={isAdmin ? 'Total Cursos' : 'Mis Cursos'}
          value={stats.courses} color="#7c6af7" />
        {isAdmin && <StatCard icon={<MdPeople />} label="Alumnos"
          value={stats.students} color="#4ade80" />}
        <StatCard icon={<MdMusicNote />} label="Instrumento"
          value={profile?.instrument || '—'} color="#fbbf24" isText />
        <StatCard icon={<MdTrendingUp />} label="Nivel"
          value={profile?.level || '—'} color="#60a5fa" isText />
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: (course.color || '#7c6af7') + '20' }}>
                    <span className="text-xl">{course.icon || '🎵'}</span>
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
    </div>
  );
}

function StatCard({ icon, label, value, color, isText }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className={`font-bold ${isText ? 'text-lg' : 'text-3xl'} text-white`}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{label}</p>
    </Card>
  );
}
