import { localStorageService } from './localStorage';
import { debouncedLocalStorageService } from './debouncedLocalStorage';
import DataBackupService from './dataBackup';
import { AppState } from '../types';

/**
 * Enhanced persistence service that ensures data is never lost
 */
export class EnhancedPersistenceService {
  private static instance: EnhancedPersistenceService;
  private backupService: DataBackupService;
  private autoBackupInterval: number | null = null;
  private lastBackupTime: Date | null = null;
  private readonly AUTO_BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly BACKUP_ON_CHANGES_THRESHOLD = 10; // Create backup after 10 changes
  private changeCount = 0;

  private constructor() {
    this.backupService = DataBackupService.getInstance();
    this.setupAutoBackup();
    this.setupBeforeUnloadHandler();
  }

  public static getInstance(): EnhancedPersistenceService {
    if (!EnhancedPersistenceService.instance) {
      EnhancedPersistenceService.instance = new EnhancedPersistenceService();
    }
    return EnhancedPersistenceService.instance;
  }

  /**
   * Initialize the persistence service
   */
  public initialize(): void {
    console.log('🔄 Enhanced Persistence Service initialized');
    this.createInitialBackupIfNeeded();
  }

  /**
   * Save application state with enhanced persistence
   */
  public async saveAppState(state: AppState): Promise<void> {
    try {
      console.log('💾 Saving application state...');
      
      // Use debounced service for immediate saves
      debouncedLocalStorageService.debouncedUpdateChannels(state.channels);
      debouncedLocalStorageService.debouncedUpdateTaskTemplates(state.taskTemplates);
      
      const weekKey = state.currentWeek.weekStartDate.toISOString().split('T')[0];
      debouncedLocalStorageService.debouncedUpdateSchedule(weekKey, state.currentWeek);
      debouncedLocalStorageService.debouncedUpdateUserSettings(state.userSettings);

      // Increment change count for backup threshold
      this.changeCount++;

      // Create backup if threshold reached
      if (this.changeCount >= this.BACKUP_ON_CHANGES_THRESHOLD) {
        await this.createBackup('Auto-backup after changes');
        this.changeCount = 0;
      }

      console.log('✅ Application state saved successfully');
    } catch (error) {
      console.error('❌ Failed to save application state:', error);
      throw error;
    }
  }

  /**
   * Load application state with fallback recovery
   */
  public async loadAppState(): Promise<AppState | null> {
    try {
      console.log('📂 Loading application state...');

      const channels = localStorageService.getChannels();
      const taskTemplates = localStorageService.getTaskTemplates();
      const userSettings = localStorageService.getUserSettings();
      
      // Load current week schedule
      const currentWeekKey = this.getCurrentWeekKey();
      const currentWeekSchedule = localStorageService.getSchedule(currentWeekKey);
      
      const currentWeek = currentWeekSchedule || {
        weekStartDate: new Date(),
        tasks: [],
        totalScheduledHours: 0,
        userCapacityHours: userSettings.weeklyCapacityHours,
        isOverloaded: false,
      };

      const state: AppState = {
        channels,
        taskTemplates,
        currentWeek,
        selectedChannelId: undefined,
        userSettings,
        ui: {
          activeView: 'dashboard',
          isLoading: false,
          errors: [],
        },
      };

      console.log('✅ Application state loaded successfully');
      return state;
    } catch (error) {
      console.error('❌ Failed to load application state:', error);
      return await this.recoverFromBackup();
    }
  }

  /**
   * Force flush all pending saves
   */
  public async flushPendingSaves(): Promise<void> {
    try {
      console.log('🔄 Flushing pending saves...');
      await debouncedLocalStorageService.flushPendingUpdates();
      console.log('✅ All pending saves flushed');
    } catch (error) {
      console.error('❌ Failed to flush pending saves:', error);
    }
  }

