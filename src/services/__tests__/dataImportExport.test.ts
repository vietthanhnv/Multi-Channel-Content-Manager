import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageService } from '../localStorage';
import { Channel, ContentTemplate, WeeklySchedule } from '../../types';
import { STORAGE_KEYS, APP_VERSION } from '../../utils/constants';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Data Import/Export Engine
export class DataImportExportEngine {
  /**
   * Validate imported JSON data structure
   */
  static validateImportData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format: must be an object');
      return { isValid: false, errors };
    }

    // Check required fields
    const requiredFields = ['version', 'channels', 'templates', 'schedules', 'userSettings', 'exportDate'];
    for (const field of requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate version compatibility
    if (data.version && typeof data.version === 'string') {
      const [majorVersion] = data.version.split('.');
      const [currentMajorVersion] = APP_VERSION.split('.');
      
      if (majorVersion !== currentMajorVersion) {
        errors.push(`Version incompatibility: expected ${currentMajorVersion}.x.x, got ${data.version}`);
      }
    }

    // Validate channels array
    if (data.channels && !Array.isArray(data.channels)) {
      errors.push('Channels must be an array');
    } else if (data.channels) {
      data.channels.forEach((channel: any, index: number) => {
        if (!this.isValidChannel(channel)) {
          errors.push(`Invalid channel at index ${index}`);
        }
      });
    }

    // Validate templates array
    if (data.templates && !Array.isArray(data.templates)) {
      errors.push('Templates must be an array');
    } else if (data.templates) {
      data.templates.forEach((template: any, index: number) => {
        if (!this.isValidTemplate(template)) {
          errors.push(`Invalid template at index ${index}`);
        }
      });
    }

    // Validate schedules object
    if (data.schedules && typeof data.schedules !== 'object') {
      errors.push('Schedules must be an object');
    }

    // Validate user settings
    if (data.userSettings && !this.isValidUserSettings(data.userSettings)) {
      errors.push('Invalid user settings format');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Import data with merge or replace strategy
   */
  static async importData(
    jsonData: string,
    strategy: 'merge' | 'replace' = 'replace'
  ): Promise<{ success: boolean; errors: string[]; summary: string }> {
    try {
      const data = JSON.parse(jsonData);
      const validation = this.validateImportData(data);

      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          summary: 'Import failed due to validation errors',
        };
      }

      const service = LocalStorageService.getInstance();
      let importedChannels = 0;
      let importedTemplates = 0;
      let importedSchedules = 0;

      if (strategy === 'replace') {
        // Clear existing data
        service.clearAllData();
      }

      // Import channels
      if (data.channels && Array.isArray(data.channels)) {
        const existingChannels = strategy === 'merge' ? service.getChannels() : [];
        
        for (const channelData of data.channels) {
          const existingIndex = existingChannels.findIndex(c => c.id === channelData.id);
          
          if (existingIndex >= 0 && strategy === 'merge') {
            // Update existing channel
            service.updateChannel(channelData.id, channelData);
          } else {
            // Add new channel
            service.addChannel({
              ...channelData,
              createdAt: new Date(channelData.createdAt),
            });
          }
          importedChannels++;
        }
      }

      // Import templates
      if (data.templates && Array.isArray(data.templates)) {
        const existingTemplates = strategy === 'merge' ? service.getTemplates() : [];
        
        for (const templateData of data.templates) {
          const existingIndex = existingTemplates.findIndex(t => t.id === templateData.id);
          
          if (existingIndex >= 0 && strategy === 'merge') {
            // Update existing template
            service.updateTemplate(templateData.id, templateData);
          } else {
            // Add new template
            service.addTemplate(templateData);
          }
          importedTemplates++;
        }
      }

      // Import schedules
      if (data.schedules && typeof data.schedules === 'object') {
        for (const [weekKey, scheduleData] of Object.entries(data.schedules)) {
          const schedule = scheduleData as any;
          service.setSchedule(weekKey, {
            ...schedule,
            weekStartDate: new Date(schedule.weekStartDate),
            tasks: schedule.tasks.map((task: any) => ({
              ...task,
              scheduledStart: new Date(task.scheduledStart),
              scheduledEnd: new Date(task.scheduledEnd),
            })),
          });
          importedSchedules++;
        }
      }

      // Import user settings
      if (data.userSettings) {
        service.updateUserSettings(data.userSettings);
      }

      const summary = `Successfully imported ${importedChannels} channels, ${importedTemplates} templates, and ${importedSchedules} schedules`;

      return {
        success: true,
        errors: [],
        summary,
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        summary: 'Import failed due to parsing error',
      };
    }
  }

  /**
   * Export data with optional filtering
   */
  static exportData(options: {
    includeChannels?: boolean;
    includeTemplates?: boolean;
    includeSchedules?: boolean;
    includeUserSettings?: boolean;
    dateRange?: { start: Date; end: Date };
  } = {}): string {
    const {
      includeChannels = true,
      includeTemplates = true,
      includeSchedules = true,
      includeUserSettings = true,
      dateRange,
    } = options;

    const service = LocalStorageService.getInstance();
    const exportData: any = {
      version: APP_VERSION,
      exportDate: new Date().toISOString(),
    };

    if (includeChannels) {
      exportData.channels = service.getChannels();
    }

    if (includeTemplates) {
      exportData.templates = service.getTemplates();
    }

    if (includeSchedules) {
      let schedules = service.getSchedules();
      
      // Filter by date range if specified
      if (dateRange) {
        const filteredSchedules: Record<string, WeeklySchedule> = {};
        
        for (const [weekKey, schedule] of Object.entries(schedules)) {
          const weekDate = new Date(schedule.weekStartDate);
          if (weekDate >= dateRange.start && weekDate <= dateRange.end) {
            filteredSchedules[weekKey] = schedule;
          }
        }
        
        schedules = filteredSchedules;
      }
      
      exportData.schedules = schedules;
    }

    if (includeUserSettings) {
      exportData.userSettings = service.getUserSettings();
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Create backup with timestamp
   */
  static createBackup(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = this.exportData();
    
    // Add backup metadata
    const backup = JSON.parse(backupData);
    backup.backupTimestamp = timestamp;
    backup.backupType = 'automatic';
    
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Compare two data sets and return differences
   */
  static compareData(current: any, imported: any): {
    channelDifferences: Array<{ type: 'added' | 'updated' | 'removed'; channel: Channel }>;
    templateDifferences: Array<{ type: 'added' | 'updated' | 'removed'; template: ContentTemplate }>;
    scheduleDifferences: Array<{ type: 'added' | 'updated' | 'removed'; weekKey: string }>;
  } {
    const channelDifferences: Array<{ type: 'added' | 'updated' | 'removed'; channel: Channel }> = [];
    const templateDifferences: Array<{ type: 'added' | 'updated' | 'removed'; template: ContentTemplate }> = [];
    const scheduleDifferences: Array<{ type: 'added' | 'updated' | 'removed'; weekKey: string }> = [];

    // Compare channels
    const currentChannels = current.channels || [];
    const importedChannels = imported.channels || [];

    // Find added and updated channels
    for (const importedChannel of importedChannels) {
      const currentChannel = currentChannels.find((c: Channel) => c.id === importedChannel.id);
      
      if (!currentChannel) {
        channelDifferences.push({ type: 'added', channel: importedChannel });
      } else if (JSON.stringify(currentChannel) !== JSON.stringify(importedChannel)) {
        channelDifferences.push({ type: 'updated', channel: importedChannel });
      }
    }

    // Find removed channels
    for (const currentChannel of currentChannels) {
      const importedChannel = importedChannels.find((c: Channel) => c.id === currentChannel.id);
      
      if (!importedChannel) {
        channelDifferences.push({ type: 'removed', channel: currentChannel });
      }
    }

    // Similar logic for templates
    const currentTemplates = current.templates || [];
    const importedTemplates = imported.templates || [];

    for (const importedTemplate of importedTemplates) {
      const currentTemplate = currentTemplates.find((t: ContentTemplate) => t.id === importedTemplate.id);
      
      if (!currentTemplate) {
        templateDifferences.push({ type: 'added', template: importedTemplate });
      } else if (JSON.stringify(currentTemplate) !== JSON.stringify(importedTemplate)) {
        templateDifferences.push({ type: 'updated', template: importedTemplate });
      }
    }

    for (const currentTemplate of currentTemplates) {
      const importedTemplate = importedTemplates.find((t: ContentTemplate) => t.id === currentTemplate.id);
      
      if (!importedTemplate) {
        templateDifferences.push({ type: 'removed', template: currentTemplate });
      }
    }

    // Compare schedules
    const currentSchedules = current.schedules || {};
    const importedSchedules = imported.schedules || {};

    for (const weekKey of Object.keys(importedSchedules)) {
      if (!currentSchedules[weekKey]) {
        scheduleDifferences.push({ type: 'added', weekKey });
      } else if (JSON.stringify(currentSchedules[weekKey]) !== JSON.stringify(importedSchedules[weekKey])) {
        scheduleDifferences.push({ type: 'updated', weekKey });
      }
    }

    for (const weekKey of Object.keys(currentSchedules)) {
      if (!importedSchedules[weekKey]) {
        scheduleDifferences.push({ type: 'removed', weekKey });
      }
    }

    return { channelDifferences, templateDifferences, scheduleDifferences };
  }

  // Helper validation methods
  private static isValidChannel(channel: any): boolean {
    return (
      channel &&
      typeof channel.id === 'string' &&
      typeof channel.name === 'string' &&
      typeof channel.contentType === 'string' &&
      channel.postingSchedule &&
      typeof channel.color === 'string' &&
      typeof channel.isActive === 'boolean'
    );
  }

  private static isValidTemplate(template: any): boolean {
    return (
      template &&
      typeof template.id === 'string' &&
      typeof template.name === 'string' &&
      typeof template.contentType === 'string' &&
      template.estimatedHours &&
      Array.isArray(template.workflowSteps) &&
      Array.isArray(template.channelIds)
    );
  }

  private static isValidUserSettings(settings: any): boolean {
    return (
      settings &&
      typeof settings.weeklyCapacityHours === 'number' &&
      Array.isArray(settings.workingDays) &&
      settings.workingHours &&
      typeof settings.workingHours.start === 'string' &&
      typeof settings.workingHours.end === 'string'
    );
  }
}

describe('DataImportExportEngine', () => {
  let service: LocalStorageService;

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

  const mockSchedule: WeeklySchedule = {
    weekStartDate: new Date('2024-01-01'),
    tasks: [{
      id: 'task-1',
      channelId: 'channel-1',
      title: 'Test Task',
      contentType: 'video',
      estimatedHours: 8,
      status: 'planned',
      scheduledStart: new Date('2024-01-01T10:00:00'),
      scheduledEnd: new Date('2024-01-01T18:00:00'),
    }],
    totalScheduledHours: 8,
    userCapacityHours: 40,
    isOverloaded: false,
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    service = LocalStorageService.getInstance();
  });

  describe('validateImportData', () => {
    it('should validate correct data structure', () => {
      const validData = {
        version: '1.0.0',
        channels: [mockChannel],
        templates: [mockTemplate],
        schedules: { '2024-01-01': mockSchedule },
        userSettings: {
          weeklyCapacityHours: 40,
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          workingHours: { start: '09:00', end: '17:00' },
        },
        exportDate: '2024-01-01T00:00:00.000Z',
      };

      const result = DataImportExportEngine.validateImportData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid data format', () => {
      const result = DataImportExportEngine.validateImportData(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid data format: must be an object');
    });

    it('should detect missing required fields', () => {
      const incompleteData = {
        version: '1.0.0',
        channels: [],
        // Missing templates, schedules, userSettings, exportDate
      };

      const result = DataImportExportEngine.validateImportData(incompleteData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required field'))).toBe(true);
    });

    it('should detect version incompatibility', () => {
      const incompatibleData = {
        version: '2.0.0', // Different major version
        channels: [],
        templates: [],
        schedules: {},
        userSettings: {},
        exportDate: '2024-01-01T00:00:00.000Z',
      };

      const result = DataImportExportEngine.validateImportData(incompatibleData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Version incompatibility'))).toBe(true);
    });

    it('should validate channel structure', () => {
      const invalidData = {
        version: '1.0.0',
        channels: [{ id: 'invalid' }], // Missing required fields
        templates: [],
        schedules: {},
        userSettings: {
          weeklyCapacityHours: 40,
          workingDays: ['Monday'],
          workingHours: { start: '09:00', end: '17:00' },
        },
        exportDate: '2024-01-01T00:00:00.000Z',
      };

      const result = DataImportExportEngine.validateImportData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid channel'))).toBe(true);
    });

    it('should validate template structure', () => {
      const invalidData = {
        version: '1.0.0',
        channels: [],
        templates: [{ id: 'invalid' }], // Missing required fields
        schedules: {},
        userSettings: {
          weeklyCapacityHours: 40,
          workingDays: ['Monday'],
          workingHours: { start: '09:00', end: '17:00' },
        },
        exportDate: '2024-01-01T00:00:00.000Z',
      };

      const result = DataImportExportEngine.validateImportData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid template'))).toBe(true);
    });
  });

  describe('exportData', () => {
    it('should export all data by default', () => {
      service.addChannel(mockChannel);
      service.addTemplate(mockTemplate);
      service.setSchedule('2024-01-01', mockSchedule);

      const exportedData = DataImportExportEngine.exportData();
      const parsed = JSON.parse(exportedData);

      expect(parsed.version).toBe(APP_VERSION);
      expect(parsed.channels).toHaveLength(1);
      expect(parsed.templates).toHaveLength(1);
      expect(parsed.schedules['2024-01-01']).toBeDefined();
      expect(parsed.userSettings).toBeDefined();
      expect(parsed.exportDate).toBeDefined();
    });

    it('should respect export options', () => {
      service.addChannel(mockChannel);
      service.addTemplate(mockTemplate);

      const exportedData = DataImportExportEngine.exportData({
        includeChannels: true,
        includeTemplates: false,
        includeSchedules: false,
        includeUserSettings: false,
      });

      const parsed = JSON.parse(exportedData);

      expect(parsed.channels).toHaveLength(1);
      expect(parsed.templates).toBeUndefined();
      expect(parsed.schedules).toBeUndefined();
      expect(parsed.userSettings).toBeUndefined();
    });

    it('should filter schedules by date range', () => {
      service.setSchedule('2024-01-01', mockSchedule);
      service.setSchedule('2024-01-08', { ...mockSchedule, weekStartDate: new Date('2024-01-08') });
      service.setSchedule('2024-01-15', { ...mockSchedule, weekStartDate: new Date('2024-01-15') });

      const exportedData = DataImportExportEngine.exportData({
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-10'),
        },
      });

      const parsed = JSON.parse(exportedData);

      expect(Object.keys(parsed.schedules)).toHaveLength(2);
      expect(parsed.schedules['2024-01-01']).toBeDefined();
      expect(parsed.schedules['2024-01-08']).toBeDefined();
      expect(parsed.schedules['2024-01-15']).toBeUndefined();
    });
  });

  describe('importData', () => {
    it('should import valid data with replace strategy', async () => {
      const importData = {
        version: '1.0.0',
        channels: [mockChannel],
        templates: [mockTemplate],
        schedules: { '2024-01-01': mockSchedule },
        userSettings: {
          weeklyCapacityHours: 50,
          workingDays: ['Monday', 'Tuesday'],
          workingHours: { start: '08:00', end: '16:00' },
        },
        exportDate: '2024-01-01T00:00:00.000Z',
      };

      const result = await DataImportExportEngine.importData(
        JSON.stringify(importData),
        'replace'
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain('Successfully imported');

      // Verify data was imported
      expect(service.getChannels()).toHaveLength(1);
      expect(service.getTemplates()).toHaveLength(1);
      expect(service.getSchedule('2024-01-01')).toBeDefined();
      expect(service.getUserSettings().weeklyCapacityHours).toBe(50);
    });

    it('should import data with merge strategy', async () => {
      // Add existing data
      service.addChannel(mockChannel);
      const existingTemplate = { ...mockTemplate, id: 'existing-template' };
      service.addTemplate(existingTemplate);

      const importData = {
        version: '1.0.0',
        channels: [{ ...mockChannel, name: 'Updated Channel' }],
        templates: [mockTemplate], // New template
        schedules: { '2024-01-01': mockSchedule },
        userSettings: {
          weeklyCapacityHours: 50,
          workingDays: ['Monday', 'Tuesday'],
          workingHours: { start: '08:00', end: '16:00' },
        },
        exportDate: '2024-01-01T00:00:00.000Z',
      };

      const result = await DataImportExportEngine.importData(
        JSON.stringify(importData),
        'merge'
      );

      expect(result.success).toBe(true);

      // Should have both templates
      expect(service.getTemplates()).toHaveLength(2);
      
      // Channel should be updated
      const updatedChannel = service.getChannel('channel-1');
      expect(updatedChannel?.name).toBe('Updated Channel');
    });

    it('should handle invalid JSON', async () => {
      const result = await DataImportExportEngine.importData('invalid json');

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary).toContain('parsing error');
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        version: '2.0.0', // Incompatible version
        channels: [],
        templates: [],
        schedules: {},
        userSettings: {},
        exportDate: '2024-01-01T00:00:00.000Z',
      };

      const result = await DataImportExportEngine.importData(JSON.stringify(invalidData));

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Version incompatibility'))).toBe(true);
    });
  });

  describe('createBackup', () => {
    it('should create backup with metadata', () => {
      service.addChannel(mockChannel);
      service.addTemplate(mockTemplate);

      const backup = DataImportExportEngine.createBackup();
      const parsed = JSON.parse(backup);

      expect(parsed.backupTimestamp).toBeDefined();
      expect(parsed.backupType).toBe('automatic');
      expect(parsed.version).toBe(APP_VERSION);
      expect(parsed.channels).toHaveLength(1);
      expect(parsed.templates).toHaveLength(1);
    });
  });

  describe('compareData', () => {
    it('should detect added channels', () => {
      const current = { channels: [], templates: [], schedules: {} };
      const imported = { channels: [mockChannel], templates: [], schedules: {} };

      const differences = DataImportExportEngine.compareData(current, imported);

      expect(differences.channelDifferences).toHaveLength(1);
      expect(differences.channelDifferences[0].type).toBe('added');
      expect(differences.channelDifferences[0].channel.id).toBe('channel-1');
    });

    it('should detect updated channels', () => {
      const current = { channels: [mockChannel], templates: [], schedules: {} };
      const imported = { 
        channels: [{ ...mockChannel, name: 'Updated Channel' }], 
        templates: [], 
        schedules: {} 
      };

      const differences = DataImportExportEngine.compareData(current, imported);

      expect(differences.channelDifferences).toHaveLength(1);
      expect(differences.channelDifferences[0].type).toBe('updated');
    });

    it('should detect removed channels', () => {
      const current = { channels: [mockChannel], templates: [], schedules: {} };
      const imported = { channels: [], templates: [], schedules: {} };

      const differences = DataImportExportEngine.compareData(current, imported);

      expect(differences.channelDifferences).toHaveLength(1);
      expect(differences.channelDifferences[0].type).toBe('removed');
    });

    it('should detect template differences', () => {
      const current = { channels: [], templates: [], schedules: {} };
      const imported = { channels: [], templates: [mockTemplate], schedules: {} };

      const differences = DataImportExportEngine.compareData(current, imported);

      expect(differences.templateDifferences).toHaveLength(1);
      expect(differences.templateDifferences[0].type).toBe('added');
    });

    it('should detect schedule differences', () => {
      const current = { channels: [], templates: [], schedules: {} };
      const imported = { channels: [], templates: [], schedules: { '2024-01-01': mockSchedule } };

      const differences = DataImportExportEngine.compareData(current, imported);

      expect(differences.scheduleDifferences).toHaveLength(1);
      expect(differences.scheduleDifferences[0].type).toBe('added');
      expect(differences.scheduleDifferences[0].weekKey).toBe('2024-01-01');
    });
  });
});