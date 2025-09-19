import { DataBackupService } from './dataBackup';
import ErrorHandler from './errorHandling';

export interface RollbackPoint {
  id: string;
  timestamp: Date;
  operation: string;
  description: string;
  dataSnapshot: {
    channels?: any[];
    templates?: any[];
    schedules?: Record<string, any>;
    userSettings?: any;
  };
  affectedKeys: string[];
}

export interface RollbackOptions {
  maxRollbackPoints?: number;
  autoCleanup?: boolean;
  createBackupBeforeRollback?: boolean;
}

export class RollbackService {
  private static instance: RollbackService;
  private backupService: DataBackupService;
  private errorHandler: ErrorHandler;
  private readonly ROLLBACK_POINTS_KEY = 'mcm_rollback_points';
  private readonly MAX_ROLLBACK_POINTS = 20;

  private constructor() {
    this.backupService = DataBackupService.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  static getInstance(): RollbackService {
    if (!RollbackService.instance) {
      RollbackService.instance = new RollbackService();
    }
    return RollbackService.instance;
  }

  /**
   * Create a rollback point before performing a critical operation
   */
  async createRollbackPoint(
    operation: string,
    description: string,
    affectedKeys: string[] = []
  ): Promise<string> {
    try {
      const rollbackId = this.generateRollbackId();
      const timestamp = new Date();

      // Capture current state of affected data
      const dataSnapshot: RollbackPoint['dataSnapshot'] = {};

      if (affectedKeys.includes('mcm_channels') || affectedKeys.length === 0) {
        dataSnapshot.channels = this.getFromStorage('mcm_channels', []);
      }

      if (affectedKeys.includes('mcm_templates') || affectedKeys.length === 0) {
        dataSnapshot.templates = this.getFromStorage('mcm_templates', []);
      }

      if (affectedKeys.includes('mcm_schedules') || affectedKeys.length === 0) {
        dataSnapshot.schedules = this.getFromStorage('mcm_schedules', {});
      }

      if (affectedKeys.includes('mcm_user_settings') || affectedKeys.length === 0) {
        dataSnapshot.userSettings = this.getFromStorage('mcm_user_settings', {});
      }

      const rollbackPoint: RollbackPoint = {
        id: rollbackId,
        timestamp,
        operation,
        description,
        dataSnapshot,
        affectedKeys: affectedKeys.length > 0 ? affectedKeys : [
          'mcm_channels',
          'mcm_templates',
          'mcm_schedules',
          'mcm_user_settings'
        ]
      };

      // Store rollback point
      await this.storeRollbackPoint(rollbackPoint);

      // Cleanup old rollback points
      await this.cleanupOldRollbackPoints();

      return rollbackId;
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        { context: 'createRollbackPoint', operation, description }
      );
      throw error;
    }
  }

