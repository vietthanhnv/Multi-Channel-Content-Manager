import { Channel, TaskTemplate, WeeklySchedule } from '../types';

export interface BackupData {
  version: string;
  timestamp: Date;
  channels: Channel[];
  templates: TaskTemplate[];
  schedules: Record<string, WeeklySchedule>;
  userSettings: any;
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  size: number;
  description?: string;
  version: string;
}

export class DataBackupService {
  private static instance: DataBackupService;
  private readonly BACKUP_KEY_PREFIX = 'mcm_backup_';
  private readonly BACKUP_METADATA_KEY = 'mcm_backup_metadata';
  private readonly MAX_BACKUPS = 10;
  private readonly CURRENT_VERSION = '1.0.0';

  private constructor() {}

  static getInstance(): DataBackupService {
    if (!DataBackupService.instance) {
      DataBackupService.instance = new DataBackupService();
    }
    return DataBackupService.instance;
  }

  /**
   * Create a backup of current application data
   */
  async createBackup(description?: string): Promise<string> {
    try {
      const backupId = this.generateBackupId();
      const timestamp = new Date();

      // Collect all data from localStorage
      const channels = this.getFromStorage('mcm_channels', []);
      const templates = this.getFromStorage('mcm_templates', []);
      const schedules = this.getFromStorage('mcm_schedules', {});
      const userSettings = this.getFromStorage('mcm_user_settings', {});

      const backupData: BackupData = {
        version: this.CURRENT_VERSION,
        timestamp,
        channels,
        templates,
        schedules,
        userSettings
      };

      // Store backup
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      // Update metadata
      await this.updateBackupMetadata(backupId, timestamp, backupData, description);

      // Clean up old backups
      await this.cleanupOldBackups();

      return backupId;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore data from a backup
   */
  async restoreBackup(backupId: string, options: {
    restoreChannels?: boolean;
    restoreTemplates?: boolean;
    restoreSchedules?: boolean;
    restoreUserSettings?: boolean;
  } = {}): Promise<void> {
    try {
      const {
        restoreChannels = true,
        restoreTemplates = true,
        restoreSchedules = true,
        restoreUserSettings = true
      } = options;

      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      const backupDataStr = localStorage.getItem(backupKey);

      if (!backupDataStr) {
        throw new Error(`Backup with ID ${backupId} not found`);
      }

      const backupData: BackupData = JSON.parse(backupDataStr);

      // Validate backup data
      if (!this.isValidBackupData(backupData)) {
        throw new Error('Invalid backup data format');
      }

      // Create a backup of current state before restoring
      await this.createBackup(`Auto-backup before restore from ${backupId}`);

      // Restore selected data
      if (restoreChannels && backupData.channels) {
        localStorage.setItem('mcm_channels', JSON.stringify(backupData.channels));
      }

      if (restoreTemplates && backupData.templates) {
        localStorage.setItem('mcm_templates', JSON.stringify(backupData.templates));
      }

      if (restoreSchedules && backupData.schedules) {
        localStorage.setItem('mcm_schedules', JSON.stringify(backupData.schedules));
      }

      if (restoreUserSettings && backupData.userSettings) {
        localStorage.setItem('mcm_user_settings', JSON.stringify(backupData.userSettings));
      }

    } catch (error) {
      throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of available backups
   */
  getBackupList(): BackupMetadata[] {
    try {
      const metadataStr = localStorage.getItem(this.BACKUP_METADATA_KEY);
      if (!metadataStr) {
        return [];
      }

      const metadata: BackupMetadata[] = JSON.parse(metadataStr);
      return metadata.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get backup list:', error);
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  deleteBackup(backupId: string): void {
    try {
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      localStorage.removeItem(backupKey);

      // Update metadata
      const metadata = this.getBackupList();
      const updatedMetadata = metadata.filter(backup => backup.id !== backupId);
      localStorage.setItem(this.BACKUP_METADATA_KEY, JSON.stringify(updatedMetadata));
    } catch (error) {
      throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export backup as downloadable file
   */
  exportBackup(backupId: string): void {
    try {
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      const backupDataStr = localStorage.getItem(backupKey);

      if (!backupDataStr) {
        throw new Error(`Backup with ID ${backupId} not found`);
      }

      const backupData = JSON.parse(backupDataStr);
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `mcm-backup-${backupId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to export backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import backup from file
   */
  async importBackup(file: File, description?: string): Promise<string> {
    try {
      const fileContent = await this.readFileAsText(file);
      const backupData: BackupData = JSON.parse(fileContent);

      if (!this.isValidBackupData(backupData)) {
        throw new Error('Invalid backup file format');
      }

      const backupId = this.generateBackupId();
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;

      // Store imported backup
      localStorage.setItem(backupKey, JSON.stringify(backupData));

      // Update metadata
      await this.updateBackupMetadata(
        backupId, 
        new Date(), 
        backupData, 
        description || `Imported from ${file.name}`
      );

      return backupId;
    } catch (error) {
      throw new Error(`Failed to import backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get backup details
   */
  getBackupDetails(backupId: string): BackupData | null {
    try {
      const backupKey = this.BACKUP_KEY_PREFIX + backupId;
      const backupDataStr = localStorage.getItem(backupKey);

      if (!backupDataStr) {
        return null;
      }

      return JSON.parse(backupDataStr);
    } catch (error) {
      console.error('Failed to get backup details:', error);
      return null;
    }
  }

  /**
   * Check if localStorage has enough space for backup
   */
  checkStorageSpace(): { available: boolean; usedSpace: number; totalSpace: number } {
    try {
      const testKey = 'mcm_storage_test';
      let usedSpace = 0;
      let totalSpace = 0;

      // Calculate current usage
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          usedSpace += localStorage[key].length;
        }
      }

      // Test available space
      try {
        let testSize = 1024;
        while (testSize < 10 * 1024 * 1024) { // Test up to 10MB
          localStorage.setItem(testKey, 'x'.repeat(testSize));
          localStorage.removeItem(testKey);
          testSize *= 2;
        }
        totalSpace = usedSpace + testSize;
      } catch {
        totalSpace = usedSpace;
      }

      return {
        available: totalSpace - usedSpace > 100 * 1024, // At least 100KB available
        usedSpace,
        totalSpace
      };
    } catch (error) {
      return { available: false, usedSpace: 0, totalSpace: 0 };
    }
  }

  private generateBackupId(): string {
    return Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11);
  }

  private getFromStorage<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private async updateBackupMetadata(
    backupId: string, 
    timestamp: Date, 
    backupData: BackupData, 
    description?: string
  ): Promise<void> {
    const metadata = this.getBackupList();
    const size = JSON.stringify(backupData).length;

    const newMetadata: BackupMetadata = {
      id: backupId,
      timestamp,
      size,
      description,
      version: backupData.version
    };

    metadata.push(newMetadata);
    localStorage.setItem(this.BACKUP_METADATA_KEY, JSON.stringify(metadata));
  }

  private async cleanupOldBackups(): Promise<void> {
    const metadata = this.getBackupList();
    
    if (metadata.length > this.MAX_BACKUPS) {
      const backupsToDelete = metadata.slice(this.MAX_BACKUPS);
      
      for (const backup of backupsToDelete) {
        const backupKey = this.BACKUP_KEY_PREFIX + backup.id;
        localStorage.removeItem(backupKey);
      }

      const remainingMetadata = metadata.slice(0, this.MAX_BACKUPS);
      localStorage.setItem(this.BACKUP_METADATA_KEY, JSON.stringify(remainingMetadata));
    }
  }

  private isValidBackupData(data: any): data is BackupData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.version === 'string' &&
      data.timestamp &&
      Array.isArray(data.channels) &&
      Array.isArray(data.templates) &&
      typeof data.schedules === 'object' &&
      typeof data.userSettings === 'object'
    );
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}

export default DataBackupService;