  /**
   * Create a manual backup
   */
  public async createBackup(description?: string): Promise<string> {
    try {
      console.log('💾 Creating backup...');
      const backupId = await this.backupService.createBackup(description);
      this.lastBackupTime = new Date();
      console.log(`✅ Backup created: ${backupId}`);
      return backupId;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Get available backups
   */
  public getAvailableBackups() {
    return this.backupService.getBackupList();
  }

  /**
   * Restore from a specific backup
   */
  public async restoreFromBackup(backupId: string): Promise<void> {
    try {
      console.log(`🔄 Restoring from backup: ${backupId}`);
      await this.backupService.restoreBackup(backupId);
      console.log('✅ Backup restored successfully');
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Export data as a downloadable file
   */
  public exportData(): void {
    try {
      const backups = this.getAvailableBackups();
      if (backups.length > 0) {
        this.backupService.exportBackup(backups[0].id);
      } else {
        throw new Error('No backups available to export');
      }
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Import data from a file
   */
  public async importData(file: File): Promise<void> {
    try {
      console.log('📥 Importing data...');
      const backupId = await this.backupService.importBackup(file);
      await this.restoreFromBackup(backupId);
      console.log('✅ Data imported successfully');
    } catch (error) {
      console.error('❌ Failed to import data:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  public getStorageInfo() {
    return this.backupService.checkStorageSpace();
  }

  /**
   * Cleanup old data and optimize storage
   */
  public async cleanupStorage(): Promise<void> {
    try {
      console.log('🧹 Cleaning up storage...');
      
      // Clean up old schedules (keep last 12 weeks)
      localStorageService.cleanupOldSchedules(12);
      
      // Keep only the 5 most recent backups
      const backups = this.getAvailableBackups();
      if (backups.length > 5) {
        const backupsToDelete = backups.slice(5);
        for (const backup of backupsToDelete) {
          this.backupService.deleteBackup(backup.id);
        }
      }
      
      console.log('✅ Storage cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup storage:', error);
    }
  }

  /**
   * Destroy the service and cleanup resources
   */
  public destroy(): void {
    if (this.autoBackupInterval) {
      window.clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
    console.log('🔄 Enhanced Persistence Service destroyed');
  }

  private setupAutoBackup(): void {
    this.autoBackupInterval = window.setInterval(async () => {
      try {
        const now = new Date();
        const shouldBackup = !this.lastBackupTime || 
          (now.getTime() - this.lastBackupTime.getTime()) >= this.AUTO_BACKUP_INTERVAL;

        if (shouldBackup) {
          await this.createBackup('Auto-backup (scheduled)');
        }
      } catch (error) {
        console.error('❌ Auto-backup failed:', error);
      }
    }, this.AUTO_BACKUP_INTERVAL);
  }

  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', async (event) => {
      try {
        // Flush any pending saves before the page unloads
        await this.flushPendingSaves();
        
        // Create a final backup if there are unsaved changes
        if (this.changeCount > 0) {
          await this.createBackup('Auto-backup before page unload');
        }
      } catch (error) {
        console.error('❌ Failed to save data before page unload:', error);
        // Show warning to user
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    });
  }

  private async createInitialBackupIfNeeded(): Promise<void> {
    try {
      const backups = this.getAvailableBackups();
      if (backups.length === 0) {
        // Check if there's any data to backup
        const channels = localStorageService.getChannels();
        const templates = localStorageService.getTaskTemplates();
        
        if (channels.length > 0 || templates.length > 0) {
          await this.createBackup('Initial backup');
        }
      }
    } catch (error) {
      console.error('❌ Failed to create initial backup:', error);
    }
  }

  private async recoverFromBackup(): Promise<AppState | null> {
    try {
      console.log('🔄 Attempting to recover from backup...');
      const backups = this.getAvailableBackups();
      
      if (backups.length > 0) {
        const latestBackup = backups[0];
        await this.restoreFromBackup(latestBackup.id);
        
        // Try loading again after restore
        return await this.loadAppState();
      } else {
        console.log('⚠️ No backups available for recovery');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to recover from backup:', error);
      return null;
    }
  }

  private getCurrentWeekKey(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }
}

// Export singleton instance
export const enhancedPersistenceService = EnhancedPersistenceService.getInstance();