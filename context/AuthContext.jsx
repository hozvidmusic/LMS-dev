'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  function profileFromUser(u) {
    if (!u) return null;
    const meta = u.user_metadata || {};
    return {
      id: u.id,
      username: meta.username || u.email?.split('@')[0] || '',
      display_name: meta.display_name || meta.username || 'Usuario',
      role: meta.role || 'student',
      last_login: null,
    };
  }

  async function loadProfile(u) {
    if (!u) { if (mounted.current) setProfile(null); return; }
    // Usar metadata del JWT inmediatamente para no quedarse cargando
    const fallback = profileFromUser(u);
    if (mounted.current) setProfile(fallback);
    // Intentar enriquecer con datos de la tabla profiles
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', u.id).single();
      if (mounted.current && data) setProfile(data);
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
          await loadProfile(session.user);
          updateLastLogin(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch {
        if (mounted.current) { setUser(null); setProfile(null); }
      } finally {
        if (mounted.current) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;
        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user);
          if (event === 'SIGNED_IN') updateLastLogin(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        if (mounted.current) setLoading(false);
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '3px solid #2a2a38',
        borderTop: '3px solid #7c6af7',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const value = { user, profile, loading, refreshProfile: () => loadProfile(user) };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}