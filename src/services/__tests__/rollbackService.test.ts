import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RollbackService, withRollback } from '../rollbackService';

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

describe('RollbackService', () => {
  let rollbackService: RollbackService;

  beforeEach(() => {
    localStorageMock.clear();
    rollbackService = RollbackService.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = RollbackService.getInstance();
      const instance2 = RollbackService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createRollbackPoint', () => {
    it('creates a rollback point with current data', async () => {
      // Setup test data
      const testChannels = [{ id: '1', name: 'Test Channel' }];
      const testTemplates = [{ id: '1', name: 'Test Template' }];
      
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));
      localStorageMock.setItem('mcm_templates', JSON.stringify(testTemplates));

      const rollbackId = await rollbackService.createRollbackPoint(
        'test_operation',
        'Test operation description'
      );

      expect(rollbackId).toBeDefined();
      expect(typeof rollbackId).toBe('string');
      expect(rollbackId).toMatch(/^rb_/);

      const rollbackPoints = rollbackService.getRollbackPoints();
      expect(rollbackPoints).toHaveLength(1);
      expect(rollbackPoints[0].id).toBe(rollbackId);
      expect(rollbackPoints[0].operation).toBe('test_operation');
      expect(rollbackPoints[0].description).toBe('Test operation description');
    });

    it('captures only specified affected keys', async () => {
      const testChannels = [{ id: '1', name: 'Test Channel' }];
      const testTemplates = [{ id: '1', name: 'Test Template' }];
      
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));
      localStorageMock.setItem('mcm_templates', JSON.stringify(testTemplates));

      const rollbackId = await rollbackService.createRollbackPoint(
        'channel_operation',
        'Only affects channels',
        ['mcm_channels']
      );

      const rollbackPoint = await rollbackService.getRollbackPoint(rollbackId);
      
      expect(rollbackPoint!.dataSnapshot.channels).toEqual(testChannels);
      expect(rollbackPoint!.dataSnapshot.templates).toBeUndefined();
      expect(rollbackPoint!.affectedKeys).toEqual(['mcm_channels']);
    });

    it('captures all data when no affected keys specified', async () => {
      const testChannels = [{ id: '1', name: 'Test Channel' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(testChannels));

      const rollbackId = await rollbackService.createRollbackPoint(
        'full_operation',
        'Affects all data'
      );

      const rollbackPoint = await rollbackService.getRollbackPoint(rollbackId);
      
      expect(rollbackPoint!.dataSnapshot.channels).toEqual(testChannels);
      expect(rollbackPoint!.dataSnapshot.templates).toEqual([]);
      expect(rollbackPoint!.dataSnapshot.schedules).toEqual({});
      expect(rollbackPoint!.dataSnapshot.userSettings).toEqual({});
    });
  });

  describe('rollback', () => {
    it('restores data from rollback point', async () => {
      // Setup initial data
      const initialChannels = [{ id: '1', name: 'Initial Channel' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(initialChannels));

      // Create rollback point
      const rollbackId = await rollbackService.createRollbackPoint(
        'test_operation',
        'Test rollback'
      );

      // Modify data
      const modifiedChannels = [{ id: '2', name: 'Modified Channel' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(modifiedChannels));

      // Rollback
      await rollbackService.rollback(rollbackId, { createBackupBeforeRollback: false });

      // Verify data was restored
      const restoredChannels = JSON.parse(localStorageMock.getItem('mcm_channels')!);
      expect(restoredChannels).toEqual(initialChannels);
    });

    it('throws error for non-existent rollback point', async () => {
      await expect(rollbackService.rollback('non-existent')).rejects.toThrow();
    });

    it('restores only affected data', async () => {
      // Setup initial data
      const initialChannels = [{ id: '1', name: 'Initial Channel' }];
      const initialTemplates = [{ id: '1', name: 'Initial Template' }];
      
      localStorageMock.setItem('mcm_channels', JSON.stringify(initialChannels));
      localStorageMock.setItem('mcm_templates', JSON.stringify(initialTemplates));

      // Create rollback point for channels only
      const rollbackId = await rollbackService.createRollbackPoint(
        'channel_operation',
        'Only affects channels',
        ['mcm_channels']
      );

      // Modify both channels and templates
      localStorageMock.setItem('mcm_channels', JSON.stringify([{ id: '2', name: 'Modified Channel' }]));
      localStorageMock.setItem('mcm_templates', JSON.stringify([{ id: '2', name: 'Modified Template' }]));

      // Rollback
      await rollbackService.rollback(rollbackId, { createBackupBeforeRollback: false });

      // Verify only channels were restored
      const restoredChannels = JSON.parse(localStorageMock.getItem('mcm_channels')!);
      const currentTemplates = JSON.parse(localStorageMock.getItem('mcm_templates')!);

      expect(restoredChannels).toEqual(initialChannels);
      expect(currentTemplates).toEqual([{ id: '2', name: 'Modified Template' }]);
    });
  });

  describe('getRollbackPoints', () => {
    it('returns empty array when no rollback points exist', () => {
      const rollbackPoints = rollbackService.getRollbackPoints();
      expect(rollbackPoints).toEqual([]);
    });

    it('returns sorted rollback points', async () => {
      const rollbackId1 = await rollbackService.createRollbackPoint('op1', 'First operation');
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const rollbackId2 = await rollbackService.createRollbackPoint('op2', 'Second operation');

      const rollbackPoints = rollbackService.getRollbackPoints();
      expect(rollbackPoints).toHaveLength(2);
      
      // Should be sorted by timestamp (newest first)
      expect(rollbackPoints[0].id).toBe(rollbackId2);
      expect(rollbackPoints[1].id).toBe(rollbackId1);
    });
  });

  describe('deleteRollbackPoint', () => {
    it('deletes rollback point', async () => {
      const rollbackId = await rollbackService.createRollbackPoint('test_op', 'Test');

      expect(rollbackService.getRollbackPoints()).toHaveLength(1);

      await rollbackService.deleteRollbackPoint(rollbackId);

      expect(rollbackService.getRollbackPoints()).toHaveLength(0);
    });
  });

  describe('clearAllRollbackPoints', () => {
    it('clears all rollback points', async () => {
      await rollbackService.createRollbackPoint('op1', 'First');
      await rollbackService.createRollbackPoint('op2', 'Second');

      expect(rollbackService.getRollbackPoints()).toHaveLength(2);

      rollbackService.clearAllRollbackPoints();

      expect(rollbackService.getRollbackPoints()).toHaveLength(0);
    });
  });

  describe('executeWithRollback', () => {
    it('executes operation successfully and returns result', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await rollbackService.executeWithRollback(
        operation,
        'test_operation',
        'Test operation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('rolls back on operation failure', async () => {
      // Setup initial data
      const initialChannels = [{ id: '1', name: 'Initial' }];
      localStorageMock.setItem('mcm_channels', JSON.stringify(initialChannels));

      const operation = vi.fn().mockImplementation(() => {
        // Modify data then throw error
        localStorageMock.setItem('mcm_channels', JSON.stringify([{ id: '2', name: 'Modified' }]));
        throw new Error('Operation failed');
      });

      await expect(rollbackService.executeWithRollback(
        operation,
        'failing_operation',
        'This will fail'
      )).rejects.toThrow('Operation failed');

      // Verify data was rolled back
      const restoredChannels = JSON.parse(localStorageMock.getItem('mcm_channels')!);
      expect(restoredChannels).toEqual(initialChannels);
    });

    it('works with synchronous operations', async () => {
      const operation = vi.fn().mockReturnValue('sync result');

      const result = await rollbackService.executeWithRollback(
        operation,
        'sync_operation',
        'Synchronous operation'
      );

      expect(result).toBe('sync result');
    });
  });

  describe('getRollbackPointsSize', () => {
    it('returns size information', async () => {
      await rollbackService.createRollbackPoint('test', 'Test operation');

      const sizeInfo = rollbackService.getRollbackPointsSize();

      expect(sizeInfo).toHaveProperty('count');
      expect(sizeInfo).toHaveProperty('totalSize');
      expect(sizeInfo).toHaveProperty('averageSize');
      expect(sizeInfo.count).toBe(1);
      expect(sizeInfo.totalSize).toBeGreaterThan(0);
      expect(sizeInfo.averageSize).toBeGreaterThan(0);
    });

    it('returns zero values when no rollback points exist', () => {
      const sizeInfo = rollbackService.getRollbackPointsSize();

      expect(sizeInfo.count).toBe(0);
      expect(sizeInfo.totalSize).toBe(0);
      expect(sizeInfo.averageSize).toBe(0);
    });
  });
});

