/**
 * Migration utility to convert existing channels with predefined content types
 * to use custom content types
 */

import { Channel } from '../types';
import { localStorageService } from '../services/localStorage';

// Map of old predefined types to suggested custom types
const PREDEFINED_TO_CUSTOM_MAP: Record<string, string> = {
  'gaming': 'Gaming',
  'educational': 'Educational',
  'entertainment': 'Entertainment', 
  'lifestyle': 'Lifestyle',
  'other': 'General'
};

export class ContentTypeMigration {
  /**
   * Migrate existing channels from predefined content types to custom types
   */
  static migrateExistingChannels(): void {
    try {
      const channels = localStorageService.getChannels();
      const userSettings = localStorageService.getUserSettings();
      
      // Collect all unique content types from existing channels
      const existingContentTypes = new Set<string>();
      channels.forEach(channel => {
        if (channel.contentType) {
          existingContentTypes.add(channel.contentType);
        }
      });

      // Convert predefined types to custom types
      const customContentTypes = new Set(userSettings.customContentTypes || []);
      
      existingContentTypes.forEach(contentType => {
        if (PREDEFINED_TO_CUSTOM_MAP[contentType]) {
          // Map predefined type to custom equivalent
          customContentTypes.add(PREDEFINED_TO_CUSTOM_MAP[contentType]);
        } else {
          // Keep existing custom types
          customContentTypes.add(contentType);
        }
      });

      // Update channels to use new content type names
      const updatedChannels = channels.map(channel => {
        const mappedType = PREDEFINED_TO_CUSTOM_MAP[channel.contentType];
        return {
          ...channel,
          contentType: mappedType || channel.contentType
        };
      });

      // Save updated data
      localStorageService.updateUserSettings({
        customContentTypes: Array.from(customContentTypes)
      });

      // Update each channel
      updatedChannels.forEach(channel => {
        localStorageService.updateChannel(channel.id, { contentType: channel.contentType });
      });

      console.log('✅ Content type migration completed successfully');
      console.log('Migrated content types:', Array.from(customContentTypes));
      
    } catch (error) {
      console.error('❌ Content type migration failed:', error);
    }
  }

  /**
   * Check if migration is needed
   */
  static isMigrationNeeded(): boolean {
    try {
      const channels = localStorageService.getChannels();
      const userSettings = localStorageService.getUserSettings();
      
      // Check if any channels use predefined types
      const hasPredefinedTypes = channels.some(channel => 
        Object.keys(PREDEFINED_TO_CUSTOM_MAP).includes(channel.contentType)
      );

      // Check if user settings don't have custom content types
      const hasNoCustomTypes = !userSettings.customContentTypes || userSettings.customContentTypes.length === 0;

      return hasPredefinedTypes || hasNoCustomTypes;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Auto-migrate on app startup if needed
   */
  static autoMigrateIfNeeded(): void {
    if (this.isMigrationNeeded()) {
      console.log('🔄 Auto-migrating content types...');
      this.migrateExistingChannels();
    }
  }
}