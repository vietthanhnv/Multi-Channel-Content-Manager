import { 
  Channel, 
  TaskTemplate, 
  Task, 
  WeeklySchedule, 
  AppState,
  TaskCategory,
  TaskStatus,
  ChannelContentType,
  PostingFrequency
} from '../types';
import { DAYS_OF_WEEK } from '../utils/constants';
import { dateRangesOverlap } from '../utils/helpers';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Base validation utilities
 */
export class ValidationUtils {
  static isValidId(id: string): boolean {
    return typeof id === 'string' && id.length > 0;
  }

  static isValidString(value: string, minLength: number = 1, maxLength: number = 255): boolean {
    return typeof value === 'string' && 
           value.trim().length >= minLength && 
           value.length <= maxLength;
  }

  static isValidNumber(value: number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           value >= min && 
           value <= max;
  }

  static isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  static isValidArray<T>(array: T[], validator?: (item: T) => boolean): boolean {
    if (!Array.isArray(array)) return false;
    if (validator) {
      return array.every(validator);
    }
    return true;
  }

  static isValidEnum<T>(value: T, enumValues: readonly T[]): boolean {
    return enumValues.includes(value);
  }
}

/**
 * Channel validation
 */
export class ChannelValidator {
  static validate(channel: Channel): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate ID
    if (!ValidationUtils.isValidId(channel.id)) {
      errors.push(new ValidationError('Channel ID is required and must be a non-empty string', 'id'));
    }

    // Validate name
    if (!ValidationUtils.isValidString(channel.name, 1, 100)) {
      errors.push(new ValidationError('Channel name must be between 1 and 100 characters', 'name'));
    }

    // Validate content type
    const validContentTypes: ChannelContentType[] = ['gaming', 'educational', 'entertainment', 'lifestyle', 'other'];
    if (!ValidationUtils.isValidEnum(channel.contentType, validContentTypes)) {
      errors.push(new ValidationError('Invalid channel content type', 'contentType'));
    }

    // Validate posting schedule
    const scheduleErrors = this.validatePostingSchedule(channel.postingSchedule);
    errors.push(...scheduleErrors);

    // Validate color
    if (!ValidationUtils.isValidString(channel.color, 4, 7) || !channel.color.startsWith('#')) {
      errors.push(new ValidationError('Channel color must be a valid hex color code', 'color'));
    }

    // Validate createdAt
    if (!ValidationUtils.isValidDate(channel.createdAt)) {
      errors.push(new ValidationError('Channel createdAt must be a valid date', 'createdAt'));
    }

    // Validate isActive
    if (typeof channel.isActive !== 'boolean') {
      errors.push(new ValidationError('Channel isActive must be a boolean', 'isActive'));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validatePostingSchedule(schedule: Channel['postingSchedule']): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate frequency
    const validFrequencies: PostingFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly'];
    if (!ValidationUtils.isValidEnum(schedule.frequency, validFrequencies)) {
      errors.push(new ValidationError('Invalid posting frequency', 'postingSchedule.frequency'));
    }

    // Validate preferred days
    if (!ValidationUtils.isValidArray(schedule.preferredDays, (day) => DAYS_OF_WEEK.includes(day as any))) {
      errors.push(new ValidationError('Preferred days must be valid day names', 'postingSchedule.preferredDays'));
    }

    // Validate preferred times
    if (!ValidationUtils.isValidArray(schedule.preferredTimes, this.isValidTimeString)) {
      errors.push(new ValidationError('Preferred times must be valid time strings (HH:MM)', 'postingSchedule.preferredTimes'));
    }

    return errors;
  }

  private static isValidTimeString(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }
}

/**
 * Content template validation
 */
export class TaskTemplateValidator {
  static validate(template: TaskTemplate): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate ID
    if (!ValidationUtils.isValidId(template.id)) {
      errors.push(new ValidationError('Template ID is required and must be a non-empty string', 'id'));
    }

    // Validate title
    if (!ValidationUtils.isValidString(template.title, 1, 100)) {
      errors.push(new ValidationError('Template title must be between 1 and 100 characters', 'title'));
    }

    // Validate description
    if (!ValidationUtils.isValidString(template.description, 1, 500)) {
      errors.push(new ValidationError('Template description must be between 1 and 500 characters', 'description'));
    }

    // Validate category
    const validCategories: TaskCategory[] = ['content-creation', 'production', 'marketing', 'admin', 'other'];
    if (!ValidationUtils.isValidEnum(template.category, validCategories)) {
      errors.push(new ValidationError('Invalid template category', 'category'));
    }

    // Validate estimated hours
    if (!ValidationUtils.isValidNumber(template.estimatedHours, 0.5, 168)) { // Min 0.5h, Max 168 hours (1 week)
      errors.push(new ValidationError('Estimated hours must be between 0.5 and 168 hours', 'estimatedHours'));
    }

