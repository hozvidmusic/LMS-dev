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
    const { data } = await supabase
      .from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  }

  async function updateLastLogin(userId) {
    await supabase.from('profiles')
      .update({ last_login: new Date().toISOString() }).eq('id', userId);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        updateLastLogin(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        await loadProfile(session?.user?.id);
        if (session?.user) updateLastLogin(session.user.id);
      }
    );

    return () => subscription.unsubscribe();
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
