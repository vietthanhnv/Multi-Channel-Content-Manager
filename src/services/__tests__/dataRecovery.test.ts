import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DataRecoveryService } from '../dataRecovery';
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
    key: (index: number) => Object.keys(store)[index] || null,
    hasOwnProperty: (key: string) => key in store
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('DataRecoveryService', () => {
  let recoveryService: DataRecoveryService;
  let backupService: DataBackupService;

  beforeEach(() => {
    localStorageMock.clear();
    recoveryService = DataRecoveryService.getInstance();
    backupService = DataBackupService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = DataRecoveryService.getInstance();
      const instance2 = DataRecoveryService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkDataIntegrity', () => {
    it('reports valid data as valid', async () => {
      // Setup valid data
      localStorageMock.setItem('mcm_channels', JSON.stringify([
        { id: '1', name: 'Test Channel', postingSchedule: {} }
      ]));
      localStorageMock.setItem('mcm_templates', JSON.stringify([
        { id: '1', name: 'Test Template' }
      ]));
      localStorageMock.setItem('mcm_schedules', JSON.stringify({}));
      localStorageMock.setItem('mcm_user_settings', JSON.stringify({}));

      const report = await recoveryService.checkDataIntegrity();

      expect(report.isValid).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('detects invalid channels data', async () => {
      // Setup invalid channels data
      localStorageMock.setItem('mcm_channels', 'invalid json');

      const report = await recoveryService.checkDataIntegrity();

      expect(report.isValid).toBe(false);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.issues.some(issue => issue.includes('channels'))).toBe(true);
    });

    it('detects missing required fields', async () => {
      // Setup channels with missing required fields
      localStorageMock.setItem('mcm_channels', JSON.stringify([
        { name: 'Test Channel' }, // missing id
        { id: '2' } // missing name
      ]));

      const report = await recoveryService.checkDataIntegrity();

      expect(report.isValid).toBe(false);
      expect(report.issues.some(issue => issue.includes('missing required fields'))).toBe(true);
    });

    it('detects non-array data where array expected', async () => {
      localStorageMock.setItem('mcm_channels', JSON.stringify({})); // should be array
      localStorageMock.setItem('mcm_templates', JSON.stringify({})); // should be array

      const report = await recoveryService.checkDataIntegrity();

      expect(report.isValid).toBe(false);
      expect(report.issues.some(issue => issue.includes('not an array'))).toBe(true);
    });

    it('detects non-object data where object expected', async () => {
      localStorageMock.setItem('mcm_schedules', JSON.stringify([])); // should be object
      localStorageMock.setItem('mcm_user_settings', JSON.stringify([])); // should be object

      const report = await recoveryService.checkDataIntegrity();

      expect(report.isValid).toBe(false);
      expect(report.issues.some(issue => issue.includes('not an object'))).toBe(true);
    });
  });

  describe('repairCorruptedData', () => {
    it('repairs invalid array data', async () => {
      const report = {
        isValid: false,
        issues: ['Channels data is not an array', 'Templates data is not an array'],
        repairedItems: [],
        unrepairedItems: []
      };

      const success = await recoveryService.repairCorruptedData(report);

      expect(success).toBe(true);
      expect(report.repairedItems).toHaveLength(2);
      expect(JSON.parse(localStorageMock.getItem('mcm_channels')!)).toEqual([]);
      expect(JSON.parse(localStorageMock.getItem('mcm_templates')!)).toEqual([]);
    });

    it('repairs invalid object data', async () => {
      const report = {
        isValid: false,
        issues: ['Schedules data is not an object', 'User settings data is not an object'],
        repairedItems: [],
        unrepairedItems: []
      };

      const success = await recoveryService.repairCorruptedData(report);

      expect(success).toBe(true);
      expect(report.repairedItems).toHaveLength(2);
      expect(JSON.parse(localStorageMock.getItem('mcm_schedules')!)).toEqual({});
      expect(JSON.parse(localStorageMock.getItem('mcm_user_settings')!)).toEqual({});
    });

    it('handles unrepairable issues', async () => {
      const report = {
        isValid: false,
        issues: ['Unknown issue that cannot be repaired'],
        repairedItems: [],
        unrepairedItems: []
      };

      const success = await recoveryService.repairCorruptedData(report);

      expect(success).toBe(false);
      expect(report.unrepairedItems).toHaveLength(1);
    });
  });

  describe('performAutoRecovery', () => {
    it('completes successfully with valid data', async () => {
      // Setup valid data
      localStorageMock.setItem('mcm_channels', JSON.stringify([]));
      localStorageMock.setItem('mcm_templates', JSON.stringify([]));
      localStorageMock.setItem('mcm_schedules', JSON.stringify({}));
      localStorageMock.setItem('mcm_user_settings', JSON.stringify({}));

      const success = await recoveryService.performAutoRecovery();

      expect(success).toBe(true);
    });

    it('repairs corrupted data during recovery', async () => {
      // Setup corrupted data
      localStorageMock.setItem('mcm_channels', 'invalid');

      const success = await recoveryService.performAutoRecovery({
        createBackupBeforeRecovery: false,
        validateDataIntegrity: true,
        repairCorruptedData: true
      });

      expect(success).toBe(true);
      // Data should be repaired
      expect(JSON.parse(localStorageMock.getItem('mcm_channels')!)).toEqual([]);
    });
  });

  describe('saveLastKnownGoodState', () => {
    it('saves current state', async () => {
      const testChannels = [{ id: '1', name: 'Test' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));

      await recoveryService.saveLastKnownGoodState();

      const lastKnownGood = JSON.parse(localStorageMock.getItem('mcm_last_known_good')!);
      expect(lastKnownGood.channels).toEqual(testChannels);
      expect(lastKnownGood.timestamp).toBeDefined();
    });
  });

  describe('restoreFromLastKnownGood', () => {
    it('restores from last known good state', async () => {
      const goodState = {
        timestamp: new Date().toISOString(),
        channels: [{ id: '1', name: 'Good Channel' }],
        templates: [],
        schedules: {},
        userSettings: {}
      };

      localStorageMock.setItem('mcm_last_known_good', JSON.stringify(goodState));

      const success = await recoveryService.restoreFromLastKnownGood();

      expect(success).toBe(true);
      expect(JSON.parse(localStorageMock.getItem('mcm_channels')!)).toEqual(goodState.channels);
    });

    it('falls back to backup when no last known good state', async () => {
      // Create a backup first
      localStorageMock.setItem('mcm_channels', JSON.stringify([{ id: '1', name: 'Backup Channel' }]));
      await backupService.createBackup('Test backup');

      // Clear current data
      localStorageMock.removeItem('mcm_channels');

      const success = await recoveryService.restoreFromLastKnownGood();

      expect(success).toBe(true);
    });
  });

  describe('getRecoveryLogs', () => {
    it('returns empty array when no logs exist', () => {
      const logs = recoveryService.getRecoveryLogs();
      expect(logs).toEqual([]);
    });

    it('returns existing logs', async () => {
      // Trigger some recovery actions to create logs
      await recoveryService.performAutoRecovery();

      const logs = recoveryService.getRecoveryLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('action');
    });
  });

  describe('clearRecoveryLogs', () => {
    it('clears all recovery logs', async () => {
      // Create some logs
      await recoveryService.performAutoRecovery();
      expect(recoveryService.getRecoveryLogs().length).toBeGreaterThan(0);

      recoveryService.clearRecoveryLogs();
      expect(recoveryService.getRecoveryLogs()).toEqual([]);
    });
  });

  describe('performStorageCleanup', () => {
    it('cleans up old recovery logs', async () => {
      // Create many log entries
      const manyLogs = Array.from({ length: 60 }, (_, i) => ({
        timestamp: new Date().toISOString(),
        action: `Test action ${i}`
      }));

      localStorageMock.setItem('mcm_recovery_log', JSON.stringify(manyLogs));

      await recoveryService.performStorageCleanup();

      const remainingLogs = recoveryService.getRecoveryLogs();
      expect(remainingLogs.length).toBeLessThanOrEqual(25);
    });

    it('cleans up old backups', async () => {
      // Create many backups
      for (let i = 0; i < 8; i++) {
        await backupService.createBackup(`Backup ${i}`);
      }

      expect(backupService.getBackupList().length).toBe(8);

      await recoveryService.performStorageCleanup();

      expect(backupService.getBackupList().length).toBeLessThanOrEqual(5);
    });
  });
});