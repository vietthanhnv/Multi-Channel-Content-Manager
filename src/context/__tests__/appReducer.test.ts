import { describe, it, expect } from 'vitest';
import { appReducer } from '../AppContext';
import { AppState, AppAction, Channel, ContentTemplate, Task } from '../../types';

const createInitialState = (): AppState => ({
  channels: [],
  templates: [],
  currentWeek: {
    weekStartDate: new Date('2024-01-01'),
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
});

const mockChannel: Channel = {
  id: 'channel-1',
  name: 'Test Channel',
  contentType: 'gaming',
  postingSchedule: {
    frequency: 'weekly',
    preferredDays: ['Monday'],
    preferredTimes: ['10:00'],
  },
  color: '#ff0000',
  createdAt: new Date('2024-01-01'),
  isActive: true,
};

const mockTemplate: ContentTemplate = {
  id: 'template-1',
  name: 'Test Template',
  contentType: 'video',
  estimatedHours: {
    planning: 1,
    production: 4,
    editing: 3,
    publishing: 0.5,
  },
  workflowSteps: ['Plan', 'Record', 'Edit', 'Upload'],
  channelIds: ['channel-1'],
};

const mockTask: Task = {
  id: 'task-1',
  channelId: 'channel-1',
  templateId: 'template-1',
  title: 'Test Task',
  contentType: 'video',
  estimatedHours: 8,
  status: 'planned',
  scheduledStart: new Date('2024-01-01T10:00:00'),
  scheduledEnd: new Date('2024-01-01T18:00:00'),
};

describe('appReducer', () => {
  describe('Channel Actions', () => {
    it('should handle ADD_CHANNEL', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'ADD_CHANNEL',
        payload: mockChannel,
      };

      const newState = appReducer(initialState, action);

      expect(newState.channels).toHaveLength(1);
      expect(newState.channels[0]).toEqual(mockChannel);
      expect(newState).not.toBe(initialState); // Immutability check
    });

    it('should handle UPDATE_CHANNEL', () => {
      const initialState = createInitialState();
      initialState.channels = [mockChannel];

      const action: AppAction = {
        type: 'UPDATE_CHANNEL',
        payload: {
          id: 'channel-1',
          updates: { name: 'Updated Channel', isActive: false },
        },
      };

      const newState = appReducer(initialState, action);

      expect(newState.channels[0].name).toBe('Updated Channel');
      expect(newState.channels[0].isActive).toBe(false);
      expect(newState.channels[0].contentType).toBe('gaming'); // Unchanged
    });

    it('should handle UPDATE_CHANNEL for non-existent channel', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'UPDATE_CHANNEL',
        payload: {
          id: 'non-existent',
          updates: { name: 'Updated' },
        },
      };

      const newState = appReducer(initialState, action);

      expect(newState.channels).toHaveLength(0);
      expect(newState).toEqual(initialState);
    });

    it('should handle DELETE_CHANNEL', () => {
      const initialState = createInitialState();
      initialState.channels = [mockChannel];
      initialState.selectedChannelId = 'channel-1';

      const action: AppAction = {
        type: 'DELETE_CHANNEL',
        payload: 'channel-1',
      };

      const newState = appReducer(initialState, action);

      expect(newState.channels).toHaveLength(0);
      expect(newState.selectedChannelId).toBeUndefined();
    });

    it('should handle DELETE_CHANNEL without affecting selectedChannelId if different', () => {
      const initialState = createInitialState();
      initialState.channels = [mockChannel];
      initialState.selectedChannelId = 'different-channel';

      const action: AppAction = {
        type: 'DELETE_CHANNEL',
        payload: 'channel-1',
      };

      const newState = appReducer(initialState, action);

      expect(newState.channels).toHaveLength(0);
      expect(newState.selectedChannelId).toBe('different-channel');
    });
  });

  describe('Template Actions', () => {
    it('should handle ADD_TEMPLATE', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'ADD_TEMPLATE',
        payload: mockTemplate,
      };

      const newState = appReducer(initialState, action);

      expect(newState.templates).toHaveLength(1);
      expect(newState.templates[0]).toEqual(mockTemplate);
    });

    it('should handle UPDATE_TEMPLATE', () => {
      const initialState = createInitialState();
      initialState.templates = [mockTemplate];

      const action: AppAction = {
        type: 'UPDATE_TEMPLATE',
        payload: {
          id: 'template-1',
          updates: { name: 'Updated Template', contentType: 'short' },
        },
      };

      const newState = appReducer(initialState, action);

      expect(newState.templates[0].name).toBe('Updated Template');
      expect(newState.templates[0].contentType).toBe('short');
      expect(newState.templates[0].estimatedHours).toEqual(mockTemplate.estimatedHours); // Unchanged
    });

    it('should handle DELETE_TEMPLATE', () => {
      const initialState = createInitialState();
      initialState.templates = [mockTemplate];

      const action: AppAction = {
        type: 'DELETE_TEMPLATE',
        payload: 'template-1',
      };

      const newState = appReducer(initialState, action);

      expect(newState.templates).toHaveLength(0);
    });
  });

  describe('Task Actions', () => {
    it('should handle ADD_TASK', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'ADD_TASK',
        payload: mockTask,
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek.tasks).toHaveLength(1);
      expect(newState.currentWeek.tasks[0]).toEqual(mockTask);
      expect(newState.currentWeek.totalScheduledHours).toBe(8);
      expect(newState.currentWeek.isOverloaded).toBe(false);
    });

    it('should detect overload when adding task', () => {
      const initialState = createInitialState();
      initialState.userSettings.weeklyCapacityHours = 5; // Low capacity

      const action: AppAction = {
        type: 'ADD_TASK',
        payload: mockTask,
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek.isOverloaded).toBe(true);
    });

    it('should handle UPDATE_TASK', () => {
      const initialState = createInitialState();
      initialState.currentWeek.tasks = [mockTask];

      const action: AppAction = {
        type: 'UPDATE_TASK',
        payload: {
          id: 'task-1',
          updates: { status: 'completed', actualHours: 7 },
        },
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek.tasks[0].status).toBe('completed');
      expect(newState.currentWeek.tasks[0].actualHours).toBe(7);
      expect(newState.currentWeek.tasks[0].title).toBe('Test Task'); // Unchanged
    });

    it('should handle DELETE_TASK', () => {
      const initialState = createInitialState();
      initialState.currentWeek.tasks = [mockTask];
      initialState.currentWeek.totalScheduledHours = 8;

      const action: AppAction = {
        type: 'DELETE_TASK',
        payload: 'task-1',
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek.tasks).toHaveLength(0);
      expect(newState.currentWeek.totalScheduledHours).toBe(0);
      expect(newState.currentWeek.isOverloaded).toBe(false);
    });

    it('should handle DELETE_TASK for non-existent task', () => {
      const initialState = createInitialState();
      initialState.currentWeek.tasks = [mockTask];
      initialState.currentWeek.totalScheduledHours = 8;

      const action: AppAction = {
        type: 'DELETE_TASK',
        payload: 'non-existent',
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek.tasks).toHaveLength(1);
      expect(newState.currentWeek.totalScheduledHours).toBe(8);
    });

    it('should update overload status when deleting task', () => {
      const initialState = createInitialState();
      initialState.currentWeek.tasks = [mockTask];
      initialState.currentWeek.totalScheduledHours = 8;
      initialState.currentWeek.isOverloaded = true;
      initialState.userSettings.weeklyCapacityHours = 5;

      const action: AppAction = {
        type: 'DELETE_TASK',
        payload: 'task-1',
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek.isOverloaded).toBe(false);
    });
  });

  describe('Schedule Actions', () => {
    it('should handle SET_CURRENT_WEEK', () => {
      const initialState = createInitialState();
      const newWeek = {
        weekStartDate: new Date('2024-01-08'),
        tasks: [mockTask],
        totalScheduledHours: 8,
        userCapacityHours: 40,
        isOverloaded: false,
      };

      const action: AppAction = {
        type: 'SET_CURRENT_WEEK',
        payload: newWeek,
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek).toEqual(newWeek);
      expect(newState.currentWeek.weekStartDate.getTime()).toBe(new Date('2024-01-08').getTime());
    });

    it('should handle SET_SELECTED_CHANNEL', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'SET_SELECTED_CHANNEL',
        payload: 'channel-1',
      };

      const newState = appReducer(initialState, action);

      expect(newState.selectedChannelId).toBe('channel-1');
    });

    it('should handle SET_SELECTED_CHANNEL with undefined', () => {
      const initialState = createInitialState();
      initialState.selectedChannelId = 'channel-1';

      const action: AppAction = {
        type: 'SET_SELECTED_CHANNEL',
        payload: undefined,
      };

      const newState = appReducer(initialState, action);

      expect(newState.selectedChannelId).toBeUndefined();
    });
  });

  describe('User Settings Actions', () => {
    it('should handle UPDATE_USER_SETTINGS', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'UPDATE_USER_SETTINGS',
        payload: {
          weeklyCapacityHours: 50,
          workingDays: ['Monday', 'Tuesday', 'Wednesday'],
        },
      };

      const newState = appReducer(initialState, action);

      expect(newState.userSettings.weeklyCapacityHours).toBe(50);
      expect(newState.userSettings.workingDays).toEqual(['Monday', 'Tuesday', 'Wednesday']);
      expect(newState.userSettings.workingHours).toEqual({ start: '09:00', end: '17:00' }); // Unchanged
      expect(newState.currentWeek.userCapacityHours).toBe(50);
    });

    it('should update overload status when changing capacity', () => {
      const initialState = createInitialState();
      initialState.currentWeek.tasks = [mockTask];
      initialState.currentWeek.totalScheduledHours = 8;

      const action: AppAction = {
        type: 'UPDATE_USER_SETTINGS',
        payload: { weeklyCapacityHours: 5 },
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek.isOverloaded).toBe(true);
    });
  });

  describe('UI Actions', () => {
    it('should handle SET_ACTIVE_VIEW', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'SET_ACTIVE_VIEW',
        payload: 'calendar',
      };

      const newState = appReducer(initialState, action);

      expect(newState.ui.activeView).toBe('calendar');
      expect(newState.ui.isLoading).toBe(false); // Unchanged
    });

    it('should handle SET_LOADING', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'SET_LOADING',
        payload: true,
      };

      const newState = appReducer(initialState, action);

      expect(newState.ui.isLoading).toBe(true);
      expect(newState.ui.activeView).toBe('dashboard'); // Unchanged
    });

    it('should handle ADD_ERROR', () => {
      const initialState = createInitialState();
      const action: AppAction = {
        type: 'ADD_ERROR',
        payload: 'Test error message',
      };

      const newState = appReducer(initialState, action);

      expect(newState.ui.errors).toHaveLength(1);
      expect(newState.ui.errors[0]).toBe('Test error message');
    });

    it('should handle multiple ADD_ERROR actions', () => {
      const initialState = createInitialState();
      
      let state = appReducer(initialState, {
        type: 'ADD_ERROR',
        payload: 'First error',
      });

      state = appReducer(state, {
        type: 'ADD_ERROR',
        payload: 'Second error',
      });

      expect(state.ui.errors).toHaveLength(2);
      expect(state.ui.errors).toEqual(['First error', 'Second error']);
    });

    it('should handle CLEAR_ERRORS', () => {
      const initialState = createInitialState();
      initialState.ui.errors = ['Error 1', 'Error 2'];

      const action: AppAction = {
        type: 'CLEAR_ERRORS',
      };

      const newState = appReducer(initialState, action);

      expect(newState.ui.errors).toHaveLength(0);
    });
  });

  describe('Unknown Actions', () => {
    it('should return current state for unknown action', () => {
      const initialState = createInitialState();
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any;

      const newState = appReducer(initialState, unknownAction);

      expect(newState).toBe(initialState);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state', () => {
      const initialState = createInitialState();
      const originalChannels = initialState.channels;
      const originalUI = initialState.ui;

      const action: AppAction = {
        type: 'ADD_CHANNEL',
        payload: mockChannel,
      };

      const newState = appReducer(initialState, action);

      expect(newState).not.toBe(initialState);
      expect(newState.channels).not.toBe(originalChannels);
      expect(newState.ui).toBe(originalUI); // UI unchanged, should be same reference
      expect(initialState.channels).toHaveLength(0); // Original unchanged
    });

    it('should create new objects for nested updates', () => {
      const initialState = createInitialState();
      initialState.currentWeek.tasks = [mockTask];
      const originalCurrentWeek = initialState.currentWeek;
      const originalTasks = initialState.currentWeek.tasks;

      const action: AppAction = {
        type: 'UPDATE_TASK',
        payload: {
          id: 'task-1',
          updates: { status: 'completed' },
        },
      };

      const newState = appReducer(initialState, action);

      expect(newState.currentWeek).not.toBe(originalCurrentWeek);
      expect(newState.currentWeek.tasks).not.toBe(originalTasks);
      expect(originalTasks[0].status).toBe('planned'); // Original unchanged
    });
  });

  describe('Complex State Updates', () => {
    it('should handle multiple related updates correctly', () => {
      let state = createInitialState();

      // Add channel
      state = appReducer(state, {
        type: 'ADD_CHANNEL',
        payload: mockChannel,
      });

      // Add template
      state = appReducer(state, {
        type: 'ADD_TEMPLATE',
        payload: mockTemplate,
      });

      // Add task
      state = appReducer(state, {
        type: 'ADD_TASK',
        payload: mockTask,
      });

      // Update user settings
      state = appReducer(state, {
        type: 'UPDATE_USER_SETTINGS',
        payload: { weeklyCapacityHours: 5 }, // Make it clearly overloaded
      });

      expect(state.channels).toHaveLength(1);
      expect(state.templates).toHaveLength(1);
      expect(state.currentWeek.tasks).toHaveLength(1);
      expect(state.currentWeek.isOverloaded).toBe(true); // 8 hours > 5 capacity
      expect(state.userSettings.weeklyCapacityHours).toBe(5);
    });

    it('should maintain consistency across related state', () => {
      const initialState = createInitialState();
      initialState.currentWeek.tasks = [mockTask];
      initialState.currentWeek.totalScheduledHours = 8;
      initialState.userSettings.weeklyCapacityHours = 10;

      // Delete the task
      const newState = appReducer(initialState, {
        type: 'DELETE_TASK',
        payload: 'task-1',
      });

      expect(newState.currentWeek.tasks).toHaveLength(0);
      expect(newState.currentWeek.totalScheduledHours).toBe(0);
      expect(newState.currentWeek.isOverloaded).toBe(false);
    });
  });
});