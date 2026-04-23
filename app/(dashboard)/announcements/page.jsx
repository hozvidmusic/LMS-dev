'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAnnouncementsForStudent, markAsRead } from '@/services/announcementService';
import Card from '@/components/ui/Card';
import { MdAnnouncement, MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';

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

function formatDate(d) {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(a) {
  if (!a.expires_at) return false;
  return new Date(a.expires_at) < new Date();
}

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!profile) return;
    const data = await getAnnouncementsForStudent(profile.id);
    setAnnouncements(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // Verificar expirados cada 60 segundos
    const interval = setInterval(() => {
      setAnnouncements(prev => prev.filter(a => !isExpired(a)));
    }, 60000);
    return () => clearInterval(interval);
  }, [profile]);

  async function handleMarkAsRead(a) {
    if (a.read_by?.includes(profile.id)) return;
    await markAsRead(a.id, profile.id, a.read_by);
    setAnnouncements(prev => prev.map(item =>
      item.id === a.id
        ? { ...item, read_by: [...(item.read_by || []), profile.id] }
        : item
    ));
  }

  const unreadCount = announcements.filter(a => !a.read_by?.includes(profile?.id)).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Anuncios</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>
          {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todos leídos ✓'}
        </p>
      </div>

      {loading ? <p style={{ color: '#5a5a70' }}>Cargando...</p> : (
        <div className="flex flex-col gap-3">
          {announcements.length === 0 ? (
            <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>No hay anuncios por ahora.</p></Card>
          ) : announcements.map(a => {
            const isRead = a.read_by?.includes(profile?.id);
            return (
              <Card key={a.id}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                    style={{ background: isRead ? '#2a2a3820' : '#7c6af720', color: isRead ? '#5a5a70' : '#7c6af7' }}>
                    <MdAnnouncement size={20} />
                    {!isRead && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                        style={{ background: '#f75c6a' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold" style={{ color: isRead ? '#5a5a70' : 'white' }}>{a.title}</h3>
                      {!isRead && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#f75c6a20', color: '#f75c6a' }}>Nuevo</span>
                      )}
                      <TargetBadge announcement={a} />
                    </div>
                    <p className="text-sm leading-relaxed mb-2"
                      style={{ color: isRead ? '#3a3a50' : '#9090a8' }}>{a.body}</p>
                    <p className="text-xs" style={{ color: '#5a5a70' }}>
                      {a.profiles?.display_name} · {formatDate(a.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMarkAsRead(a)}
                    title={isRead ? 'Ya leído' : 'Marcar como leído'}
                    className="flex-shrink-0 transition-all"
                    style={{ color: isRead ? '#4ade80' : '#5a5a70' }}
                    disabled={isRead}>
                    {isRead
                      ? <MdCheckCircle size={24} />
                      : <MdRadioButtonUnchecked size={24} />
                    }
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
