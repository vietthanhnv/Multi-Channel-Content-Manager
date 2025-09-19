import React, { useEffect, useState, ReactNode } from 'react';
import { AppProvider } from './AppContext';
import { localStorageService } from '../services/localStorage';
import { AppState, WeeklySchedule } from '../types';

interface AppProviderWithPersistenceProps {
  children: ReactNode;
}

/**
 * Enhanced AppProvider that handles state restoration from localStorage
 * and provides loading states during initialization
 */
export const AppProviderWithPersistence: React.FC<AppProviderWithPersistenceProps> = ({ 
  children 
}) => {
  const [initialState, setInitialState] = useState<AppState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a week key for schedule storage
   */
  const getWeekKey = (date: Date): string => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    return startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  /**
   * Load initial state from localStorage on component mount
   */
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load data from localStorage
        const channels = localStorageService.getChannels();
        const templates = localStorageService.getTemplates();
        const userSettings = localStorageService.getUserSettings();
        
        // Load current week schedule
        const currentWeekKey = getWeekKey(new Date());
        const currentWeekSchedule = localStorageService.getSchedule(currentWeekKey);
        
        const currentWeek: WeeklySchedule = currentWeekSchedule || {
          weekStartDate: new Date(),
          tasks: [],
          totalScheduledHours: 0,
          userCapacityHours: userSettings.weeklyCapacityHours,
          isOverloaded: false,
        };

        // Create initial state
        const restoredState: AppState = {
          channels,
          templates,
          currentWeek,
          selectedChannelId: undefined,
          userSettings,
          ui: {
            activeView: 'dashboard',
            isLoading: false,
            errors: [],
          },
        };

        setInitialState(restoredState);
      } catch (error) {
        console.error('Failed to load initial state from localStorage:', error);
        setError('Failed to load saved data. Using default settings.');
        
        // Fallback to default state
        const defaultState: AppState = {
          channels: [],
          templates: [],
          currentWeek: {
            weekStartDate: new Date(),
            tasks: [],
            totalScheduledHours: 0,
            userCapacityHours: 40,
            isOverloaded: false,
          },
          selectedChannelId: undefined,
          userSettings: {
            weeklyCapacityHours: 40,
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHours: { start: '09:00', end: '17:00' },
          },
          ui: {
            activeView: 'dashboard',
            isLoading: false,
            errors: error instanceof Error ? [error.message] : ['Failed to load saved data'],
          },
        };
        
        setInitialState(defaultState);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialState();
  }, []);

  // Show loading state while initializing
  if (isLoading || !initialState) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div>Loading Multi-Channel Content Manager...</div>
        {error && (
          <div style={{ color: 'red', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <AppProvider initialState={initialState}>
      {children}
    </AppProvider>
  );
};