import { LocalStorageService } from './localStorage';
import { Channel, ContentTemplate, WeeklySchedule, AppState } from '../types';

/**
 * Debounced localStorage service to batch updates and improve performance
 */
export class DebouncedLocalStorageService {
  private static instance: DebouncedLocalStorageService;
  private localStorageService: LocalStorageService;
  private pendingUpdates: Map<string, any> = new Map();
  private updateTimeouts: Map<string, number> = new Map();
  private readonly DEBOUNCE_DELAY = 300; // 300ms delay

  private constructor() {
    this.localStorageService = LocalStorageService.getInstance();
  }

  public static getInstance(): DebouncedLocalStorageService {
    if (!DebouncedLocalStorageService.instance) {
      DebouncedLocalStorageService.instance = new DebouncedLocalStorageService();
    }
    return DebouncedLocalStorageService.instance;
  }

  /**
   * Debounced update for channels
   */
  public debouncedUpdateChannels(channels: Channel[]): void {
    this.debouncedUpdate('channels', channels, () => {
      // Clear existing channels and add new ones
      const currentChannels = this.localStorageService.getChannels();
      currentChannels.forEach(channel => {
        try {
          this.localStorageService.deleteChannel(channel.id);
        } catch {
          // Channel might not exist, ignore error
        }
      });
      
      channels.forEach(channel => {
        this.localStorageService.addChannel(channel);
      });
    });
  }

  /**
   * Debounced update for templates
   */
  public debouncedUpdateTemplates(templates: ContentTemplate[]): void {
    this.debouncedUpdate('templates', templates, () => {
      // Clear existing templates and add new ones
      const currentTemplates = this.localStorageService.getTemplates();
      currentTemplates.forEach(template => {
        try {
          this.localStorageService.deleteTemplate(template.id);
        } catch {
          // Template might not exist, ignore error
        }
      });
      
      templates.forEach(template => {
        this.localStorageService.addTemplate(template);
      });
    });
  }

  /**
   * Debounced update for schedule
   */
  public debouncedUpdateSchedule(weekKey: string, schedule: WeeklySchedule): void {
    this.debouncedUpdate(`schedule_${weekKey}`, schedule, () => {
      this.localStorageService.setSchedule(weekKey, schedule);
    });
  }

  /**
   * Debounced update for user settings
   */
  public debouncedUpdateUserSettings(settings: AppState['userSettings']): void {
    this.debouncedUpdate('userSettings', settings, () => {
      this.localStorageService.updateUserSettings(settings);
    });
  }

  /**
   * Generic debounced update method
   */
  private debouncedUpdate<T>(key: string, data: T, updateFn: () => void): void {
    // Store the pending update
    this.pendingUpdates.set(key, data);

    // Clear existing timeout
    const existingTimeout = this.updateTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      try {
        updateFn();
        this.pendingUpdates.delete(key);
        this.updateTimeouts.delete(key);
      } catch (error) {
        console.error(`Failed to update ${key}:`, error);
        // Keep the pending update for retry
      }
    }, this.DEBOUNCE_DELAY);

    this.updateTimeouts.set(key, timeout);
  }

  /**
   * Force flush all pending updates immediately
   */
  public flushPendingUpdates(): Promise<void> {
    return new Promise((resolve) => {
      const timeouts = Array.from(this.updateTimeouts.values());
      
      // Clear all timeouts and execute updates immediately
      this.updateTimeouts.forEach((timeout, key) => {
        clearTimeout(timeout);
        
        const pendingData = this.pendingUpdates.get(key);
        if (pendingData) {
          try {
            if (key === 'channels') {
              this.localStorageService.getChannels().forEach(channel => {
                try {
                  this.localStorageService.deleteChannel(channel.id);
                } catch {
                  // Ignore errors
                }
              });
              (pendingData as Channel[]).forEach(channel => {
                this.localStorageService.addChannel(channel);
              });
            } else if (key === 'templates') {
              this.localStorageService.getTemplates().forEach(template => {
                try {
                  this.localStorageService.deleteTemplate(template.id);
                } catch {
                  // Ignore errors
                }
              });
              (pendingData as ContentTemplate[]).forEach(template => {
                this.localStorageService.addTemplate(template);
              });
            } else if (key.startsWith('schedule_')) {
              const weekKey = key.replace('schedule_', '');
              this.localStorageService.setSchedule(weekKey, pendingData as WeeklySchedule);
            } else if (key === 'userSettings') {
              this.localStorageService.updateUserSettings(pendingData as AppState['userSettings']);
            }
          } catch (error) {
            console.error(`Failed to flush update for ${key}:`, error);
          }
        }
      });

      // Clear all pending updates and timeouts
      this.pendingUpdates.clear();
      this.updateTimeouts.clear();

      resolve();
    });
  }

  /**
   * Get pending update count for monitoring
   */
  public getPendingUpdateCount(): number {
    return this.pendingUpdates.size;
  }

  /**
   * Check if there are pending updates for a specific key
   */
  public hasPendingUpdate(key: string): boolean {
    return this.pendingUpdates.has(key);
  }

  /**
   * Cancel pending update for a specific key
   */
  public cancelPendingUpdate(key: string): void {
    const timeout = this.updateTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.updateTimeouts.delete(key);
    }
    this.pendingUpdates.delete(key);
  }

  /**
   * Get immediate access to localStorage service for read operations
   */
  public getLocalStorageService(): LocalStorageService {
    return this.localStorageService;
  }
}

// Export singleton instance
export const debouncedLocalStorageService = DebouncedLocalStorageService.getInstance();