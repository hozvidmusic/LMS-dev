'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourses, getLessonsByCourse } from '@/services/courseService';
import { getCoursesForStudent } from '@/services/assignmentService';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import { MdChevronRight, MdCheckCircle } from 'react-icons/md';

export default function CoursesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      const all = await getCourses();
      const active = all.filter(c => c.status === 'active');
      if (profile.role === 'admin') {
        setCourses(active);
      } else {
        const ids = await getCoursesForStudent(profile.id);
        console.log('ids:', ids, 'active:', active.map(c => c.id));
        setCourses(active.filter(c => ids.includes(c.id)));
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  if (loading) return (
    <div className="flex flex-col gap-4">
      {[1,2,3].map(i => (
        <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: '#1c1c26' }} />
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-2xl text-white mb-6">Mis Cursos</h1>
      {courses.length === 0 ? (
        <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>
          No tienes cursos asignados aún.
        </p></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} profile={profile} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, profile, router }) {
  const [lessons, setLessons] = useState([]);
  const [completed, setCompleted] = useState([]);
  const color = course.color || '#7c6af7';

  useEffect(() => {
    async function load() {
      const all = await getLessonsByCourse(course.id);
      setLessons(all.filter(l => l.status === 'active'));
      const { data } = await supabase
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', profile.id)
        .eq('completed', true);
      setCompleted((data || []).map(d => d.lesson_id));
    }
    load();
  }, [course.id, profile.id]);

  const completedCount = lessons.filter(l => completed.includes(l.id)).length;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
          style={{ background: color + '25' }}>
          {course.icon || '🎵'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-white text-lg">{course.title}</h2>
          </div>
          {course.description && (
            <p className="text-sm" style={{ color: '#5a5a70' }}>{course.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 mb-4">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: '#2a2a38' }}>
              <div className="h-full rounded-full transition-all"
                style={{ background: color, width: lessons.length > 0 ? `${(completedCount / lessons.length) * 100}%` : '0%' }} />
            </div>
            <span className="text-xs" style={{ color: '#9090a8' }}>
              {completedCount}/{lessons.length} lecciones
            </span>
          </div>
          {lessons.length > 0 && (
            <div className="flex flex-col gap-2">
              {lessons.map(lesson => {
                const isCompleted = completed.includes(lesson.id);
                return (
                  <button key={lesson.id}
                    onClick={() => router.push(`/courses/${course.id}/lessons/${lesson.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl text-left transition-all w-full"
                    style={{ background: '#0f0f13', border: `1px solid ${isCompleted ? color + '40' : '#2a2a38'}` }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = isCompleted ? color + '40' : '#2a2a38'}>
                    <div className="flex items-center gap-2">
                      {isCompleted
                        ? <MdCheckCircle style={{ color }} />
                        : <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: '#5a5a70' }} />
                      }
                      <span className="text-sm" style={{ color: isCompleted ? '#e8e8f0' : '#c0c0d0' }}>
                        {lesson.title}
                      </span>
                    </div>
                    <MdChevronRight style={{ color: '#5a5a70' }} />
                  </button>
                );
              })}
            </div>
          )}>Evaluaciones del curso</p>
              {courseEvals.map(ev => (
                <button key={ev.id}
                  onClick={() => router.push(`/evaluations/${ev.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl text-left transition-all w-full"
                  style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a38'}>
                  <div className="flex items-center gap-2">
                    <span>📝</span>
                    <span className="text-sm" style={{ color: '#c0c0d0' }}>{ev.title}</span>
                  </div>
                  <MdChevronRight style={{ color: '#5a5a70' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
