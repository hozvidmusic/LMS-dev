'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AnnouncementsProvider } from '@/context/AnnouncementsContext';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#0f0f13', flexDirection: 'column', gap: '16px'
    }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid #2a2a38', borderTop: '3px solid #7c6af7',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#5a5a70', fontSize: '14px' }}>Cargando...</p>
    </div>
  );

  if (!user) return null;

  return (
    <AnnouncementsProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: '#0f0f13' }}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b"
            style={{ background: '#16161d', borderColor: '#2a2a38' }}>
            <button onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-white p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-display font-bold text-white">Hozvid Academy</span>
          </header>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </AnnouncementsProvider>
  );
}
