'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAnnouncementsForStudent } from '@/services/announcementService';
import Card from '@/components/ui/Card';
import { MdAnnouncement } from 'react-icons/md';

function TargetBadge({ announcement }) {
  if (announcement.target === 'all') return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#4ade8020', color: '#4ade80' }}>🌐 General</span>
  );
  if (announcement.target === 'group') return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#7c6af720', color: '#7c6af7' }}>👥 {announcement.groups?.name}</span>
  );
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fbbf2420', color: '#fbbf24' }}>🔸 {announcement.subgroups?.name}</span>
  );
}

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getAnnouncementsForStudent(profile.id)
      .then(data => { setAnnouncements(data); setLoading(false); });
  }, [profile]);

  function formatDate(d) {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Anuncios</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>Mensajes de tu academia</p>
      </div>

      {loading ? <p style={{ color: '#5a5a70' }}>Cargando...</p> : (
        <div className="flex flex-col gap-3">
          {announcements.length === 0 ? (
            <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>No hay anuncios por ahora.</p></Card>
          ) : announcements.map(a => (
            <Card key={a.id}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: '#7c6af720', color: '#7c6af7' }}>
                  <MdAnnouncement size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-white">{a.title}</h3>
                    <TargetBadge announcement={a} />
                  </div>
                  <p className="text-sm leading-relaxed mb-2" style={{ color: '#9090a8' }}>{a.body}</p>
                  <p className="text-xs" style={{ color: '#5a5a70' }}>
                    {a.profiles?.display_name} · {formatDate(a.created_at)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
