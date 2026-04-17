'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourses, getLessonsByCourse } from '@/services/courseService';
import { getCoursesForStudent } from '@/services/assignmentService';
import Card from '@/components/ui/Card';
import { MdSchool, MdChevronRight } from 'react-icons/md';

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
            <CourseCard key={course.id} course={course} router={router} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, router }) {
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    getLessonsByCourse(course.id)
      .then(all => setLessons(all.filter(l => l.status === 'active')));
  }, [course.id]);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#7c6af720' }}>
          <MdSchool className="text-2xl" style={{ color: '#7c6af7' }} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white text-lg">{course.title}</h2>
          {course.description && (
            <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{course.description}</p>
          )}
          <p className="text-xs mt-2" style={{ color: '#9090a8' }}>
            {lessons.length} lección{lessons.length !== 1 ? 'es' : ''}
          </p>
          {lessons.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {lessons.map(lesson => (
                <button key={lesson.id}
                  onClick={() => router.push(`/courses/${course.id}/lessons/${lesson.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl text-left transition-all w-full"
                  style={{ background: '#0f0f13', border: '1px solid #2a2a38' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#7c6af7'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a38'}>
                  <span className="text-sm text-white">{lesson.title}</span>
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
