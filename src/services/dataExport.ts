import { Channel, ContentTemplate, WeeklySchedule, AppState } from '../types';
import { localStorageService } from './localStorage';
import { DataValidator, ValidationError } from './validation';
import { APP_VERSION } from '../utils/constants';

/**
 * Export data structure
 */
export interface ExportData {
  version: string;
  exportDate: string;
  channels: Channel[];
  templates: ContentTemplate[];
  schedules: Record<string, WeeklySchedule>;
  userSettings: AppState['userSettings'];
}

/**
 * Import options
 */
export interface ImportOptions {
  mergeMode: 'replace' | 'merge' | 'skip_existing';
  validateData: boolean;
  createBackup: boolean;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  errors: ValidationError[];
  warnings: string[];
  imported: {
    channels: number;
    templates: number;
    schedules: number;
    userSettings: boolean;
  };
  skipped: {
    channels: number;
    templates: number;
    schedules: number;
  };
}

/**
 * Export/Import service for JSON data
 */
export class DataExportService {
  private static instance: DataExportService;

  private constructor() {}

  public static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  /**
   * Export all data to JSON string
   */
  public exportData(): string {
    try {
      const exportData: ExportData = {
        version: APP_VERSION,
        exportDate: new Date().toISOString(),
        channels: localStorageService.getChannels(),
        templates: localStorageService.getTemplates(),
        schedules: localStorageService.getSchedules(),
        userSettings: localStorageService.getUserSettings(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export data and trigger download
   */
  public downloadExport(filename?: string): void {
    try {
      const jsonData = this.exportData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || this.generateExportFilename();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Failed to download export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import data from JSON string
   */
  public async importData(
    jsonData: string, 
    options: ImportOptions = {
      mergeMode: 'merge',
      validateData: true,
      createBackup: true
    }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      errors: [],
      warnings: [],
      imported: { channels: 0, templates: 0, schedules: 0, userSettings: false },
      skipped: { channels: 0, templates: 0, schedules: 0 }
    };

    try {
      // Create backup if requested
      if (options.createBackup) {
        await this.createBackup();
      }

      // Parse JSON data
      let importData: ExportData;
      try {
        importData = JSON.parse(jsonData);
      } catch (error) {
        result.errors.push(new ValidationError('Invalid JSON format', 'json_parse'));
        return result;
      }

      // Validate import data structure
      const structureValidation = this.validateImportStructure(importData);
      if (!structureValidation.isValid) {
        result.errors.push(...structureValidation.errors);
        return result;
      }

      // Check version compatibility
      const versionWarnings = this.checkVersionCompatibility(importData.version);
      result.warnings.push(...versionWarnings);

      // Validate data if requested
      if (options.validateData) {
        const dataValidation = DataValidator.validateAppState({
          channels: importData.channels,
          templates: importData.templates,
          currentWeek: Object.values(importData.schedules)[0] // Validate first schedule as sample
        });
        
        if (!dataValidation.isValid) {
          result.errors.push(...dataValidation.errors);
          // Continue with import even if validation fails, but log errors
          result.warnings.push('Data validation failed, but import will continue');
        }
      }

      // Import channels
      const channelResult = await this.importChannels(importData.channels, options.mergeMode);
      result.imported.channels = channelResult.imported;
      result.skipped.channels = channelResult.skipped;
      result.errors.push(...channelResult.errors);

      // Import templates
      const templateResult = await this.importTemplates(importData.templates, options.mergeMode);
      result.imported.templates = templateResult.imported;
      result.skipped.templates = templateResult.skipped;
      result.errors.push(...templateResult.errors);

      // Import schedules
      const scheduleResult = await this.importSchedules(importData.schedules, options.mergeMode);
      result.imported.schedules = scheduleResult.imported;
      result.skipped.schedules = scheduleResult.skipped;
      result.errors.push(...scheduleResult.errors);

      // Import user settings
      if (importData.userSettings) {
        try {
          if (options.mergeMode === 'replace') {
            localStorageService.updateUserSettings(importData.userSettings);
          } else {
            // Merge with existing settings
            const currentSettings = localStorageService.getUserSettings();
            const mergedSettings = { ...currentSettings, ...importData.userSettings };
            localStorageService.updateUserSettings(mergedSettings);
          }
          result.imported.userSettings = true;
        } catch (error) {
          result.errors.push(new ValidationError(`Failed to import user settings: ${error instanceof Error ? error.message : 'Unknown error'}`, 'userSettings'));
        }
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(new ValidationError(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'import'));
      return result;
    }
  }

  /**
   * Import data from file
   */
  public async importFromFile(file: File, options?: ImportOptions): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const jsonData = event.target?.result as string;
          const result = await this.importData(jsonData, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Create backup of current data
   */
  private async createBackup(): Promise<void> {
    try {
      const backupData = this.exportData();
      const backupKey = `mcm_backup_${Date.now()}`;
      localStorage.setItem(backupKey, backupData);
      
      // Clean up old backups (keep only last 5)
      this.cleanupOldBackups();
    } catch (error) {
      console.warn('Failed to create backup:', error);
    }
  }

  /**
   * Clean up old backup files
   */
  private cleanupOldBackups(): void {
    try {
      const backupKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('mcm_backup_'))
        .sort()
        .reverse();
      
      // Remove all but the 5 most recent backups
      backupKeys.slice(5).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Validate import data structure
   */
  private validateImportStructure(data: any): { isValid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push(new ValidationError('Import data must be an object', 'structure'));
      return { isValid: false, errors };
    }

    // Check required fields
    const requiredFields = ['version', 'exportDate', 'channels', 'templates', 'schedules', 'userSettings'];
    requiredFields.forEach(field => {
      if (!(field in data)) {
        errors.push(new ValidationError(`Missing required field: ${field}`, 'structure'));
      }
    });

    // Validate field types
    if (data.channels && !Array.isArray(data.channels)) {
      errors.push(new ValidationError('Channels must be an array', 'structure'));
    }

    if (data.templates && !Array.isArray(data.templates)) {
      errors.push(new ValidationError('Templates must be an array', 'structure'));
    }

    if (data.schedules && typeof data.schedules !== 'object') {
      errors.push(new ValidationError('Schedules must be an object', 'structure'));
    }

    if (data.userSettings && typeof data.userSettings !== 'object') {
      errors.push(new ValidationError('User settings must be an object', 'structure'));
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check version compatibility
   */
  private checkVersionCompatibility(importVersion: string): string[] {
    const warnings: string[] = [];
    const currentVersion = APP_VERSION;

    if (importVersion !== currentVersion) {
      warnings.push(`Version mismatch: importing from ${importVersion}, current version is ${currentVersion}`);
    }

    // Add specific version compatibility checks here as needed
    const [importMajor] = importVersion.split('.').map(Number);
    const [currentMajor] = currentVersion.split('.').map(Number);

    if (importMajor > currentMajor) {
      warnings.push('Importing from a newer version may cause compatibility issues');
    }

    return warnings;
  }

  /**
   * Import channels with merge logic
   */
  private async importChannels(channels: Channel[], mergeMode: ImportOptions['mergeMode']): Promise<{
    imported: number;
    skipped: number;
    errors: ValidationError[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] as ValidationError[] };
    const existingChannels = localStorageService.getChannels();
    const existingIds = new Set(existingChannels.map(c => c.id));

    for (const channel of channels) {
      try {
        if (existingIds.has(channel.id)) {
          if (mergeMode === 'skip_existing') {
            result.skipped++;
            continue;
          } else if (mergeMode === 'merge' || mergeMode === 'replace') {
            localStorageService.updateChannel(channel.id, channel);
            result.imported++;
          }
        } else {
          localStorageService.addChannel(channel);
          result.imported++;
        }
      } catch (error) {
        result.errors.push(new ValidationError(`Failed to import channel ${channel.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'channel'));
      }
    }

    return result;
  }

  /**
   * Import templates with merge logic
   */
  private async importTemplates(templates: ContentTemplate[], mergeMode: ImportOptions['mergeMode']): Promise<{
    imported: number;
    skipped: number;
    errors: ValidationError[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] as ValidationError[] };
    const existingTemplates = localStorageService.getTemplates();
    const existingIds = new Set(existingTemplates.map(t => t.id));

    for (const template of templates) {
      try {
        if (existingIds.has(template.id)) {
          if (mergeMode === 'skip_existing') {
            result.skipped++;
            continue;
          } else if (mergeMode === 'merge' || mergeMode === 'replace') {
            localStorageService.updateTemplate(template.id, template);
            result.imported++;
          }
        } else {
          localStorageService.addTemplate(template);
          result.imported++;
        }
      } catch (error) {
        result.errors.push(new ValidationError(`Failed to import template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'template'));
      }
    }

    return result;
  }

  /**
   * Import schedules with merge logic
   */
  private async importSchedules(schedules: Record<string, WeeklySchedule>, mergeMode: ImportOptions['mergeMode']): Promise<{
    imported: number;
    skipped: number;
    errors: ValidationError[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] as ValidationError[] };
    const existingSchedules = localStorageService.getSchedules();

    for (const [weekKey, schedule] of Object.entries(schedules)) {
      try {
        if (weekKey in existingSchedules) {
          if (mergeMode === 'skip_existing') {
            result.skipped++;
            continue;
          } else if (mergeMode === 'merge' || mergeMode === 'replace') {
            localStorageService.setSchedule(weekKey, schedule);
            result.imported++;
          }
        } else {
          localStorageService.setSchedule(weekKey, schedule);
          result.imported++;
        }
      } catch (error) {
        result.errors.push(new ValidationError(`Failed to import schedule ${weekKey}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'schedule'));
      }
    }

    return result;
  }

  /**
   * Generate export filename with timestamp
   */
  private generateExportFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
    return `mcm-export-${timestamp}.json`;
  }

  /**
   * Get available backups
   */
  public getAvailableBackups(): Array<{ key: string; date: Date; size: number }> {
    const backups: Array<{ key: string; date: Date; size: number }> = [];
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('mcm_backup_')) {
        const timestamp = key.replace('mcm_backup_', '');
        const date = new Date(parseInt(timestamp));
        const data = localStorage.getItem(key);
        const size = data ? data.length : 0;
        
        backups.push({ key, date, size });
      }
    });
    
    return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(backupKey: string): Promise<ImportResult> {
    const backupData = localStorage.getItem(backupKey);
    if (!backupData) {
      throw new Error(`Backup not found: ${backupKey}`);
    }
    
    return this.importData(backupData, {
      mergeMode: 'replace',
      validateData: true,
      createBackup: false // Don't create backup when restoring
    });
  }

  /**
   * Delete backup
   */
  public deleteBackup(backupKey: string): void {
    localStorage.removeItem(backupKey);
  }
}

// Export singleton instance
export const dataExportService = DataExportService.getInstance();