  /**
   * Rollback to a specific rollback point
   */
  async rollback(rollbackId: string, options: RollbackOptions = {}): Promise<void> {
    const { createBackupBeforeRollback = true } = options;

    try {
      const rollbackPoint = await this.getRollbackPoint(rollbackId);
      
      if (!rollbackPoint) {
        throw new Error(`Rollback point ${rollbackId} not found`);
      }

      // Create backup before rollback if requested
      if (createBackupBeforeRollback) {
        await this.backupService.createBackup(
          `Pre-rollback backup for operation: ${rollbackPoint.operation}`
        );
      }

      // Restore data from rollback point
      if (rollbackPoint.dataSnapshot.channels !== undefined) {
        localStorage.setItem('mcm_channels', JSON.stringify(rollbackPoint.dataSnapshot.channels));
      }

      if (rollbackPoint.dataSnapshot.templates !== undefined) {
        localStorage.setItem('mcm_templates', JSON.stringify(rollbackPoint.dataSnapshot.templates));
      }

      if (rollbackPoint.dataSnapshot.schedules !== undefined) {
        localStorage.setItem('mcm_schedules', JSON.stringify(rollbackPoint.dataSnapshot.schedules));
      }

      if (rollbackPoint.dataSnapshot.userSettings !== undefined) {
        localStorage.setItem('mcm_user_settings', JSON.stringify(rollbackPoint.dataSnapshot.userSettings));
      }

      // Log the rollback operation
      console.log(`Rolled back to: ${rollbackPoint.operation} (${rollbackPoint.description})`);

    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        { context: 'rollback', rollbackId }
      );
      throw error;
    }
  }

  /**
   * Get list of available rollback points
   */
  getRollbackPoints(): RollbackPoint[] {
    try {
      const rollbackPointsStr = localStorage.getItem(this.ROLLBACK_POINTS_KEY);
      if (!rollbackPointsStr) {
        return [];
      }

      const rollbackPoints: RollbackPoint[] = JSON.parse(rollbackPointsStr);
      return rollbackPoints.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        { context: 'getRollbackPoints' }
      );
      return [];
    }
  }

  /**
   * Get a specific rollback point
   */
  async getRollbackPoint(rollbackId: string): Promise<RollbackPoint | null> {
    try {
      const rollbackPoints = this.getRollbackPoints();
      return rollbackPoints.find(point => point.id === rollbackId) || null;
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        { context: 'getRollbackPoint', rollbackId }
      );
      return null;
    }
  }

  /**
   * Delete a specific rollback point
   */
  async deleteRollbackPoint(rollbackId: string): Promise<void> {
    try {
      const rollbackPoints = this.getRollbackPoints();
      const updatedPoints = rollbackPoints.filter(point => point.id !== rollbackId);
      
      localStorage.setItem(this.ROLLBACK_POINTS_KEY, JSON.stringify(updatedPoints));
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        { context: 'deleteRollbackPoint', rollbackId }
      );
      throw error;
    }
  }

  /**
   * Clear all rollback points
   */
  clearAllRollbackPoints(): void {
    try {
      localStorage.removeItem(this.ROLLBACK_POINTS_KEY);
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        { context: 'clearAllRollbackPoints' }
      );
    }
  }

  /**
   * Execute an operation with automatic rollback point creation
   */
  async executeWithRollback<T>(
    operation: () => Promise<T> | T,
    operationName: string,
    description: string,
    affectedKeys?: string[]
  ): Promise<T> {
    const rollbackId = await this.createRollbackPoint(operationName, description, affectedKeys);

    try {
      const result = await operation();
      return result;
    } catch (error) {
      // Automatically rollback on error
      try {
        await this.rollback(rollbackId, { createBackupBeforeRollback: false });
        this.errorHandler.handleError(
          new Error(`Operation "${operationName}" failed and was rolled back`),
          { context: 'executeWithRollback', originalError: error }
        );
      } catch (rollbackError) {
        this.errorHandler.handleError(
          new Error(`Operation "${operationName}" failed and rollback also failed`),
          { 
            context: 'executeWithRollback', 
            originalError: error, 
            rollbackError 
          }
        );
      }
      throw error;
    }
  }

  /**
   * Get rollback point size information
   */
  getRollbackPointsSize(): { count: number; totalSize: number; averageSize: number } {
    try {
      const rollbackPointsStr = localStorage.getItem(this.ROLLBACK_POINTS_KEY);
      const count = rollbackPointsStr ? JSON.parse(rollbackPointsStr).length : 0;
      const totalSize = rollbackPointsStr ? rollbackPointsStr.length : 0;
      const averageSize = count > 0 ? totalSize / count : 0;

      return { count, totalSize, averageSize };
    } catch {
      return { count: 0, totalSize: 0, averageSize: 0 };
    }
  }

  private generateRollbackId(): string {
    return 'rb_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private async storeRollbackPoint(rollbackPoint: RollbackPoint): Promise<void> {
    try {
      const rollbackPoints = this.getRollbackPoints();
      rollbackPoints.unshift(rollbackPoint);
      
      localStorage.setItem(this.ROLLBACK_POINTS_KEY, JSON.stringify(rollbackPoints));
    } catch (error) {
      throw new Error(`Failed to store rollback point: ${error}`);
    }
  }

  private async cleanupOldRollbackPoints(): Promise<void> {
    try {
      const rollbackPoints = this.getRollbackPoints();
      
      if (rollbackPoints.length > this.MAX_ROLLBACK_POINTS) {
        const trimmedPoints = rollbackPoints.slice(0, this.MAX_ROLLBACK_POINTS);
        localStorage.setItem(this.ROLLBACK_POINTS_KEY, JSON.stringify(trimmedPoints));
      }

      // Also cleanup points older than 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentPoints = rollbackPoints.filter(point => 
        new Date(point.timestamp) > sevenDaysAgo
      );

      if (recentPoints.length !== rollbackPoints.length) {
        localStorage.setItem(this.ROLLBACK_POINTS_KEY, JSON.stringify(recentPoints));
      }
    } catch (error) {
      this.errorHandler.handleError(
        error as Error,
        { context: 'cleanupOldRollbackPoints' }
      );
    }
  }

  private getFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}

// Utility function to wrap critical operations with rollback
export function withRollback<T>(
  operation: () => Promise<T> | T,
  operationName: string,
  description: string,
  affectedKeys?: string[]
): Promise<T> {
  const rollbackService = RollbackService.getInstance();
  return rollbackService.executeWithRollback(operation, operationName, description, affectedKeys);
}

export default RollbackService;