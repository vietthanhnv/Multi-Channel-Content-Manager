import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { AppState, AppAction, WeeklySchedule } from '../types';
import { debouncedLocalStorageService } from '../services/debouncedLocalStorage';

// Initial state
const initialState: AppState = {
  channels: [],
  taskTemplates: [],
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
    errors: [],
  },
};

// App reducer
export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'ADD_CHANNEL':
      return {
        ...state,
        channels: [...state.channels, action.payload],
      };

    case 'UPDATE_CHANNEL':
      return {
        ...state,
        channels: state.channels.map(channel =>
          channel.id === action.payload.id
            ? { ...channel, ...action.payload.updates }
            : channel
        ),
      };

    case 'DELETE_CHANNEL':
      return {
        ...state,
        channels: state.channels.filter(channel => channel.id !== action.payload),
        selectedChannelId: state.selectedChannelId === action.payload ? undefined : state.selectedChannelId,
      };

    case 'ADD_TASK_TEMPLATE':
      return {
        ...state,
        taskTemplates: [...state.taskTemplates, action.payload],
      };

    case 'UPDATE_TASK_TEMPLATE':
      return {
        ...state,
        taskTemplates: state.taskTemplates.map(template =>
          template.id === action.payload.id
            ? { ...template, ...action.payload.updates }
            : template
        ),
      };

    case 'DELETE_TASK_TEMPLATE':
      return {
        ...state,
        taskTemplates: state.taskTemplates.filter(template => template.id !== action.payload),
      };

    case 'GENERATE_TASKS_FROM_TEMPLATES': {
      const channel = state.channels.find(c => c.id === action.payload.channelId);
      if (!channel || !channel.assignedTasks.length) return state;

      const newTasks = channel.assignedTasks.flatMap(assignment => {
        const template = state.taskTemplates.find(t => t.id === assignment.templateId);
        if (!template) return [];

        return Array.from({ length: assignment.quantity }, (_, index) => ({
          id: `${template.id}-${channel.id}-${Date.now()}-${index}`,
          channelId: channel.id,
          templateId: template.id,
          title: `${template.title} ${assignment.quantity > 1 ? `(${index + 1})` : ''}`,
          description: template.description,
          estimatedHours: template.estimatedHours,
          status: 'planned' as const,
          scheduledStart: new Date(),
          scheduledEnd: new Date(),
          timeSlot: 'morning' as const,
          priority: assignment.priority,
        }));
      });

      const totalNewHours = newTasks.reduce((sum, task) => sum + task.estimatedHours, 0);

      return {
        ...state,
        currentWeek: {
          ...state.currentWeek,
          tasks: [...state.currentWeek.tasks, ...newTasks],
          totalScheduledHours: state.currentWeek.totalScheduledHours + totalNewHours,
          isOverloaded: (state.currentWeek.totalScheduledHours + totalNewHours) > state.userSettings.weeklyCapacityHours,
        },
      };
    }

    case 'ADD_TASK':
      return {
        ...state,
        currentWeek: {
          ...state.currentWeek,
          tasks: [...state.currentWeek.tasks, action.payload],
          totalScheduledHours: state.currentWeek.totalScheduledHours + action.payload.estimatedHours,
          isOverloaded: (state.currentWeek.totalScheduledHours + action.payload.estimatedHours) > state.userSettings.weeklyCapacityHours,
        },
      };

    case 'UPDATE_TASK':
      return {
        ...state,
        currentWeek: {
          ...state.currentWeek,
          tasks: state.currentWeek.tasks.map(task =>
            task.id === action.payload.id
              ? { ...task, ...action.payload.updates }
              : task
          ),
        },
      };

    case 'DELETE_TASK':
      const taskToDelete = state.currentWeek.tasks.find(task => task.id === action.payload);
      const updatedTasks = state.currentWeek.tasks.filter(task => task.id !== action.payload);
      const newTotalHours = taskToDelete 
        ? state.currentWeek.totalScheduledHours - taskToDelete.estimatedHours
        : state.currentWeek.totalScheduledHours;

      return {
        ...state,
        currentWeek: {
          ...state.currentWeek,
          tasks: updatedTasks,
          totalScheduledHours: newTotalHours,
          isOverloaded: newTotalHours > state.userSettings.weeklyCapacityHours,
        },
      };

    case 'SET_CURRENT_WEEK':
      return {
        ...state,
        currentWeek: action.payload,
      };

    case 'SET_SELECTED_CHANNEL':
      return {
        ...state,
        selectedChannelId: action.payload,
      };

    case 'UPDATE_USER_SETTINGS':
      const updatedSettings = { ...state.userSettings, ...action.payload };
      return {
        ...state,
        userSettings: updatedSettings,
        currentWeek: {
          ...state.currentWeek,
          userCapacityHours: updatedSettings.weeklyCapacityHours,
          isOverloaded: state.currentWeek.totalScheduledHours > updatedSettings.weeklyCapacityHours,
        },
      };

    case 'SET_ACTIVE_VIEW':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeView: action.payload,
        },
      };

    case 'SET_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          isLoading: action.payload,
        },
      };

    case 'ADD_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          errors: [...state.ui.errors, action.payload],
        },
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        ui: {
          ...state.ui,
          errors: [],
        },
      };

    default:
      return state;
  }
};

// Context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
  initialState?: AppState;
}

export const AppProvider: React.FC<AppProviderProps> = ({ 
  children, 
  initialState: providedInitialState 
}) => {
  const [state, dispatch] = useReducer(appReducer, providedInitialState || initialState);

  // Debounced localStorage updates
  useEffect(() => {
    debouncedLocalStorageService.debouncedUpdateChannels(state.channels);
  }, [state.channels]);

  useEffect(() => {
    debouncedLocalStorageService.debouncedUpdateTaskTemplates(state.taskTemplates);
  }, [state.taskTemplates]);

  useEffect(() => {
    const weekKey = state.currentWeek.weekStartDate.toISOString().split('T')[0];
    debouncedLocalStorageService.debouncedUpdateSchedule(weekKey, state.currentWeek);
  }, [state.currentWeek]);

  useEffect(() => {
    debouncedLocalStorageService.debouncedUpdateUserSettings(state.userSettings);
  }, [state.userSettings]);

  // Flush pending updates when component unmounts
  useEffect(() => {
    return () => {
      debouncedLocalStorageService.flushPendingUpdates();
    };
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};