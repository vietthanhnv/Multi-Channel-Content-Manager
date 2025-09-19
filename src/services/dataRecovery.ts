import { DataBackupService } from './dataBackup';
import ErrorHandler from './errorHandling';

export interface RecoveryOptions {
  createBackupBeforeRecovery?: boolean;
  validateDataIntegrity?: boolean;
  repairCorruptedData?: boolean;
}

export interface DataIntegrityReport {
  isValid: boolean;
  issues: string[];
  repairedItems: string[];
  unrepairedItems: string[];
}

export class DataRecoveryService {
  private static instance: DataRecoveryService;
  private backupService: DataBackupService;
  private errorHandler: ErrorHandler;
  private readonly RECOVERY_LOG_KEY = 'mcm_recovery_log';
  private readonly LAST_KNOWN_GOOD_KEY = 'mcm_last_known_good';

  private constructor() {
    this.backupService = DataBackupService.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
  }

  static getInstance(): DataRecoveryService {
    if (!DataRecoveryService.instance) {
      DataRecoveryService.instance = new DataRecoveryService();
    }
    return DataRecoveryService.instance;
  }

  /**
   * Perform automatic data recovery
   */
  async performAutoRecovery(options: RecoveryOptions = {}): Promise<boolean> {
    const {
      createBackupBeforeRecovery = true,
      validateDataIntegrity = true,
      repairCorruptedData = true
    } = options;

    try {
      this.logRecoveryAction('Starting automatic data recovery');

      // Create backup of current state if requested
      if (createBackupBeforeRecovery) {
        try {
          await this.backupService.createBackup('Pre-recovery backup');
          this.logRecoveryAction('Created pre-recovery backup');
        } catch (error) {
          this.logRecoveryAction(`Failed to create pre-recovery backup: ${error}`);
        }
      }

      // Check data integrity
      if (validateDataIntegrity) {
        const integrityReport = await this.checkDataIntegrity();
        
        if (!integrityReport.isValid) {
          this.logRecoveryAction(`Data integrity issues found: ${integrityReport.issues.join(', ')}`);
          
          if (repairCorruptedData) {
            const repairSuccess = await this.repairCorruptedData(integrityReport);
            if (!repairSuccess) {
              return await this.restoreFromLastKnownGood();
            }
          } else {
            return await this.restoreFromLastKnownGood();
          }
        }
      }

      // Check localStorage availability
      if (!this.isLocalStorageAvailable()) {
        this.errorHandler.handleError(
          'localStorage is not available',
          { context: 'dataRecovery' }
        );
        return false;
      }

      // Check storage quota
      const storageInfo = this.backupService.checkStorageSpace();
      if (!storageInfo.available) {
        this.logRecoveryAction('Storage quota exceeded, attempting cleanup');
        await this.performStorageCleanup();
      }

      this.logRecoveryAction('Automatic data recovery completed successfully');
      await this.saveLastKnownGoodState();
      return true;

    } catch (error) {
      this.logRecoveryAction(`Auto recovery failed: ${error}`);
      this.errorHandler.handleError(error as Error, { context: 'autoRecovery' });
      return false;
    }
  }

  /**
   * Check data integrity across all stored data
   */
  async checkDataIntegrity(): Promise<DataIntegrityReport> {
    const report: DataIntegrityReport = {
      isValid: true,
      issues: [],
      repairedItems: [],
      unrepairedItems: []
    };

    try {
      // Check channels data
      const channelsIssues = await this.validateChannelsData();
      if (channelsIssues.length > 0) {
        report.isValid = false;
        report.issues.push(...channelsIssues);
      }

      // Check templates data
      const templatesIssues = await this.validateTemplatesData();
      if (templatesIssues.length > 0) {
        report.isValid = false;
        report.issues.push(...templatesIssues);
      }

      // Check schedules data
      const schedulesIssues = await this.validateSchedulesData();
      if (schedulesIssues.length > 0) {
        report.isValid = false;
        report.issues.push(...schedulesIssues);
      }

      // Check user settings
      const settingsIssues = await this.validateUserSettingsData();
      if (settingsIssues.length > 0) {
        report.isValid = false;
        report.issues.push(...settingsIssues);
      }

    } catch (error) {
      report.isValid = false;
      report.issues.push(`Integrity check failed: ${error}`);
    }

    return report;
  }

