import { useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { localStorageService, LocalStorageError } from '../services/localStorage';
import { AppState, WeeklySchedule } from '../types';

/**
 * Hook for managing state persistence with localStorage
 * Handles automatic saving and restoration of app state
 */
export const useStatePersistence = () => {
  const { state, dispatch } = useAppContext();

  /**
   * Generate a week key for schedule storage
   */
  const getWeekKey = useCallback((date: Date): string => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    return startOfWeek.toISOString().split('T')[0]; // YYYY-MM-DD format
  }, []);

  /**
   * Load initial state from localStorage
   */
  const loadInitialState = useCallback((): Partial<AppState> => {
    try {
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

      return {
        channels,
        templates,
        currentWeek,
        userSettings,
      };
    } catch (error) {
      console.error('Failed to load initial state from localStorage:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to load saved data. Using default settings.' });
      return {};
    }
  }, [getWeekKey, dispatch]);

  /**
   * Save channels to localStorage
   */
  const saveChannels = useCallback(async () => {
    try {
      // Clear existing channels and save new ones
      const existingChannels = localStorageService.getChannels();
      
      // Remove channels that no longer exist
      existingChannels.forEach(existingChannel => {
        if (!state.channels.find(channel => channel.id === existingChannel.id)) {
          try {
            localStorageService.deleteChannel(existingChannel.id);
          } catch (error) {
            // Channel might already be deleted, ignore error
          }
        }
      });

      // Add or update current channels
      state.channels.forEach(channel => {
        try {
          const existingChannel = localStorageService.getChannel(channel.id);
          if (existingChannel) {
            localStorageService.updateChannel(channel.id, channel);
          } else {
            localStorageService.addChannel(channel);
          }
        } catch (error) {
          console.error(`Failed to save channel ${channel.id}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to save channels:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to save channel data.' });
    }
  }, [state.channels, dispatch]);

  /**
   * Save templates to localStorage
   */
  const saveTemplates = useCallback(async () => {
    try {
      // Clear existing templates and save new ones
      const existingTemplates = localStorageService.getTemplates();
      
      // Remove templates that no longer exist
      existingTemplates.forEach(existingTemplate => {
        if (!state.templates.find(template => template.id === existingTemplate.id)) {
          try {
            localStorageService.deleteTemplate(existingTemplate.id);
          } catch (error) {
            // Template might already be deleted, ignore error
          }
        }
      });

      // Add or update current templates
      state.templates.forEach(template => {
        try {
          const existingTemplate = localStorageService.getTemplate(template.id);
          if (existingTemplate) {
            localStorageService.updateTemplate(template.id, template);
          } else {
            localStorageService.addTemplate(template);
          }
        } catch (error) {
          console.error(`Failed to save template ${template.id}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to save templates:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to save template data.' });
    }
  }, [state.templates, dispatch]);

  /**
   * Save current week schedule to localStorage
   */
  const saveCurrentWeek = useCallback(async () => {
    try {
      const weekKey = getWeekKey(state.currentWeek.weekStartDate);
      localStorageService.setSchedule(weekKey, state.currentWeek);
    } catch (error) {
      console.error('Failed to save current week schedule:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to save schedule data.' });
    }
  }, [state.currentWeek, getWeekKey, dispatch]);

  /**
   * Save user settings to localStorage
   */
  const saveUserSettings = useCallback(async () => {
    try {
      localStorageService.updateUserSettings(state.userSettings);
    } catch (error) {
      console.error('Failed to save user settings:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to save user settings.' });
    }
  }, [state.userSettings, dispatch]);

  /**
   * Load a specific week's schedule
   */
  const loadWeekSchedule = useCallback((weekStartDate: Date): WeeklySchedule | null => {
    try {
      const weekKey = getWeekKey(weekStartDate);
      return localStorageService.getSchedule(weekKey);
    } catch (error) {
      console.error('Failed to load week schedule:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to load schedule for selected week.' });
      return null;
    }
  }, [getWeekKey, dispatch]);

  /**
   * Export all data as JSON
   */
  const exportData = useCallback((): string => {
    try {
      return localStorageService.exportAllData();
    } catch (error) {
      console.error('Failed to export data:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to export data.' });
      return '';
    }
  }, [dispatch]);

  /**
   * Get storage usage information
   */
  const getStorageInfo = useCallback(() => {
    try {
      return localStorageService.getStorageInfo();
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }, []);

  /**
   * Clear all data
   */
  const clearAllData = useCallback(() => {
    try {
      localStorageService.clearAllData();
      dispatch({ type: 'CLEAR_ERRORS' });
    } catch (error) {
      console.error('Failed to clear data:', error);
      dispatch({ type: 'ADD_ERROR', payload: 'Failed to clear data.' });
    }
  }, [dispatch]);

  // Auto-save effects
  useEffect(() => {
    saveChannels();
  }, [state.channels, saveChannels]);

  useEffect(() => {
    saveTemplates();
  }, [state.templates, saveTemplates]);

  useEffect(() => {
    saveCurrentWeek();
  }, [state.currentWeek, saveCurrentWeek]);

  useEffect(() => {
    saveUserSettings();
  }, [state.userSettings, saveUserSettings]);

  return {
    loadInitialState,
    loadWeekSchedule,
    exportData,
    getStorageInfo,
    clearAllData,
    saveChannels,
    saveTemplates,
    saveCurrentWeek,
    saveUserSettings,
  };
};