import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataBackupService } from '../dataBackup';

// Mock localStorage
const localStorageMock = (() => {
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
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('DataBackupService', () => {
  let backupService: DataBackupService;

  beforeEach(() => {
    localStorageMock.clear();
    backupService = DataBackupService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = DataBackupService.getInstance();
      const instance2 = DataBackupService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createBackup', () => {
    it('creates a backup with current data', async () => {
      // Setup test data
      const testChannels = [{ id: '1', name: 'Test Channel' }];
      const testTemplates = [{ id: '1', name: 'Test Template' }];
      
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));
      localStorageMock.setItem('mcm_templates', JSON.stringify(testTemplates));

      const backupId = await backupService.createBackup('Test backup');

      expect(backupId).toBeDefined();
      expect(typeof backupId).toBe('string');

      // Check that backup was stored
      const backupKey = `mcm_backup_${backupId}`;
      const backupData = localStorageMock.getItem(backupKey);
      expect(backupData).toBeDefined();

      const parsedBackup = JSON.parse(backupData!);
      expect(parsedBackup.channels).toEqual(testChannels);
      expect(parsedBackup.templates).toEqual(testTemplates);
      expect(parsedBackup.version).toBe('1.0.0');
    });

    it('updates backup metadata', async () => {
      const backupId = await backupService.createBackup('Test backup');

      const backupList = backupService.getBackupList();
      expect(backupList).toHaveLength(1);
      expect(backupList[0].id).toBe(backupId);
      expect(backupList[0].description).toBe('Test backup');
    });

    it('handles empty data gracefully', async () => {
      const backupId = await backupService.createBackup();

      const backupKey = `mcm_backup_${backupId}`;
      const backupData = localStorageMock.getItem(backupKey);
      const parsedBackup = JSON.parse(backupData!);

      expect(parsedBackup.channels).toEqual([]);
      expect(parsedBackup.templates).toEqual([]);
      expect(parsedBackup.schedules).toEqual({});
      expect(parsedBackup.userSettings).toEqual({});
    });
  });

  describe('restoreBackup', () => {
    it('restores data from backup', async () => {
      // Create test data and backup
      const testChannels = [{ id: '1', name: 'Test Channel' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));

      const backupId = await backupService.createBackup('Test backup');

      // Modify current data
      const modifiedChannels = [{ id: '2', name: 'Modified Channel' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(modifiedChannels));

      // Restore from backup
      await backupService.restoreBackup(backupId);

      // Check that original data was restored
      const restoredChannels = JSON.parse(localStorageMock.getItem('mcm_channels')!);
      expect(restoredChannels).toEqual(testChannels);
    });

    it('allows selective restoration', async () => {
      const testChannels = [{ id: '1', name: 'Test Channel' }];
      const testTemplates = [{ id: '1', name: 'Test Template' }];
      
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));
      localStorageMock.setItem('mcm_templates', JSON.stringify(testTemplates));

      const backupId = await backupService.createBackup('Test backup');

      // Modify current data
      localStorageMock.setItem('mcm_channels', JSON.stringify([{ id: '2', name: 'Modified' }]));
      localStorageMock.setItem('mcm_templates', JSON.stringify([{ id: '2', name: 'Modified' }]));

      // Restore only channels
      await backupService.restoreBackup(backupId, {
        restoreChannels: true,
        restoreTemplates: false,
        restoreSchedules: false,
        restoreUserSettings: false
      });

      // Check that only channels were restored
      const restoredChannels = JSON.parse(localStorageMock.getItem('mcm_channels')!);
      const currentTemplates = JSON.parse(localStorageMock.getItem('mcm_templates')!);

      expect(restoredChannels).toEqual(testChannels);
      expect(currentTemplates).toEqual([{ id: '2', name: 'Modified' }]);
    });

    it('throws error for non-existent backup', async () => {
      await expect(backupService.restoreBackup('non-existent')).rejects.toThrow();
    });
  });

  describe('getBackupList', () => {
    it('returns empty array when no backups exist', () => {
      const backups = backupService.getBackupList();
      expect(backups).toEqual([]);
    });

    it('returns sorted backup list', async () => {
      const backupId1 = await backupService.createBackup('First backup');
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const backupId2 = await backupService.createBackup('Second backup');

      const backups = backupService.getBackupList();
      expect(backups).toHaveLength(2);
      
      // Should be sorted by timestamp (newest first)
      expect(backups[0].id).toBe(backupId2);
      expect(backups[1].id).toBe(backupId1);
    });
  });

  describe('deleteBackup', () => {
    it('deletes backup and updates metadata', async () => {
      const backupId = await backupService.createBackup('Test backup');

      expect(backupService.getBackupList()).toHaveLength(1);

      backupService.deleteBackup(backupId);

      expect(backupService.getBackupList()).toHaveLength(0);
      
      const backupKey = `mcm_backup_${backupId}`;
      expect(localStorageMock.getItem(backupKey)).toBeNull();
    });
  });

  describe('getBackupDetails', () => {
    it('returns backup details', async () => {
      const testChannels = [{ id: '1', name: 'Test Channel' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));

      const backupId = await backupService.createBackup('Test backup');
      const details = backupService.getBackupDetails(backupId);

      expect(details).toBeDefined();
      expect(details!.channels).toEqual(testChannels);
      expect(details!.version).toBe('1.0.0');
    });

    it('returns null for non-existent backup', () => {
      const details = backupService.getBackupDetails('non-existent');
      expect(details).toBeNull();
    });
  });

  describe('checkStorageSpace', () => {
    it('returns storage information', () => {
      const storageInfo = backupService.checkStorageSpace();
      
      expect(storageInfo).toHaveProperty('available');
      expect(storageInfo).toHaveProperty('usedSpace');
      expect(storageInfo).toHaveProperty('totalSpace');
      expect(typeof storageInfo.available).toBe('boolean');
      expect(typeof storageInfo.usedSpace).toBe('number');
      expect(typeof storageInfo.totalSpace).toBe('number');
    });
  });

  describe('importBackup', () => {
    it('imports valid backup file', async () => {
      const backupData = {
        version: '1.0.0',
        timestamp: new Date(),
        channels: [{ id: '1', name: 'Imported Channel' }],
        templates: [],
        schedules: {},
        userSettings: {}
      };

      const file = new File([JSON.stringify(backupData)], 'backup.json', {
        type: 'application/json'
      });

      const backupId = await backupService.importBackup(file, 'Imported backup');

      expect(backupId).toBeDefined();
      
      const details = backupService.getBackupDetails(backupId);
      expect(details!.channels).toEqual(backupData.channels);
      
      const backupList = backupService.getBackupList();
      expect(backupList[0].description).toContain('Imported');
    });

    it('rejects invalid backup file', async () => {
      const invalidData = { invalid: 'data' };
      const file = new File([JSON.stringify(invalidData)], 'invalid.json', {
        type: 'application/json'
      });

      await expect(backupService.importBackup(file)).rejects.toThrow('Invalid backup file format');
    });
  });
});