'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEventsForStudent } from '@/services/calendarService';

const CalendarContext = createContext({ pendingRatings: 0 });

export function CalendarProvider({ children }) {
  const { profile } = useAuth();
  const [pendingRatings, setPendingRatings] = useState(0);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const data = await getEventsForStudent(profile.id);
    const now = new Date();
    const count = data.filter(e => {
      const isPast = new Date(e.starts_at) <= now;
      const alreadyRated = e.event_ratings?.some(r => r.user_id === profile.id);
      return isPast && !alreadyRated;
    }).length;
    setPendingRatings(count);
  }, [profile]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <CalendarContext.Provider value={{ pendingRatings, refresh }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  return useContext(CalendarContext);
}