  /**
   * Repair corrupted data where possible
   */
  async repairCorruptedData(integrityReport: DataIntegrityReport): Promise<boolean> {
    let allRepaired = true;

    try {
      for (const issue of integrityReport.issues) {
        const repaired = await this.attemptRepair(issue);
        if (repaired) {
          integrityReport.repairedItems.push(issue);
        } else {
          integrityReport.unrepairedItems.push(issue);
          allRepaired = false;
        }
      }

      this.logRecoveryAction(
        `Repair completed. Repaired: ${integrityReport.repairedItems.length}, ` +
        `Failed: ${integrityReport.unrepairedItems.length}`
      );

      return allRepaired;
    } catch (error) {
      this.logRecoveryAction(`Data repair failed: ${error}`);
      return false;
    }
  }

  /**
   * Restore from the last known good state
   */
  async restoreFromLastKnownGood(): Promise<boolean> {
    try {
      const lastKnownGood = localStorage.getItem(this.LAST_KNOWN_GOOD_KEY);
      
      if (!lastKnownGood) {
        this.logRecoveryAction('No last known good state available');
        return await this.restoreFromLatestBackup();
      }

      const goodState = JSON.parse(lastKnownGood);
      
      // Restore each data type
      if (goodState.channels) {
        localStorage.setItem('mcm_channels', JSON.stringify(goodState.channels));
      }
      if (goodState.templates) {
        localStorage.setItem('mcm_templates', JSON.stringify(goodState.templates));
      }
      if (goodState.schedules) {
        localStorage.setItem('mcm_schedules', JSON.stringify(goodState.schedules));
      }
      if (goodState.userSettings) {
        localStorage.setItem('mcm_user_settings', JSON.stringify(goodState.userSettings));
      }

      this.logRecoveryAction('Restored from last known good state');
      return true;

    } catch (error) {
      this.logRecoveryAction(`Failed to restore from last known good: ${error}`);
      return await this.restoreFromLatestBackup();
    }
  }

  /**
   * Restore from the latest available backup
   */
  async restoreFromLatestBackup(): Promise<boolean> {
    try {
      const backups = this.backupService.getBackupList();
      
      if (backups.length === 0) {
        this.logRecoveryAction('No backups available for recovery');
        return false;
      }

      const latestBackup = backups[0];
      await this.backupService.restoreBackup(latestBackup.id);
      
      this.logRecoveryAction(`Restored from backup: ${latestBackup.id}`);
      return true;

    } catch (error) {
      this.logRecoveryAction(`Failed to restore from backup: ${error}`);
      return false;
    }
  }

  /**
   * Perform storage cleanup to free up space
   */
  async performStorageCleanup(): Promise<void> {
    try {
      // Remove old recovery logs
      const logs = this.getRecoveryLogs();
      if (logs.length > 50) {
        const recentLogs = logs.slice(0, 25);
        localStorage.setItem(this.RECOVERY_LOG_KEY, JSON.stringify(recentLogs));
      }

      // Clean up old backups beyond the limit
      const backups = this.backupService.getBackupList();
      if (backups.length > 5) {
        const oldBackups = backups.slice(5);
        for (const backup of oldBackups) {
          this.backupService.deleteBackup(backup.id);
        }
      }

      // Remove any orphaned data
      this.cleanupOrphanedData();

      this.logRecoveryAction('Storage cleanup completed');
    } catch (error) {
      this.logRecoveryAction(`Storage cleanup failed: ${error}`);
    }
  }

  /**
   * Save current state as last known good
   */
  async saveLastKnownGoodState(): Promise<void> {
    try {
      const currentState = {
        timestamp: new Date().toISOString(),
        channels: this.getFromStorage('mcm_channels', []),
        templates: this.getFromStorage('mcm_templates', []),
        schedules: this.getFromStorage('mcm_schedules', {}),
        userSettings: this.getFromStorage('mcm_user_settings', {})
      };

      localStorage.setItem(this.LAST_KNOWN_GOOD_KEY, JSON.stringify(currentState));
      this.logRecoveryAction('Saved current state as last known good');
    } catch (error) {
      this.logRecoveryAction(`Failed to save last known good state: ${error}`);
    }
  }

