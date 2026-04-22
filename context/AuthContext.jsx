'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase/client';
const AuthContext = createContext(null);

function Spinner() {
  return (
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
      <p style={{ color: '#5a5a70', fontSize: '14px', margin: 0 }}>Cargando...</p>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  async function loadProfile(userId) {
    if (!userId) { if (mounted.current) setProfile(null); return; }
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).single();
      if (mounted.current) setProfile(data);
    } catch {}
  }

  async function updateLastLogin(userId) {
    try {
      await supabase.from('profiles')
        .update({ last_login: new Date().toISOString() }).eq('id', userId);
    } catch {}
  }

  useEffect(() => {
    mounted.current = true;
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted.current) return;
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
          updateLastLogin(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {}
      if (mounted.current) setLoading(false);
    }
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted.current) return;
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
          updateLastLogin(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = { user, profile, loading, refreshProfile: () => loadProfile(user?.id) };
  return (
    <AuthContext.Provider value={value}>
      {loading ? <Spinner /> : children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
