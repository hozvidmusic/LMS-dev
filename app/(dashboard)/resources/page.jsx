'use client';
import { useEffect, useState } from 'react';
import { getResources } from '@/services/resourceService';
import Card from '@/components/ui/Card';
import { MdPictureAsPdf, MdMusicNote, MdVideoLibrary, MdImage, MdInsertDriveFile, MdLibraryMusic, MdOpenInNew } from 'react-icons/md';

const RESOURCE_TYPES = [
  { value: 'pdf', label: '📄 PDF', icon: <MdPictureAsPdf /> },
  { value: 'audio', label: '🎵 Audio', icon: <MdMusicNote /> },
  { value: 'video', label: '🎬 Video', icon: <MdVideoLibrary /> },
  { value: 'image', label: '🖼️ Imagen', icon: <MdImage /> },
  { value: 'score', label: '🎼 Partitura', icon: <MdLibraryMusic /> },
  { value: 'file', label: '📁 Archivo', icon: <MdInsertDriveFile /> },
];

function getTypeInfo(type) {
  return RESOURCE_TYPES.find(t => t.value === type) || RESOURCE_TYPES[5];
}

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getResources().then(data => { setResources(data); setLoading(false); });
  }, []);

  const filtered = resources.filter(r => {
    const matchType = filter === 'all' || r.type === filter;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Biblioteca de recursos</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>Materiales de estudio disponibles</p>
      </div>

      {/* Búsqueda */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar recursos..."
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-4"
        style={{ background: '#16161d', border: '1px solid #2a2a38', color: '#e8e8f0' }} />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilter('all')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: filter === 'all' ? '#7c6af720' : '#22222e',
            color: filter === 'all' ? '#7c6af7' : '#9090a8',
            border: `1px solid ${filter === 'all' ? '#7c6af740' : '#333344'}`,
          }}>
          Todos
        </button>
        {RESOURCE_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: filter === t.value ? '#7c6af720' : '#22222e',
              color: filter === t.value ? '#7c6af7' : '#9090a8',
              border: `1px solid ${filter === t.value ? '#7c6af740' : '#333344'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#5a5a70' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-center py-12" style={{ color: '#5a5a70' }}>
            No hay recursos disponibles{filter !== 'all' ? ' de este tipo' : ''}.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(resource => {
            const typeInfo = getTypeInfo(resource.type);
            return (
              <a key={resource.id} href={resource.drive_url} target="_blank" rel="noopener noreferrer"
                className="block transition-transform hover:scale-[1.01]">
                <Card hover>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: '#7c6af720', color: '#7c6af7' }}>
                      {typeInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm truncate">{resource.title}</h3>
                        <MdOpenInNew size={14} style={{ color: '#5a5a70', flexShrink: 0 }} />
                      </div>
                      {resource.description && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#5a5a70' }}>{resource.description}</p>
                      )}
                      <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded-full"
                        style={{ background: '#7c6af715', color: '#7c6af7' }}>
                        {typeInfo.label}
                      </span>
                    </div>
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
