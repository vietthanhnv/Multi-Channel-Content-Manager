import { Channel, ContentTemplate, WeeklySchedule, AppState } from '../types';
import { STORAGE_KEYS, APP_VERSION, DEFAULT_USER_SETTINGS } from '../utils/constants';

/**
 * Error types for localStorage operations
 */
export class LocalStorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'LocalStorageError';
  }
}

export class QuotaExceededError extends LocalStorageError {
  constructor() {
    super('localStorage quota exceeded', 'QUOTA_EXCEEDED');
  }
}

export class DataCorruptionError extends LocalStorageError {
  constructor(key: string) {
    super(`Data corruption detected for key: ${key}`, 'DATA_CORRUPTION');
  }
}

/**
 * localStorage service with CRUD operations, validation, and error handling
 */
export class LocalStorageService {
  private static instance: LocalStorageService;

  private constructor() {
    this.initializeStorage();
  }

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  /**
   * Initialize storage with default values if not present
   */
  private initializeStorage(): void {
    try {
      // Check if localStorage is available
      if (!this.isLocalStorageAvailable()) {
        throw new LocalStorageError('localStorage is not available', 'UNAVAILABLE');
      }

      // Initialize app version
      if (!localStorage.getItem(STORAGE_KEYS.APP_VERSION)) {
        localStorage.setItem(STORAGE_KEYS.APP_VERSION, APP_VERSION);
      }

      // Initialize empty arrays if not present
      if (!localStorage.getItem(STORAGE_KEYS.CHANNELS)) {
        this.setItem(STORAGE_KEYS.CHANNELS, []);
      }

      if (!localStorage.getItem(STORAGE_KEYS.TEMPLATES)) {
        this.setItem(STORAGE_KEYS.TEMPLATES, []);
      }

      if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
        this.setItem(STORAGE_KEYS.SCHEDULES, {});
      }

      if (!localStorage.getItem(STORAGE_KEYS.USER_SETTINGS)) {
        this.setItem(STORAGE_KEYS.USER_SETTINGS, DEFAULT_USER_SETTINGS);
      }
    } catch (error) {
      console.error('Failed to initialize localStorage:', error);
      throw error;
    }
  }

  /**
   * Check if localStorage is available
   */
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

  /**
   * Safely set item in localStorage with quota monitoring
   */
  private setItem<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof DOMException && error.code === 22) {
        throw new QuotaExceededError();
      }
      throw new LocalStorageError(`Failed to set item: ${key}`, 'SET_FAILED');
    }
  }

  /**
   * Safely get item from localStorage with validation
   */
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to parse localStorage item: ${key}`, error);
      throw new DataCorruptionError(key);
    }
  }

  // Channel CRUD operations
  public getChannels(): Channel[] {
    return this.getItem(STORAGE_KEYS.CHANNELS, []);
  }

  public getChannel(id: string): Channel | null {
    const channels = this.getChannels();
    return channels.find(channel => channel.id === id) || null;
  }

  public addChannel(channel: Channel): void {
    const channels = this.getChannels();
    channels.push(channel);
    this.setItem(STORAGE_KEYS.CHANNELS, channels);
  }

  public updateChannel(id: string, updates: Partial<Channel>): void {
    const channels = this.getChannels();
    const index = channels.findIndex(channel => channel.id === id);
    if (index === -1) {
      throw new LocalStorageError(`Channel not found: ${id}`, 'NOT_FOUND');
    }
    channels[index] = { ...channels[index], ...updates };
    this.setItem(STORAGE_KEYS.CHANNELS, channels);
  }

  public deleteChannel(id: string): void {
    const channels = this.getChannels();
    const filteredChannels = channels.filter(channel => channel.id !== id);
    if (filteredChannels.length === channels.length) {
      throw new LocalStorageError(`Channel not found: ${id}`, 'NOT_FOUND');
    }
    this.setItem(STORAGE_KEYS.CHANNELS, filteredChannels);
  }

  // Template CRUD operations
  public getTemplates(): ContentTemplate[] {
    return this.getItem(STORAGE_KEYS.TEMPLATES, []);
  }

  public getTemplate(id: string): ContentTemplate | null {
    const templates = this.getTemplates();
    return templates.find(template => template.id === id) || null;
  }

  public addTemplate(template: ContentTemplate): void {
    const templates = this.getTemplates();
    templates.push(template);
    this.setItem(STORAGE_KEYS.TEMPLATES, templates);
  }

  public updateTemplate(id: string, updates: Partial<ContentTemplate>): void {
    const templates = this.getTemplates();
    const index = templates.findIndex(template => template.id === id);
    if (index === -1) {
      throw new LocalStorageError(`Template not found: ${id}`, 'NOT_FOUND');
    }
    templates[index] = { ...templates[index], ...updates };
    this.setItem(STORAGE_KEYS.TEMPLATES, templates);
  }

  public deleteTemplate(id: string): void {
    const templates = this.getTemplates();
    const filteredTemplates = templates.filter(template => template.id !== id);
    if (filteredTemplates.length === templates.length) {
      throw new LocalStorageError(`Template not found: ${id}`, 'NOT_FOUND');
    }
    this.setItem(STORAGE_KEYS.TEMPLATES, filteredTemplates);
  }

  // Schedule CRUD operations
  public getSchedules(): Record<string, WeeklySchedule> {
    return this.getItem(STORAGE_KEYS.SCHEDULES, {});
  }

  public getSchedule(weekKey: string): WeeklySchedule | null {
    const schedules = this.getSchedules();
    return schedules[weekKey] || null;
  }

  public setSchedule(weekKey: string, schedule: WeeklySchedule): void {
    const schedules = this.getSchedules();
    schedules[weekKey] = schedule;
    this.setItem(STORAGE_KEYS.SCHEDULES, schedules);
  }

  public deleteSchedule(weekKey: string): void {
    const schedules = this.getSchedules();
    if (!(weekKey in schedules)) {
      throw new LocalStorageError(`Schedule not found: ${weekKey}`, 'NOT_FOUND');
    }
    delete schedules[weekKey];
    this.setItem(STORAGE_KEYS.SCHEDULES, schedules);
  }

  // User settings operations
  public getUserSettings(): AppState['userSettings'] {
    return this.getItem(STORAGE_KEYS.USER_SETTINGS, DEFAULT_USER_SETTINGS);
  }

  public updateUserSettings(updates: Partial<AppState['userSettings']>): void {
    const currentSettings = this.getUserSettings();
    const newSettings = { ...currentSettings, ...updates };
    this.setItem(STORAGE_KEYS.USER_SETTINGS, newSettings);
  }

  // Utility methods
  public getStorageInfo(): {
    used: number;
    available: number;
    percentage: number;
  } {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Estimate available space (most browsers have ~5-10MB limit)
    const estimated = 5 * 1024 * 1024; // 5MB in bytes
    const available = Math.max(0, estimated - used);
    const percentage = (used / estimated) * 100;

    return { used, available, percentage };
  }

  public clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.initializeStorage();
  }

  public exportAllData(): string {
    const data = {
      version: APP_VERSION,
      channels: this.getChannels(),
      templates: this.getTemplates(),
      schedules: this.getSchedules(),
      userSettings: this.getUserSettings(),
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  public getAppVersion(): string {
    return localStorage.getItem(STORAGE_KEYS.APP_VERSION) || '0.0.0';
  }

  public setAppVersion(version: string): void {
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, version);
  }

  /**
   * Clean up old schedule data beyond retention period
   */
  public cleanupOldSchedules(retentionWeeks: number = 12): void {
    const schedules = this.getSchedules();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (retentionWeeks * 7));

    const cleanedSchedules: Record<string, WeeklySchedule> = {};
    
    Object.entries(schedules).forEach(([weekKey, schedule]) => {
      const scheduleDate = new Date(schedule.weekStartDate);
      if (scheduleDate >= cutoffDate) {
        cleanedSchedules[weekKey] = schedule;
      }
    });

    this.setItem(STORAGE_KEYS.SCHEDULES, cleanedSchedules);
  }
}

// Export singleton instance
export const localStorageService = LocalStorageService.getInstance();