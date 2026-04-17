'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentsByLesson, getItemsByContent } from '@/services/courseService';
import Card from '@/components/ui/Card';
import { MdChevronLeft } from 'react-icons/md';

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

export default function ContentPage() {
  const { courseId, lessonId, contentId } = useParams();
  const router = useRouter();
  const [content, setContent] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    async function load() {
      const contents = await getContentsByLesson(lessonId);
      const found = contents.find(c => c.id === contentId);
      setContent(found);
      if (found) {
        const all = await getItemsByContent(contentId);
        setItems(all.filter(i => i.status === 'active'));
      }
    }
    load();
  }, [lessonId, contentId]);

  if (!content) return <div style={{ color: '#5a5a70' }}>Cargando contenido...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.push(`/courses/${courseId}/lessons/${lessonId}`)}
        className="flex items-center gap-1 text-sm mb-6 transition-colors"
        style={{ color: '#9090a8' }}
        onMouseEnter={e => e.currentTarget.style.color = '#7c6af7'}
        onMouseLeave={e => e.currentTarget.style.color = '#9090a8'}>
        <MdChevronLeft /> Volver a la lección
      </button>

      <h1 className="font-display font-bold text-2xl text-white mb-6">{content.title}</h1>

      <div className="flex flex-col gap-6">
        {items.length === 0 ? (
          <Card><p className="text-center py-8" style={{ color: '#5a5a70' }}>
            Este contenido no tiene ítems disponibles.
          </p></Card>
        ) : items.map(item => <ItemRenderer key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function ItemRenderer({ item }) {
  const url = item.file_url || item.value;
  switch (item.type) {
    case 'text':
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          <div className="text-sm leading-relaxed" style={{ color: '#c0c0d0' }}
            dangerouslySetInnerHTML={{ __html: item.value }} />
        </Card>
      );
    case 'youtube': {
      const videoId = extractYoutubeId(item.value);
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          {videoId ? (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe className="absolute inset-0 w-full h-full rounded-xl"
                src={`https://www.youtube.com/embed/${videoId}`}
                allowFullScreen title={item.title} />
            </div>
          ) : <p style={{ color: '#f87171' }}>URL de YouTube inválida</p>}
        </Card>
      );
    }
    case 'image':
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          <img src={url} alt={item.title} className="w-full rounded-xl object-contain max-h-96" />
        </Card>
      );
    case 'audio':
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          <audio controls className="w-full" src={url} />
        </Card>
      );
    case 'video':
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          <video controls className="w-full rounded-xl" src={url} />
        </Card>
      );
    case 'pdf':
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
            📄 Ver PDF
          </a>
        </Card>
      );
    case 'link':
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          <a href={item.value} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
            🔗 Abrir enlace
          </a>
        </Card>
      );
    case 'file':
      return (
        <Card>
          {item.title && <h3 className="font-semibold text-white mb-3">{item.title}</h3>}
          <a href={item.file_url} download target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: '#7c6af720', color: '#7c6af7', border: '1px solid #7c6af740' }}>
            ⬇️ Descargar {item.file_name || 'archivo'}
          </a>
        </Card>
      );
    default: return null;
  }
}
