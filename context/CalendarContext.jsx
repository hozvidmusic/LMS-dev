'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPendingRatingsCount, getUpcomingCount } from '@/services/calendarService';

const CalendarContext = createContext({ pendingRatings: 0, upcomingToday: 0, refresh: () => {} });

export function CalendarProvider({ children }) {
  const { profile } = useAuth();
  const [pendingRatings, setPendingRatings] = useState(0);
  const [upcomingToday, setUpcomingToday] = useState(0);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const [pending, upcoming] = await Promise.all([
      getPendingRatingsCount(profile.id),
      getUpcomingCount(profile.id),
    ]);
    setPendingRatings(pending);
    setUpcomingToday(upcoming);
  }, [profile]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <CalendarContext.Provider value={{ pendingRatings, upcomingToday, refresh }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  return useContext(CalendarContext);
}
