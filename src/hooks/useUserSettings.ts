import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { AppState } from '../types';

export const useUserSettings = () => {
  const { state, dispatch } = useAppContext();

  const updateUserSettings = useCallback((updates: Partial<AppState['userSettings']>) => {
    dispatch({ type: 'UPDATE_USER_SETTINGS', payload: updates });
  }, [dispatch]);

  const setWeeklyCapacity = useCallback((hours: number) => {
    updateUserSettings({ weeklyCapacityHours: hours });
  }, [updateUserSettings]);

  const setWorkingDays = useCallback((days: string[]) => {
    updateUserSettings({ workingDays: days });
  }, [updateUserSettings]);

  const setWorkingHours = useCallback((start: string, end: string) => {
    updateUserSettings({ workingHours: { start, end } });
  }, [updateUserSettings]);

  const isWorkingDay = useCallback((dayName: string) => {
    return state.userSettings.workingDays.includes(dayName);
  }, [state.userSettings.workingDays]);

  const getWorkingHoursPerDay = useCallback(() => {
    const start = new Date(`2000-01-01T${state.userSettings.workingHours.start}:00`);
    const end = new Date(`2000-01-01T${state.userSettings.workingHours.end}:00`);
    
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
  }, [state.userSettings.workingHours]);

  const getMaxDailyCapacity = useCallback(() => {
    const hoursPerDay = getWorkingHoursPerDay();
    const workingDaysCount = state.userSettings.workingDays.length;
    
    return workingDaysCount > 0 ? state.userSettings.weeklyCapacityHours / workingDaysCount : hoursPerDay;
  }, [state.userSettings.weeklyCapacityHours, state.userSettings.workingDays.length, getWorkingHoursPerDay]);

  return {
    userSettings: state.userSettings,
    updateUserSettings,
    setWeeklyCapacity,
    setWorkingDays,
    setWorkingHours,
    isWorkingDay,
    getWorkingHoursPerDay,
    getMaxDailyCapacity,
  };
};