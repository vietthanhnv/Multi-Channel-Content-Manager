import { 
  LocalStorageService, 
  LocalStorageError, 
  QuotaExceededError, 
  DataCorruptionError 
} from '../localStorage';
import { Channel, ContentTemplate, WeeklySchedule } from '../../types';
import { STORAGE_KEYS, APP_VERSION, DEFAULT_USER_SETTINGS } from '../../utils/constants';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    hasOwnProperty: jest.fn((key: string) => key in store),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test data
const mockChannel: Channel = {
  id: 'channel-1',
  name: 'Test Channel',
  contentType: 'gaming',
  postingSchedule: {
    frequency: 'weekly',
    preferredDays: ['Monday', 'Wednesday'],
    preferredTimes: ['10:00', '14:00'],
  },
  color: '#ff0000',
  createdAt: new Date('2024-01-01'),
  isActive: true,
};

const mockTemplate: ContentTemplate = {
  id: 'template-1',
  name: 'Gaming Video Template',
  contentType: 'video',
  estimatedHours: {
    planning: 1,
    production: 4,
    editing: 3,
    publishing: 0.5,
  },
  workflowSteps: ['Plan content', 'Record', 'Edit', 'Upload'],
  channelIds: ['channel-1'],
};

const mockSchedule: WeeklySchedule = {
  weekStartDate: new Date('2024-01-01'),
  tasks: [],
  totalScheduledHours: 0,
  userCapacityHours: 40,
  isOverloaded: false,
};

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    mockLocalStorage.clear();
    jest.clearAllMocks();
    service = LocalStorageService.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize storage with default values', () => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.APP_VERSION, APP_VERSION);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.CHANNELS, JSON.stringify([]));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.TEMPLATES, JSON.stringify([]));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.SCHEDULES, JSON.stringify({}));
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(DEFAULT_USER_SETTINGS));
    });

    it('should be a singleton', () => {
      const instance1 = LocalStorageService.getInstance();
      const instance2 = LocalStorageService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Channel CRUD Operations', () => {
    it('should add a channel', () => {
      service.addChannel(mockChannel);
      const channels = service.getChannels();
      expect(channels).toHaveLength(1);
      expect(channels[0]).toEqual(mockChannel);
    });

    it('should get a channel by id', () => {
      service.addChannel(mockChannel);
      const channel = service.getChannel('channel-1');
      expect(channel).toEqual(mockChannel);
    });

    it('should return null for non-existent channel', () => {
      const channel = service.getChannel('non-existent');
      expect(channel).toBeNull();
    });

    it('should update a channel', () => {
      service.addChannel(mockChannel);
      service.updateChannel('channel-1', { name: 'Updated Channel' });
      
      const updatedChannel = service.getChannel('channel-1');
      expect(updatedChannel?.name).toBe('Updated Channel');
      expect(updatedChannel?.contentType).toBe('gaming'); // Other properties unchanged
    });

    it('should throw error when updating non-existent channel', () => {
      expect(() => {
        service.updateChannel('non-existent', { name: 'Updated' });
      }).toThrow(LocalStorageError);
    });

    it('should delete a channel', () => {
      service.addChannel(mockChannel);
      service.deleteChannel('channel-1');
      
      const channels = service.getChannels();
      expect(channels).toHaveLength(0);
    });

    it('should throw error when deleting non-existent channel', () => {
      expect(() => {
        service.deleteChannel('non-existent');
      }).toThrow(LocalStorageError);
    });
  });

  describe('Template CRUD Operations', () => {
    it('should add a template', () => {
      service.addTemplate(mockTemplate);
      const templates = service.getTemplates();
      expect(templates).toHaveLength(1);
      expect(templates[0]).toEqual(mockTemplate);
    });

    it('should get a template by id', () => {
      service.addTemplate(mockTemplate);
      const template = service.getTemplate('template-1');
      expect(template).toEqual(mockTemplate);
    });

    it('should return null for non-existent template', () => {
      const template = service.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    it('should update a template', () => {
      service.addTemplate(mockTemplate);
      service.updateTemplate('template-1', { name: 'Updated Template' });
      
      const updatedTemplate = service.getTemplate('template-1');
      expect(updatedTemplate?.name).toBe('Updated Template');
      expect(updatedTemplate?.contentType).toBe('video'); // Other properties unchanged
    });

    it('should throw error when updating non-existent template', () => {
      expect(() => {
        service.updateTemplate('non-existent', { name: 'Updated' });
      }).toThrow(LocalStorageError);
    });

    it('should delete a template', () => {
      service.addTemplate(mockTemplate);
      service.deleteTemplate('template-1');
      
      const templates = service.getTemplates();
      expect(templates).toHaveLength(0);
    });

    it('should throw error when deleting non-existent template', () => {
      expect(() => {
        service.deleteTemplate('non-existent');
      }).toThrow(LocalStorageError);
    });
  });

  describe('Schedule Operations', () => {
    const weekKey = '2024-01-01';

    it('should set and get a schedule', () => {
      service.setSchedule(weekKey, mockSchedule);
      const schedule = service.getSchedule(weekKey);
      expect(schedule).toEqual(mockSchedule);
    });

    it('should return null for non-existent schedule', () => {
      const schedule = service.getSchedule('non-existent');
      expect(schedule).toBeNull();
    });

    it('should get all schedules', () => {
      service.setSchedule(weekKey, mockSchedule);
      const schedules = service.getSchedules();
      expect(schedules[weekKey]).toEqual(mockSchedule);
    });

    it('should delete a schedule', () => {
      service.setSchedule(weekKey, mockSchedule);
      service.deleteSchedule(weekKey);
      
      const schedule = service.getSchedule(weekKey);
      expect(schedule).toBeNull();
    });

    it('should throw error when deleting non-existent schedule', () => {
      expect(() => {
        service.deleteSchedule('non-existent');
      }).toThrow(LocalStorageError);
    });
  });

  describe('User Settings Operations', () => {
    it('should get default user settings', () => {
      const settings = service.getUserSettings();
      expect(settings).toEqual(DEFAULT_USER_SETTINGS);
    });

    it('should update user settings', () => {
      service.updateUserSettings({ weeklyCapacityHours: 50 });
      const settings = service.getUserSettings();
      expect(settings.weeklyCapacityHours).toBe(50);
    });
  });

  describe('Utility Methods', () => {
    it('should get storage info', () => {
      const info = service.getStorageInfo();
      expect(info).toHaveProperty('used');
      expect(info).toHaveProperty('available');
      expect(info).toHaveProperty('percentage');
      expect(typeof info.used).toBe('number');
      expect(typeof info.available).toBe('number');
      expect(typeof info.percentage).toBe('number');
    });

    it('should export all data', () => {
      service.addChannel(mockChannel);
      service.addTemplate(mockTemplate);
      
      const exportData = service.exportAllData();
      const parsed = JSON.parse(exportData);
      
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('channels');
      expect(parsed).toHaveProperty('templates');
      expect(parsed).toHaveProperty('schedules');
      expect(parsed).toHaveProperty('userSettings');
      expect(parsed).toHaveProperty('exportDate');
      expect(parsed.channels).toHaveLength(1);
      expect(parsed.templates).toHaveLength(1);
    });

    it('should clear all data', () => {
      service.addChannel(mockChannel);
      service.addTemplate(mockTemplate);
      
      service.clearAllData();
      
      expect(service.getChannels()).toHaveLength(0);
      expect(service.getTemplates()).toHaveLength(0);
    });

    it('should get and set app version', () => {
      const version = service.getAppVersion();
      expect(version).toBe(APP_VERSION);
      
      service.setAppVersion('2.0.0');
      expect(service.getAppVersion()).toBe('2.0.0');
    });

    it('should cleanup old schedules', () => {
      const oldDate = new Date('2023-01-01');
      const recentDate = new Date();
      
      const oldSchedule = { ...mockSchedule, weekStartDate: oldDate };
      const recentSchedule = { ...mockSchedule, weekStartDate: recentDate };
      
      service.setSchedule('2023-01-01', oldSchedule);
      service.setSchedule('2024-01-01', recentSchedule);
      
      service.cleanupOldSchedules(4); // Keep only 4 weeks
      
      const schedules = service.getSchedules();
      expect(schedules['2023-01-01']).toBeUndefined();
      expect(schedules['2024-01-01']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle quota exceeded error', () => {
      // Mock setItem to throw quota exceeded error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        const error = new DOMException('QuotaExceededError');
        (error as any).code = 22;
        throw error;
      });

      expect(() => {
        service.addChannel(mockChannel);
      }).toThrow(QuotaExceededError);
    });

    it('should handle data corruption error', () => {
      // Mock getItem to return invalid JSON
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json');

      expect(() => {
        service.getChannels();
      }).toThrow(DataCorruptionError);
    });

    it('should handle localStorage unavailable', () => {
      // Mock localStorage to be unavailable
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('localStorage unavailable');
      });

      expect(() => {
        LocalStorageService.getInstance();
      }).toThrow();

      // Restore mock
      mockLocalStorage.setItem = originalSetItem;
    });
  });
});