    // Validate workflow steps
    if (!ValidationUtils.isValidArray(template.workflowSteps, (step) => ValidationUtils.isValidString(step as string, 1, 200))) {
      errors.push(new ValidationError('Workflow steps must be an array of valid strings', 'workflowSteps'));
    }

    // Validate created date
    if (!ValidationUtils.isValidDate(template.createdAt)) {
      errors.push(new ValidationError('Created date must be a valid date', 'createdAt'));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Task validation
 */
export class TaskValidator {
  static validate(task: Task): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate ID
    if (!ValidationUtils.isValidId(task.id)) {
      errors.push(new ValidationError('Task ID is required and must be a non-empty string', 'id'));
    }

    // Validate channel ID
    if (!ValidationUtils.isValidId(task.channelId)) {
      errors.push(new ValidationError('Task channel ID is required and must be a non-empty string', 'channelId'));
    }

    // Validate template ID (optional)
    if (task.templateId && !ValidationUtils.isValidId(task.templateId)) {
      errors.push(new ValidationError('Task template ID must be a valid string if provided', 'templateId'));
    }

    // Validate title
    if (!ValidationUtils.isValidString(task.title, 1, 200)) {
      errors.push(new ValidationError('Task title must be between 1 and 200 characters', 'title'));
    }

    // Validate description (optional)
    if (task.description && !ValidationUtils.isValidString(task.description, 0, 500)) {
      errors.push(new ValidationError('Description must be less than 500 characters if provided', 'description'));
    }

    // Validate estimated hours
    if (!ValidationUtils.isValidNumber(task.estimatedHours, 0.1, 168)) {
      errors.push(new ValidationError('Estimated hours must be between 0.1 and 168', 'estimatedHours'));
    }

    // Validate status
    const validStatuses: TaskStatus[] = ['planned', 'in-progress', 'completed', 'overdue'];
    if (!ValidationUtils.isValidEnum(task.status, validStatuses)) {
      errors.push(new ValidationError('Invalid task status', 'status'));
    }

    // Validate scheduled dates
    if (!ValidationUtils.isValidDate(task.scheduledStart)) {
      errors.push(new ValidationError('Scheduled start must be a valid date', 'scheduledStart'));
    }

    if (!ValidationUtils.isValidDate(task.scheduledEnd)) {
      errors.push(new ValidationError('Scheduled end must be a valid date', 'scheduledEnd'));
    }

    // Validate date logic
    if (ValidationUtils.isValidDate(task.scheduledStart) && ValidationUtils.isValidDate(task.scheduledEnd)) {
      if (task.scheduledStart >= task.scheduledEnd) {
        errors.push(new ValidationError('Scheduled start must be before scheduled end', 'scheduledStart'));
      }
    }

    // Validate actual hours (optional)
    if (task.actualHours !== undefined && !ValidationUtils.isValidNumber(task.actualHours, 0, 168)) {
      errors.push(new ValidationError('Actual hours must be between 0 and 168 if provided', 'actualHours'));
    }

    // Validate notes (optional)
    if (task.notes && !ValidationUtils.isValidString(task.notes, 0, 1000)) {
      errors.push(new ValidationError('Notes must be less than 1000 characters if provided', 'notes'));
    }

    // Validate time slot
    const validTimeSlots = ['morning', 'afternoon', 'evening'];
    if (!ValidationUtils.isValidEnum(task.timeSlot, validTimeSlots)) {
      errors.push(new ValidationError('Invalid time slot', 'timeSlot'));
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high'];
    if (!ValidationUtils.isValidEnum(task.priority, validPriorities)) {
      errors.push(new ValidationError('Invalid priority', 'priority'));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Weekly schedule validation
 */
export class ScheduleValidator {
  static validate(schedule: WeeklySchedule): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate week start date
    if (!ValidationUtils.isValidDate(schedule.weekStartDate)) {
      errors.push(new ValidationError('Week start date must be a valid date', 'weekStartDate'));
    }

    // Validate tasks array
    if (!ValidationUtils.isValidArray(schedule.tasks)) {
      errors.push(new ValidationError('Tasks must be a valid array', 'tasks'));
    } else {
      // Validate each task
      schedule.tasks.forEach((task, index) => {
        const taskValidation = TaskValidator.validate(task);
        if (!taskValidation.isValid) {
          taskValidation.errors.forEach(error => {
            errors.push(new ValidationError(`Task ${index}: ${error.message}`, `tasks[${index}].${error.field}`));
          });
        }
      });
    }

    // Validate total scheduled hours
    if (!ValidationUtils.isValidNumber(schedule.totalScheduledHours, 0, 168)) {
      errors.push(new ValidationError('Total scheduled hours must be between 0 and 168', 'totalScheduledHours'));
    }

    // Validate user capacity hours
    if (!ValidationUtils.isValidNumber(schedule.userCapacityHours, 0, 168)) {
      errors.push(new ValidationError('User capacity hours must be between 0 and 168', 'userCapacityHours'));
    }

    // Validate isOverloaded
    if (typeof schedule.isOverloaded !== 'boolean') {
      errors.push(new ValidationError('isOverloaded must be a boolean', 'isOverloaded'));
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Business rule validators
 */
export class BusinessRuleValidator {
  /**
   * Check for scheduling conflicts between tasks
   */
  static checkSchedulingConflicts(tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i];
        const task2 = tasks[j];
        
        if (dateRangesOverlap(
          task1.scheduledStart,
          task1.scheduledEnd,
          task2.scheduledStart,
          task2.scheduledEnd
        )) {
          errors.push(new ValidationError(
            `Scheduling conflict between tasks "${task1.title}" and "${task2.title}"`,
            'scheduling_conflict'
          ));
        }
      }
    }
    
    return errors;
  }

  /**
   * Check capacity limits for a schedule
   */
  static checkCapacityLimits(schedule: WeeklySchedule): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (schedule.totalScheduledHours > schedule.userCapacityHours) {
      const overload = schedule.totalScheduledHours - schedule.userCapacityHours;
      errors.push(new ValidationError(
        `Schedule exceeds capacity by ${overload.toFixed(1)} hours`,
        'capacity_exceeded'
      ));
    }
    
    return errors;
  }

  /**
   * Check referential integrity between channels and tasks
   */
  static checkChannelTaskIntegrity(channels: Channel[], tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const channelIds = new Set(channels.map(c => c.id));
    
    tasks.forEach(task => {
      if (!channelIds.has(task.channelId)) {
        errors.push(new ValidationError(
          `Task "${task.title}" references non-existent channel: ${task.channelId}`,
          'invalid_channel_reference'
        ));
      }
    });
    
    return errors;
  }

  /**
   * Check referential integrity between templates and tasks
   */
  static checkTemplateTaskIntegrity(templates: ContentTemplate[], tasks: Task[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const templateIds = new Set(templates.map(t => t.id));
    
    tasks.forEach(task => {
      if (task.templateId && !templateIds.has(task.templateId)) {
        errors.push(new ValidationError(
          `Task "${task.title}" references non-existent template: ${task.templateId}`,
          'invalid_template_reference'
        ));
      }
    });
    
    return errors;
  }

  /**
   * Check template channel associations
   */
  static checkTemplateChannelIntegrity(templates: ContentTemplate[], channels: Channel[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const channelIds = new Set(channels.map(c => c.id));
    
    templates.forEach(template => {
      template.channelIds.forEach(channelId => {
        if (!channelIds.has(channelId)) {
          errors.push(new ValidationError(
            `Template "${template.name}" references non-existent channel: ${channelId}`,
            'invalid_channel_reference'
          ));
        }
      });
    });
    
    return errors;
  }
}

/**
 * Comprehensive data validation service
 */
export class DataValidator {
  /**
   * Validate complete application state
   */
  static validateAppState(state: Partial<AppState>): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate channels
    if (state.channels) {
      state.channels.forEach((channel, index) => {
        const validation = ChannelValidator.validate(channel);
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            errors.push(new ValidationError(`Channel ${index}: ${error.message}`, `channels[${index}].${error.field}`));
          });
        }
      });
    }

    // Validate templates
    if (state.taskTemplates) {
      state.taskTemplates.forEach((template, index) => {
        const validation = TaskTemplateValidator.validate(template);
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            errors.push(new ValidationError(`Template ${index}: ${error.message}`, `taskTemplates[${index}].${error.field}`));
          });
        }
      });
    }

    // Validate current week schedule
    if (state.currentWeek) {
      const validation = ScheduleValidator.validate(state.currentWeek);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          errors.push(new ValidationError(`Current week: ${error.message}`, `currentWeek.${error.field}`));
        });
      }
    }

    // Business rule validations
    if (state.channels && state.templates) {
      const templateChannelErrors = BusinessRuleValidator.checkTemplateChannelIntegrity(state.templates, state.channels);
      errors.push(...templateChannelErrors);
    }

    if (state.channels && state.currentWeek) {
      const channelTaskErrors = BusinessRuleValidator.checkChannelTaskIntegrity(state.channels, state.currentWeek.tasks);
      errors.push(...channelTaskErrors);
    }

    if (state.templates && state.currentWeek) {
      const templateTaskErrors = BusinessRuleValidator.checkTemplateTaskIntegrity(state.templates, state.currentWeek.tasks);
      errors.push(...templateTaskErrors);
    }

    if (state.currentWeek) {
      const conflictErrors = BusinessRuleValidator.checkSchedulingConflicts(state.currentWeek.tasks);
      errors.push(...conflictErrors);

      const capacityErrors = BusinessRuleValidator.checkCapacityLimits(state.currentWeek);
      errors.push(...capacityErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}