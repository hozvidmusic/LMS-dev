'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUnreadCountForStudent } from '@/services/announcementService';

const AnnouncementsContext = createContext({ unreadCount: 0, refresh: () => {} });

export function AnnouncementsProvider({ children }) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const count = await getUnreadCountForStudent(profile.id);
    setUnreadCount(count);
  }, [profile]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <AnnouncementsContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </AnnouncementsContext.Provider>
  );
}

export function useAnnouncements() {
  return useContext(AnnouncementsContext);
}
