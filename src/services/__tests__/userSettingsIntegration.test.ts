import { UserSettingsIntegrationService } from '../userSettingsIntegration';
import { AppState } from '../../types';

const mockUserSettings: AppState['userSettings'] = {
  weeklyCapacityHours: 40,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  workingHours: { start: '09:00', end: '17:00' }
};

describe('UserSettingsIntegrationService', () => {
  describe('getDefaultSchedulingTime', () => {
    it('should return scheduling time within working hours', () => {
      const result = UserSettingsIntegrationService.getDefaultSchedulingTime(
        mockUserSettings,
        new Date('2024-01-15T10:00:00'), // Monday
        2
      );

      expect(result.start).toContain('09:00');
      expect(result.end).toContain('11:00');
    });

    it('should not exceed working hours end time', () => {
      const result = UserSettingsIntegrationService.getDefaultSchedulingTime(
        mockUserSettings,
        new Date('2024-01-15T10:00:00'), // Monday
        10 // 10 hours duration
      );

      expect(result.end).toContain('17:00');
    });
  });

  describe('getNextWorkingDay', () => {
    it('should return next working day', () => {
      // Mock current date to be Sunday
      const mockDate = new Date('2024-01-14T10:00:00'); // Sunday
      jest.spyOn(Date.prototype, 'getDate').mockReturnValue(14);
      jest.spyOn(Date.prototype, 'setDate').mockImplementation();

      const result = UserSettingsIntegrationService.getNextWorkingDay(mockUserSettings);
      
      // Should skip to Monday (next working day)
      expect(result.getDay()).toBe(1); // Monday
    });
  });

  describe('getDefaultPostingTime', () => {
    it('should return middle of working hours', () => {
      const result = UserSettingsIntegrationService.getDefaultPostingTime(mockUserSettings);
      expect(result).toBe('13:00'); // Middle of 9-17 is 13:00
    });

    it('should handle different working hours', () => {
      const customSettings = {
        ...mockUserSettings,
        workingHours: { start: '08:00', end: '16:00' }
      };
      
      const result = UserSettingsIntegrationService.getDefaultPostingTime(customSettings);
      expect(result).toBe('12:00'); // Middle of 8-16 is 12:00
    });
  });

  describe('getDefaultPreferredDays', () => {
    it('should return all working days for daily frequency', () => {
      const result = UserSettingsIntegrationService.getDefaultPreferredDays(
        mockUserSettings,
        'daily'
      );
      
      expect(result).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    });

    it('should return subset for weekly frequency', () => {
      const result = UserSettingsIntegrationService.getDefaultPreferredDays(
        mockUserSettings,
        'weekly'
      );
      
      expect(result).toHaveLength(2);
      expect(result).toEqual(['Monday', 'Tuesday']);
    });

    it('should return single day for monthly frequency', () => {
      const result = UserSettingsIntegrationService.getDefaultPreferredDays(
        mockUserSettings,
        'monthly'
      );
      
      expect(result).toHaveLength(1);
      expect(result).toEqual(['Monday']);
    });
  });

  describe('isWithinWorkingHours', () => {
    it('should return true for time within working hours', () => {
      const result = UserSettingsIntegrationService.isWithinWorkingHours(
        '13:00',
        mockUserSettings
      );
      
      expect(result).toBe(true);
    });

    it('should return false for time outside working hours', () => {
      const result = UserSettingsIntegrationService.isWithinWorkingHours(
        '18:00',
        mockUserSettings
      );
      
      expect(result).toBe(false);
    });

    it('should return false for time before working hours', () => {
      const result = UserSettingsIntegrationService.isWithinWorkingHours(
        '08:00',
        mockUserSettings
      );
      
      expect(result).toBe(false);
    });
  });

  describe('isWorkingDay', () => {
    it('should return true for working day', () => {
      const monday = new Date('2024-01-15T10:00:00'); // Monday
      const result = UserSettingsIntegrationService.isWorkingDay(monday, mockUserSettings);
      
      expect(result).toBe(true);
    });

    it('should return false for non-working day', () => {
      const saturday = new Date('2024-01-13T10:00:00'); // Saturday
      const result = UserSettingsIntegrationService.isWorkingDay(saturday, mockUserSettings);
      
      expect(result).toBe(false);
    });
  });

  describe('getSuggestedTimeSlots', () => {
    it('should return empty array for non-working day', () => {
      const saturday = new Date('2024-01-13T10:00:00'); // Saturday
      const result = UserSettingsIntegrationService.getSuggestedTimeSlots(
        saturday,
        mockUserSettings,
        2
      );
      
      expect(result).toEqual([]);
    });

    it('should return time slots for working day', () => {
      const monday = new Date('2024-01-15T10:00:00'); // Monday
      const result = UserSettingsIntegrationService.getSuggestedTimeSlots(
        monday,
        mockUserSettings,
        2
      );
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('start');
      expect(result[0]).toHaveProperty('end');
      expect(result[0]).toHaveProperty('label');
    });

    it('should respect task duration', () => {
      const monday = new Date('2024-01-15T10:00:00'); // Monday
      const result = UserSettingsIntegrationService.getSuggestedTimeSlots(
        monday,
        mockUserSettings,
        4 // 4 hour task
      );
      
      // Should have fewer slots for longer tasks
      expect(result.length).toBeLessThan(4);
    });
  });

  describe('calculateOptimalDistribution', () => {
    it('should calculate distribution within capacity', () => {
      const result = UserSettingsIntegrationService.calculateOptimalDistribution(
        30, // 30 hours total
        mockUserSettings
      );
      
      expect(result.isWithinCapacity).toBe(true);
      expect(result.hoursPerDay).toBe(6);
      expect(result.daysNeeded).toBeLessThanOrEqual(5);
    });

    it('should handle overload scenarios', () => {
      const result = UserSettingsIntegrationService.calculateOptimalDistribution(
        60, // 60 hours total (exceeds 40 hour capacity)
        mockUserSettings
      );
      
      expect(result.isWithinCapacity).toBe(false);
      expect(result.hoursPerDay).toBe(12);
    });
  });

  describe('getUserSettingsSummary', () => {
    it('should return formatted summary', () => {
      const result = UserSettingsIntegrationService.getUserSettingsSummary(mockUserSettings);
      
      expect(result.workingDaysText).toBe('Monday, Tuesday, Wednesday, Thursday, Friday');
      expect(result.workingHoursText).toBe('09:00 - 17:00');
      expect(result.capacityText).toBe('40 hours/week');
      expect(result.dailyCapacityText).toBe('8.0 hours/day');
    });

    it('should handle every day scenario', () => {
      const allDaysSettings = {
        ...mockUserSettings,
        workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      };
      
      const result = UserSettingsIntegrationService.getUserSettingsSummary(allDaysSettings);
      
      expect(result.workingDaysText).toBe('Every day');
    });
  });
});