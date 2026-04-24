'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEventsForStudent } from '@/services/calendarService';

const CalendarContext = createContext({ pendingRatings: 0, upcomingEvents: [], refresh: () => {} });

export function CalendarProvider({ children }) {
  const { profile } = useAuth();
  const [pendingRatings, setPendingRatings] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const data = await getEventsForStudent(profile.id);
    const now = new Date();
    const pending = data.filter(e => {
      const isPast = e.ends_at ? new Date(e.ends_at) <= now : new Date(e.starts_at) <= now;
      const alreadyRated = e.event_ratings?.some(r => r.user_id === profile.id);
      return isPast && !alreadyRated;
    }).length;
    const upcoming = data.filter(e => new Date(e.starts_at) > now);
    setPendingRatings(pending);
    setUpcomingEvents(upcoming);
  }, [profile]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <CalendarContext.Provider value={{ pendingRatings, upcomingEvents, refresh }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  return useContext(CalendarContext);
}
