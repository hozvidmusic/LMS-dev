'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLessonsByCourse, getContentsByLesson } from '@/services/courseService';
import Card from '@/components/ui/Card';
import { MdChevronLeft, MdChevronRight, MdFolder } from 'react-icons/md';

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState(null);
  const [contents, setContents] = useState([]);

  useEffect(() => {
    async function load() {
      const lessons = await getLessonsByCourse(courseId);
      const found = lessons.find(l => l.id === lessonId);
      setLesson(found);
      if (found) {
        const all = await getContentsByLesson(lessonId);
        setContents(all.filter(c => c.status === 'active'));
      }
    }
    load();
  }, [courseId, lessonId]);

  if (!lesson) return <div style={{ color: '#5a5a70' }}>Cargando lección...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push('/courses')}
        className="flex items-center gap-1 text-sm mb-6 transition-colors"
        style={{ color: '#9090a8' }}
        onMouseEnter={e => e.currentTarget.style.color = '#7c6af7'}
        onMouseLeave={e => e.currentTarget.style.color = '#9090a8'}>
        <MdChevronLeft /> Volver a cursos
      </button>

      <h1 className="font-display font-bold text-2xl text-white mb-2">{lesson.title}</h1>
      {lesson.description && (
        <p className="text-sm mb-6" style={{ color: '#5a5a70' }}>{lesson.description}</p>
      )}

      <div className="flex flex-col gap-3">
        {contents.length === 0 ? (
          <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>
            Esta lección no tiene contenidos disponibles.
          </p></Card>
        ) : contents.map(content => (
          <Card key={content.id} hover
            onClick={() => router.push(`/courses/${courseId}/lessons/${lessonId}/contents/${content.id}`)}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: '#7c6af720' }}>
                <MdFolder style={{ color: '#7c6af7' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{content.title}</p>
                {content.description && (
                  <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{content.description}</p>
                )}
              </div>
              <MdChevronRight style={{ color: '#5a5a70' }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