  /**
   * Get recovery logs
   */
  getRecoveryLogs(): Array<{ timestamp: string; action: string }> {
    try {
      const logs = localStorage.getItem(this.RECOVERY_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear recovery logs
   */
  clearRecoveryLogs(): void {
    localStorage.removeItem(this.RECOVERY_LOG_KEY);
  }

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private async validateChannelsData(): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const channels = this.getFromStorage('mcm_channels', []);
      
      if (!Array.isArray(channels)) {
        issues.push('Channels data is not an array');
        return issues;
      }

      for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        if (!channel.id || !channel.name) {
          issues.push(`Channel at index ${i} missing required fields`);
        }
        if (channel.postingSchedule && typeof channel.postingSchedule !== 'object') {
          issues.push(`Channel at index ${i} has invalid posting schedule`);
        }
      }
    } catch (error) {
      issues.push(`Failed to validate channels: ${error}`);
    }

    return issues;
  }

  private async validateTemplatesData(): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const templates = this.getFromStorage('mcm_templates', []);
      
      if (!Array.isArray(templates)) {
        issues.push('Templates data is not an array');
        return issues;
      }

      for (let i = 0; i < templates.length; i++) {
        const template = templates[i];
        if (!template.id || !template.name) {
          issues.push(`Template at index ${i} missing required fields`);
        }
      }
    } catch (error) {
      issues.push(`Failed to validate templates: ${error}`);
    }

    return issues;
  }

  private async validateSchedulesData(): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const schedules = this.getFromStorage('mcm_schedules', {});
      
      if (typeof schedules !== 'object' || schedules === null) {
        issues.push('Schedules data is not an object');
        return issues;
      }

      for (const [key, schedule] of Object.entries(schedules)) {
        if (!schedule || typeof schedule !== 'object') {
          issues.push(`Schedule for ${key} is invalid`);
        }
      }
    } catch (error) {
      issues.push(`Failed to validate schedules: ${error}`);
    }

    return issues;
  }

  private async validateUserSettingsData(): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const settings = this.getFromStorage('mcm_user_settings', {});
      
      if (typeof settings !== 'object' || settings === null) {
        issues.push('User settings data is not an object');
      }
    } catch (error) {
      issues.push(`Failed to validate user settings: ${error}`);
    }

    return issues;
  }

  private async attemptRepair(issue: string): Promise<boolean> {
    try {
      if (issue.includes('Channels data is not an array')) {
        localStorage.setItem('mcm_channels', JSON.stringify([]));
        return true;
      }
      
      if (issue.includes('Templates data is not an array')) {
        localStorage.setItem('mcm_templates', JSON.stringify([]));
        return true;
      }
      
      if (issue.includes('Schedules data is not an object')) {
        localStorage.setItem('mcm_schedules', JSON.stringify({}));
        return true;
      }
      
      if (issue.includes('User settings data is not an object')) {
        localStorage.setItem('mcm_user_settings', JSON.stringify({}));
        return true;
      }

      // More specific repairs can be added here
      return false;
    } catch {
      return false;
    }
  }

  private cleanupOrphanedData(): void {
    try {
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mcm_') && !this.isKnownKey(key)) {
          keysToCheck.push(key);
        }
      }

      // Remove orphaned keys that are older than 30 days
      for (const key of keysToCheck) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (parsed.timestamp) {
              const age = Date.now() - new Date(parsed.timestamp).getTime();
              if (age > 30 * 24 * 60 * 60 * 1000) { // 30 days
                localStorage.removeItem(key);
              }
            }
          }
        } catch {
          // If we can't parse it, it might be orphaned
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      this.logRecoveryAction(`Cleanup orphaned data failed: ${error}`);
    }
  }

  private isKnownKey(key: string): boolean {
    const knownKeys = [
      'mcm_channels',
      'mcm_templates',
      'mcm_schedules',
      'mcm_user_settings',
      'mcm_backup_metadata',
      this.RECOVERY_LOG_KEY,
      this.LAST_KNOWN_GOOD_KEY
    ];

    return knownKeys.includes(key) || key.startsWith('mcm_backup_');
  }

  private logRecoveryAction(action: string): void {
    try {
      const logs = this.getRecoveryLogs();
      logs.unshift({
        timestamp: new Date().toISOString(),
        action
      });

      // Keep only the last 100 log entries
      const trimmedLogs = logs.slice(0, 100);
      localStorage.setItem(this.RECOVERY_LOG_KEY, JSON.stringify(trimmedLogs));
    } catch (error) {
      console.error('Failed to log recovery action:', error);
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

export default DataRecoveryService;