describe('withRollback utility function', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('wraps operation with rollback functionality', async () => {
    const operation = vi.fn().mockResolvedValue('wrapped result');

    const result = await withRollback(
      operation,
      'wrapped_operation',
      'Wrapped with utility function'
    );

    expect(result).toBe('wrapped result');
    expect(operation).toHaveBeenCalled();

    // Verify rollback point was created
    const rollbackService = RollbackService.getInstance();
    const rollbackPoints = rollbackService.getRollbackPoints();
    expect(rollbackPoints).toHaveLength(1);
    expect(rollbackPoints[0].operation).toBe('wrapped_operation');
  });

  it('handles operation failures with rollback', async () => {
    const initialData = [{ id: '1', name: 'Initial' }];
    localStorageMock.setItem('mcm_channels', JSON.stringify(initialData));

    const operation = vi.fn().mockImplementation(() => {
      localStorageMock.setItem('mcm_channels', JSON.stringify([{ id: '2', name: 'Modified' }]));
      throw new Error('Wrapped operation failed');
    });

    await expect(withRollback(
      operation,
      'failing_wrapped_operation',
      'This will fail and rollback'
    )).rejects.toThrow('Wrapped operation failed');

    // Verify rollback occurred
    const restoredData = JSON.parse(localStorageMock.getItem('mcm_channels')!);
    expect(restoredData).toEqual(initialData);
  });
});