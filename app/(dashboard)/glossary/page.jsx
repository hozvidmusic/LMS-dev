'use client';
import { useEffect, useState } from 'react';
import { getGlossary } from '@/services/glossaryService';
import Card from '@/components/ui/Card';

export default function GlossaryPage() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getGlossary().then(data => { setTerms(data); setLoading(false); });
  }, []);

  const filtered = terms.filter(t =>
    t.term.toLowerCase().includes(search.toLowerCase()) ||
    t.definition.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, t) => {
    const letter = t.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-white">Glosario musical</h1>
        <p className="text-sm mt-1" style={{ color: '#5a5a70' }}>Términos y definiciones musicales</p>
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar término..."
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-6"
        style={{ background: '#16161d', border: '1px solid #2a2a38', color: '#e8e8f0' }} />

      {loading ? (
        <p style={{ color: '#5a5a70' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <Card><p className="text-center py-12" style={{ color: '#5a5a70' }}>No hay términos disponibles.</p></Card>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.keys(grouped).sort().map(letter => (
            <div key={letter}>
              <div className="flex items-center gap-3 mb-3">
                <span className="font-display font-bold text-2xl" style={{ color: '#7c6af7' }}>{letter}</span>
                <div className="flex-1 h-px" style={{ background: '#2a2a38' }} />
              </div>
              <div className="flex flex-col gap-2">
                {grouped[letter].map(t => (
                  <Card key={t.id}>
                    <h3 className="font-semibold text-white">{t.term}</h3>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: '#9090a8' }}>{t.definition}</p>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
