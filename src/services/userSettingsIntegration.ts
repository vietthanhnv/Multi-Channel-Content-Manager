import { AppState } from '../types';

/**
 * Service for integrating user settings throughout the application
 */
export class UserSettingsIntegrationService {
  /**
   * Get default scheduling time within user's working hours
   */
  static getDefaultSchedulingTime(
    userSettings: AppState['userSettings'],
    date?: Date,
    durationHours: number = 2
  ): { start: string; end: string } {
    const targetDate = date || this.getNextWorkingDay(userSettings);
    
    // Set start time to user's working hours start
    const [startHour, startMinute] = userSettings.workingHours.start.split(':').map(Number);
    targetDate.setHours(startHour, startMinute, 0, 0);
    
    // Set end time based on duration
    const endTime = new Date(targetDate);
    endTime.setHours(startHour + durationHours, startMinute, 0, 0);
    
    // Ensure end time doesn't exceed working hours
    const [endWorkHour] = userSettings.workingHours.end.split(':').map(Number);
    if (endTime.getHours() > endWorkHour) {
      endTime.setHours(endWorkHour, 0, 0, 0);
    }
    
    return {
      start: targetDate.toISOString().slice(0, 16),
      end: endTime.toISOString().slice(0, 16),
    };
  }

  /**
   * Get the next working day based on user settings
   */
  static getNextWorkingDay(userSettings: AppState['userSettings']): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Find next working day
    while (!userSettings.workingDays.includes(dayNames[tomorrow.getDay()])) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return tomorrow;
  }

  /**
   * Get default preferred posting time within working hours
   */
  static getDefaultPostingTime(userSettings: AppState['userSettings']): string {
    const [startHour] = userSettings.workingHours.start.split(':').map(Number);
    const [endHour] = userSettings.workingHours.end.split(':').map(Number);
    
    // Use middle of working hours as default
    const midHour = Math.floor((startHour + endHour) / 2);
    return `${midHour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Get default preferred days based on user's working days
   */
  static getDefaultPreferredDays(
    userSettings: AppState['userSettings'],
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'weekly'
  ): string[] {
    if (frequency === 'daily') {
      return [...userSettings.workingDays];
    }
    
    // For weekly/biweekly/monthly, suggest a subset of working days
    const workingDays = [...userSettings.workingDays];
    
    switch (frequency) {
      case 'weekly':
        // Suggest 1-2 days for weekly posting
        return workingDays.slice(0, Math.min(2, workingDays.length));
      
      case 'biweekly':
        // Suggest 1 day for biweekly posting
        return workingDays.slice(0, 1);
      
      case 'monthly':
        // Suggest 1 day for monthly posting
        return workingDays.slice(0, 1);
      
      default:
        return workingDays.slice(0, Math.min(3, workingDays.length));
    }
  }

  /**
   * Validate if a time slot is within working hours
   */
  static isWithinWorkingHours(
    time: string,
    userSettings: AppState['userSettings']
  ): boolean {
    const [hour] = time.split(':').map(Number);
    const [startHour] = userSettings.workingHours.start.split(':').map(Number);
    const [endHour] = userSettings.workingHours.end.split(':').map(Number);
    
    return hour >= startHour && hour < endHour;
  }

  /**
   * Validate if a date is a working day
   */
  static isWorkingDay(
    date: Date,
    userSettings: AppState['userSettings']
  ): boolean {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    return userSettings.workingDays.includes(dayName);
  }

  /**
   * Get suggested time slots for a given day based on user settings
   */
  static getSuggestedTimeSlots(
    date: Date,
    userSettings: AppState['userSettings'],
    taskDurationHours: number = 2
  ): Array<{ start: string; end: string; label: string }> {
    if (!this.isWorkingDay(date, userSettings)) {
      return [];
    }

    const suggestions: Array<{ start: string; end: string; label: string }> = [];
    const [startHour] = userSettings.workingHours.start.split(':').map(Number);
    const [endHour] = userSettings.workingHours.end.split(':').map(Number);
    
    // Generate suggestions every 2 hours within working hours
    for (let hour = startHour; hour + taskDurationHours <= endHour; hour += 2) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + taskDurationHours).toString().padStart(2, '0')}:00`;
      
      let label = '';
      if (hour === startHour) {
        label = 'Start of day';
      } else if (hour + taskDurationHours === endHour) {
        label = 'End of day';
      } else if (hour === Math.floor((startHour + endHour) / 2)) {
        label = 'Mid-day';
      } else {
        label = `${startTime} - ${endTime}`;
      }
      
      suggestions.push({ start: startTime, end: endTime, label });
    }
    
    return suggestions;
  }

  /**
   * Calculate optimal task distribution based on user settings
   */
  static calculateOptimalDistribution(
    totalHours: number,
    userSettings: AppState['userSettings']
  ): {
    hoursPerDay: number;
    daysNeeded: number;
    suggestedDays: string[];
    isWithinCapacity: boolean;
  } {
    const workingDaysCount = userSettings.workingDays.length;
    const dailyCapacity = userSettings.weeklyCapacityHours / workingDaysCount;
    
    const hoursPerDay = Math.ceil((totalHours / workingDaysCount) * 10) / 10;
    const daysNeeded = Math.ceil(totalHours / dailyCapacity);
    
    const suggestedDays = userSettings.workingDays.slice(0, daysNeeded);
    const isWithinCapacity = totalHours <= userSettings.weeklyCapacityHours;
    
    return {
      hoursPerDay,
      daysNeeded,
      suggestedDays,
      isWithinCapacity,
    };
  }

  /**
   * Get user settings summary for display
   */
  static getUserSettingsSummary(userSettings: AppState['userSettings']): {
    workingDaysText: string;
    workingHoursText: string;
    capacityText: string;
    dailyCapacityText: string;
  } {
    const workingDaysText = userSettings.workingDays.length === 7 
      ? 'Every day'
      : userSettings.workingDays.join(', ');
    
    const workingHoursText = `${userSettings.workingHours.start} - ${userSettings.workingHours.end}`;
    
    const capacityText = `${userSettings.weeklyCapacityHours} hours/week`;
    
    const dailyCapacity = userSettings.workingDays.length > 0 
      ? userSettings.weeklyCapacityHours / userSettings.workingDays.length 
      : 0;
    const dailyCapacityText = `${dailyCapacity.toFixed(1)} hours/day`;
    
    return {
      workingDaysText,
      workingHoursText,
      capacityText,
      dailyCapacityText,
    };
  }
}