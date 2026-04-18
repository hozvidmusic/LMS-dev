'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getLessonsByCourse, getContentsByLesson, getItemsByContent } from '@/services/courseService';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase/client';
import Card from '@/components/ui/Card';
import { MdCheckCircle, MdExpandMore, MdExpandLess, MdRadioButtonUnchecked } from 'react-icons/md';

function extractDriveId(url) {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([^/?\s]+)/);
  if (match) return match[1];
  const match2 = url.match(/drive\.google\.com\/open\?id=([^&\s]+)/);
  if (match2) return match2[1];
  return null;
}

function toImageUrl(url) {
  const id = extractDriveId(url);
  if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  return url;
}

function toPreviewUrl(url) {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return url;
}

function toDownloadUrl(url) {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return url;
}

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
    case 'youtube':
    case 'video': {
      const videoId = extractYoutubeId(url);
      return videoId ? (
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe className="absolute inset-0 w-full h-full rounded-xl"
            src={`https://www.youtube.com/embed/${videoId}`} allowFullScreen title={item.title} />
        </div>
      ) : <p style={{ color: '#f87171' }}>URL de YouTube inválida</p>;
    }
    case 'image':
      return <img src={toImageUrl(url)} alt={item.title}
        className="w-full rounded-xl object-contain max-h-96"
        onError={e => { e.target.src = toPreviewUrl(url); }} />;
    case 'audio':
      return (
        <iframe src={toPreviewUrl(url)} className="w-full rounded-xl"
          style={{ height: '80px', border: 'none' }} allow="autoplay" />
      );
    case 'pdf':
      return (
        <iframe src={toPreviewUrl(url)} className="w-full rounded-xl"
          style={{ height: '500px', border: 'none' }} />
      );
    case 'link':
      return <a href={url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
        🔗 Abrir enlace
      </a>;
    case 'file':
      return <a href={toDownloadUrl(url)} target="_blank" rel="noopener noreferrer"
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
  const [lesson, setLesson] = useState(null);
  const [contents, setContents] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [marking, setMarking] = useState(false);
  const [color, setColor] = useState('#7c6af7');

  useEffect(() => {
    async function load() {
      const allLessons = await getLessonsByCourse(courseId);
      const currentLesson = allLessons.find(l => l.id === lessonId);
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
        const { data: courseData } = await supabase
          .from('courses')
          .select('color')
          .eq('id', courseId)
          .single();
        if (courseData?.color) setColor(courseData.color);
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

  const isCompleted = completed.includes(lessonId);

  if (!lesson) return (
    <div className="flex items-center justify-center h-64">
      <p style={{ color: '#5a5a70' }}>Cargando lección...</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
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
  );
}
