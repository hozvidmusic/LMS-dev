'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourses, getLessonsByCourse, getContentsByLesson, getItemsByContent } from '@/services/courseService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import { MdCheckCircle, MdChevronLeft, MdExpandMore, MdExpandLess, MdRadioButtonUnchecked } from 'react-icons/md';

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

function ItemRenderer({ item }) {
  const url = item.file_url || item.value;
  switch (item.type) {
    case 'text':
      return <div className="text-sm leading-relaxed" style={{ color: '#c0c0d0' }}
        dangerouslySetInnerHTML={{ __html: item.value }} />;
    case 'youtube': {
      const videoId = extractYoutubeId(item.value);
      return videoId ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe className="absolute inset-0 w-full h-full rounded-xl"
            src={`https://www.youtube.com/embed/${videoId}`} allowFullScreen title={item.title} />
        </div>
      ) : <p style={{ color: '#f87171' }}>URL de YouTube inválida</p>;
    }
    case 'image':
      return <img src={url} alt={item.title} className="w-full rounded-xl object-contain max-h-96" />;
    case 'audio':
      return <audio controls className="w-full" src={url} />;
    case 'video':
      return <video controls className="w-full rounded-xl" src={url} />;
    case 'pdf':
      return <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
        📄 Ver PDF
      </a>;
    case 'link':
      return <a href={item.value} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
        🔗 Abrir enlace
      </a>;
    case 'file':
      return <a href={item.file_url} download target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
        ⬇️ Descargar {item.file_name || 'archivo'}
      </a>;
    default: return null;
  }
}

function ContentBlock({ content, defaultOpen }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (defaultOpen) loadItems();
  }, []);

  async function loadItems() {
    if (loaded) return;
    const data = await getItemsByContent(content.id);
    setItems(data.filter(i => i.status === 'active'));
    setLoaded(true);
  }

  async function handleToggle() {
    if (!loaded) await loadItems();
    setExpanded(p => !p);
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #2a2a38' }}>
      <button onClick={handleToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all"
        style={{ background: expanded ? '#1c1c26' : '#16161f' }}
        onMouseEnter={e => e.currentTarget.style.background = '#1c1c26'}
        onMouseLeave={e => e.currentTarget.style.background = expanded ? '#1c1c26' : '#16161f'}>
        <span style={{ color: expanded ? '#7c6af7' : '#5a5a70' }}>
          {expanded ? <MdExpandLess size={22} /> : <MdExpandMore size={22} />}
        </span>
        <div className="flex-1">
          <p className="font-medium text-white">{content.title}</p>
          {content.description && !expanded && (
            <p className="text-xs mt-0.5" style={{ color: '#5a5a70' }}>{content.description}</p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-5 px-5 py-5" style={{ background: '#12121a' }}>
          {items.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#5a5a70' }}>
              Este contenido no tiene material disponible aún.
            </p>
          ) : items.map(item => (
            <div key={item.id}>
              {item.title && (
                <p className="text-sm font-semibold text-white mb-2">{item.title}</p>
              )}
              <ItemRenderer item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const { profile } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lesson, setLesson] = useState(null);
  const [contents, setContents] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    async function load() {
      const allCourses = await getCourses();
      const found = allCourses.find(c => c.id === courseId);
      setCourse(found);
      const allLessons = await getLessonsByCourse(courseId);
      const active = allLessons.filter(l => l.status === 'active');
      setLessons(active);
      const currentLesson = active.find(l => l.id === lessonId);
      setLesson(currentLesson);
      if (currentLesson) {
        const allContents = await getContentsByLesson(lessonId);
        setContents(allContents.filter(c => c.status === 'active'));
      }
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
  }, [courseId, lessonId, profile]);

  async function toggleComplete() {
    if (!profile || marking) return;
    setMarking(true);
    const isCompleted = completed.includes(lessonId);
    if (isCompleted) {
      await supabase.from('lesson_progress')
        .delete()
        .eq('user_id', profile.id)
        .eq('lesson_id', lessonId);
      setCompleted(p => p.filter(id => id !== lessonId));
    } else {
      await supabase.from('lesson_progress')
        .upsert({ user_id: profile.id, lesson_id: lessonId, completed: true });
      setCompleted(p => [...p, lessonId]);
    }
    setMarking(false);
  }

  const color = course?.color || '#7c6af7';
  const isCompleted = completed.includes(lessonId);

  if (!lesson) return (
    <div className="flex items-center justify-center h-64">
      <p style={{ color: '#5a5a70' }}>Cargando lección...</p>
    </div>
  );

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">

      {/* Barra lateral */}
      <div className="w-64 flex-shrink-0">
        <button onClick={() => router.push('/courses')}
          className="flex items-center gap-1 text-sm mb-4 transition-colors"
          style={{ color: '#9090a8' }}
          onMouseEnter={e => e.currentTarget.style.color = color}
          onMouseLeave={e => e.currentTarget.style.color = '#9090a8'}>
          <MdChevronLeft /> Mis cursos
        </button>

        {course && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl"
            style={{ background: color + '15' }}>
            <span className="text-2xl">{course.icon || '🎵'}</span>
            <span className="text-sm font-semibold text-white">{course.title}</span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {lessons.map(l => {
            const isDone = completed.includes(l.id);
            const isActive = l.id === lessonId;
            return (
              <button key={l.id}
                onClick={() => router.push(`/courses/${courseId}/lessons/${l.id}`)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all w-full"
                style={{
                  background: isActive ? color + '20' : 'transparent',
                  border: `1px solid ${isActive ? color + '40' : 'transparent'}`,
                }}>
                {isDone
                  ? <MdCheckCircle className="flex-shrink-0" style={{ color }} />
                  : <MdRadioButtonUnchecked className="flex-shrink-0" style={{ color: '#5a5a70' }} />
                }
                <span className="text-sm truncate"
                  style={{ color: isActive ? '#e8e8f0' : isDone ? '#9090a8' : '#c0c0d0' }}>
                  {l.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display font-bold text-2xl text-white">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>{lesson.description}</p>
            )}
          </div>
          <button onClick={toggleComplete} disabled={marking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ml-4"
            style={{
              background: isCompleted ? color + '20' : '#1c1c26',
              color: isCompleted ? color : '#9090a8',
              border: `1px solid ${isCompleted ? color + '40' : '#2a2a38'}`,
            }}>
            {isCompleted ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
            {isCompleted ? 'Completada' : 'Marcar como completada'}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {contents.length === 0 ? (
            <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>
              Esta lección no tiene contenidos disponibles aún.
            </p></Card>
          ) : contents.map((content, index) => (
            <ContentBlock key={content.id} content={content} defaultOpen={index === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}
