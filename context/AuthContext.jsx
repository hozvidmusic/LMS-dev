'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/supabase/client';
const AuthContext = createContext(null);

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
      {!loading && children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  return useContext(AuthContext);
}
