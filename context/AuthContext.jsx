'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/supabase/client';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  async function loadProfile(userId) {
    if (!userId) { setProfile(null); return; }
    try {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', userId).single();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }
  async function updateLastLogin(userId) {
    try {
      await supabase.from('profiles')
        .update({ last_login: new Date().toISOString() }).eq('id', userId);
    } catch {}
  }
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
        updateLastLogin(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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
    return () => subscription.unsubscribe();
  }, []);
  const value = { user, profile, loading, refreshProfile: () => loadProfile(user?.id) };
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
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
