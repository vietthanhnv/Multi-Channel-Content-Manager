import {
  ValidationUtils,
  ChannelValidator,
  TemplateValidator,
  TaskValidator,
  ScheduleValidator,
  BusinessRuleValidator,
  DataValidator,
  ValidationError,
} from '../validation';
import { Channel, ContentTemplate, Task, WeeklySchedule, AppState } from '../../types';

describe('ValidationUtils', () => {
  describe('isValidId', () => {
    it('should return true for valid IDs', () => {
      expect(ValidationUtils.isValidId('valid-id')).toBe(true);
      expect(ValidationUtils.isValidId('123')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(ValidationUtils.isValidId('')).toBe(false);
      expect(ValidationUtils.isValidId(null as any)).toBe(false);
      expect(ValidationUtils.isValidId(undefined as any)).toBe(false);
    });
  });

  describe('isValidString', () => {
    it('should return true for valid strings', () => {
      expect(ValidationUtils.isValidString('valid string')).toBe(true);
      expect(ValidationUtils.isValidString('a', 1, 10)).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(ValidationUtils.isValidString('')).toBe(false);
      expect(ValidationUtils.isValidString('   ')).toBe(false);
      expect(ValidationUtils.isValidString('too long', 1, 5)).toBe(false);
      expect(ValidationUtils.isValidString(null as any)).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('should return true for valid numbers', () => {
      expect(ValidationUtils.isValidNumber(5)).toBe(true);
      expect(ValidationUtils.isValidNumber(0)).toBe(true);
      expect(ValidationUtils.isValidNumber(10, 5, 15)).toBe(true);
    });

    it('should return false for invalid numbers', () => {
      expect(ValidationUtils.isValidNumber(NaN)).toBe(false);
      expect(ValidationUtils.isValidNumber(-1, 0, 10)).toBe(false);
      expect(ValidationUtils.isValidNumber(15, 0, 10)).toBe(false);
      expect(ValidationUtils.isValidNumber('5' as any)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(ValidationUtils.isValidDate(new Date())).toBe(true);
      expect(ValidationUtils.isValidDate(new Date('2024-01-01'))).toBe(true);
    });

    it('should return false for invalid dates', () => {
      expect(ValidationUtils.isValidDate(new Date('invalid'))).toBe(false);
      expect(ValidationUtils.isValidDate('2024-01-01' as any)).toBe(false);
      expect(ValidationUtils.isValidDate(null as any)).toBe(false);
    });
  });

  describe('isValidArray', () => {
    it('should return true for valid arrays', () => {
      expect(ValidationUtils.isValidArray([])).toBe(true);
      expect(ValidationUtils.isValidArray([1, 2, 3])).toBe(true);
      expect(ValidationUtils.isValidArray([1, 2, 3], (x) => typeof x === 'number')).toBe(true);
    });

    it('should return false for invalid arrays', () => {
      expect(ValidationUtils.isValidArray('not array' as any)).toBe(false);
      expect(ValidationUtils.isValidArray([1, 2, 'string'], (x) => typeof x === 'number')).toBe(false);
    });
  });

  describe('isValidEnum', () => {
    it('should return true for valid enum values', () => {
      const validValues = ['a', 'b', 'c'] as const;
      expect(ValidationUtils.isValidEnum('a', validValues)).toBe(true);
    });

    it('should return false for invalid enum values', () => {
      const validValues = ['a', 'b', 'c'] as const;
      expect(ValidationUtils.isValidEnum('d', validValues)).toBe(false);
    });
  });
});

describe('ChannelValidator', () => {
  const validChannel: Channel = {
    id: 'channel-1',
    name: 'Test Channel',
    contentType: 'gaming',
    postingSchedule: {
      frequency: 'weekly',
      preferredDays: ['Monday', 'Wednesday'],
      preferredTimes: ['10:00', '14:00'],
    },
    color: '#ff0000',
    createdAt: new Date('2024-01-01'),
    isActive: true,
  };

  it('should validate a valid channel', () => {
    const result = ChannelValidator.validate(validChannel);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject channel with invalid ID', () => {
    const invalidChannel = { ...validChannel, id: '' };
    const result = ChannelValidator.validate(invalidChannel);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'id')).toBe(true);
  });

  it('should reject channel with invalid name', () => {
    const invalidChannel = { ...validChannel, name: '' };
    const result = ChannelValidator.validate(invalidChannel);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('should reject channel with invalid content type', () => {
    const invalidChannel = { ...validChannel, contentType: 'invalid' as any };
    const result = ChannelValidator.validate(invalidChannel);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'contentType')).toBe(true);
  });

  it('should reject channel with invalid color', () => {
    const invalidChannel = { ...validChannel, color: 'not-a-color' };
    const result = ChannelValidator.validate(invalidChannel);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'color')).toBe(true);
  });

  it('should reject channel with invalid posting schedule', () => {
    const invalidChannel = {
      ...validChannel,
      postingSchedule: {
        ...validChannel.postingSchedule,
        frequency: 'invalid' as any,
      },
    };
    const result = ChannelValidator.validate(invalidChannel);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field?.includes('postingSchedule'))).toBe(true);
  });

  it('should reject channel with invalid preferred times', () => {
    const invalidChannel = {
      ...validChannel,
      postingSchedule: {
        ...validChannel.postingSchedule,
        preferredTimes: ['25:00', 'invalid-time'],
      },
    };
    const result = ChannelValidator.validate(invalidChannel);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field?.includes('preferredTimes'))).toBe(true);
  });
});

describe('TemplateValidator', () => {
  const validTemplate: ContentTemplate = {
    id: 'template-1',
    name: 'Test Template',
    contentType: 'video',
    estimatedHours: {
      planning: 1,
      production: 4,
      editing: 3,
      publishing: 0.5,
    },
    workflowSteps: ['Plan', 'Record', 'Edit', 'Upload'],
    channelIds: ['channel-1'],
  };

  it('should validate a valid template', () => {
    const result = TemplateValidator.validate(validTemplate);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject template with invalid estimated hours', () => {
    const invalidTemplate = {
      ...validTemplate,
      estimatedHours: {
        ...validTemplate.estimatedHours,
        planning: -1,
      },
    };
    const result = TemplateValidator.validate(invalidTemplate);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field?.includes('estimatedHours'))).toBe(true);
  });

  it('should reject template with excessive total hours', () => {
    const invalidTemplate = {
      ...validTemplate,
      estimatedHours: {
        planning: 50,
        production: 50,
        editing: 50,
        publishing: 50,
      },
    };
    const result = TemplateValidator.validate(invalidTemplate);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'estimatedHours')).toBe(true);
  });

  it('should reject template with invalid workflow steps', () => {
    const invalidTemplate = {
      ...validTemplate,
      workflowSteps: ['', 'Valid step'],
    };
    const result = TemplateValidator.validate(invalidTemplate);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'workflowSteps')).toBe(true);
  });
});

describe('TaskValidator', () => {
  const validTask: Task = {
    id: 'task-1',
    channelId: 'channel-1',
    templateId: 'template-1',
    title: 'Test Task',
    contentType: 'video',
    estimatedHours: 8,
    status: 'planned',
    scheduledStart: new Date('2024-01-01T10:00:00'),
    scheduledEnd: new Date('2024-01-01T18:00:00'),
    actualHours: 7.5,
    notes: 'Test notes',
  };

  it('should validate a valid task', () => {
    const result = TaskValidator.validate(validTask);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject task with invalid date logic', () => {
    const invalidTask = {
      ...validTask,
      scheduledStart: new Date('2024-01-01T18:00:00'),
      scheduledEnd: new Date('2024-01-01T10:00:00'),
    };
    const result = TaskValidator.validate(invalidTask);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'scheduledStart')).toBe(true);
  });

  it('should reject task with invalid estimated hours', () => {
    const invalidTask = { ...validTask, estimatedHours: 0 };
    const result = TaskValidator.validate(invalidTask);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'estimatedHours')).toBe(true);
  });

  it('should reject task with invalid status', () => {
    const invalidTask = { ...validTask, status: 'invalid' as any };
    const result = TaskValidator.validate(invalidTask);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'status')).toBe(true);
  });
});

describe('ScheduleValidator', () => {
  const validSchedule: WeeklySchedule = {
    weekStartDate: new Date('2024-01-01'),
    tasks: [],
    totalScheduledHours: 40,
    userCapacityHours: 40,
    isOverloaded: false,
  };

  it('should validate a valid schedule', () => {
    const result = ScheduleValidator.validate(validSchedule);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject schedule with invalid total hours', () => {
    const invalidSchedule = { ...validSchedule, totalScheduledHours: -1 };
    const result = ScheduleValidator.validate(invalidSchedule);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'totalScheduledHours')).toBe(true);
  });

  it('should reject schedule with invalid tasks', () => {
    const invalidTask = {
      id: '',
      channelId: 'channel-1',
      title: 'Invalid Task',
      contentType: 'video' as const,
      estimatedHours: 8,
      status: 'planned' as const,
      scheduledStart: new Date('2024-01-01T10:00:00'),
      scheduledEnd: new Date('2024-01-01T18:00:00'),
    };
    const invalidSchedule = { ...validSchedule, tasks: [invalidTask] };
    const result = ScheduleValidator.validate(invalidSchedule);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field?.includes('tasks[0]'))).toBe(true);
  });
});

describe('BusinessRuleValidator', () => {
  const task1: Task = {
    id: 'task-1',
    channelId: 'channel-1',
    title: 'Task 1',
    contentType: 'video',
    estimatedHours: 4,
    status: 'planned',
    scheduledStart: new Date('2024-01-01T10:00:00'),
    scheduledEnd: new Date('2024-01-01T14:00:00'),
  };

  const task2: Task = {
    id: 'task-2',
    channelId: 'channel-1',
    title: 'Task 2',
    contentType: 'video',
    estimatedHours: 4,
    status: 'planned',
    scheduledStart: new Date('2024-01-01T12:00:00'),
    scheduledEnd: new Date('2024-01-01T16:00:00'),
  };

  describe('checkSchedulingConflicts', () => {
    it('should detect scheduling conflicts', () => {
      const errors = BusinessRuleValidator.checkSchedulingConflicts([task1, task2]);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('scheduling_conflict');
    });

    it('should not detect conflicts for non-overlapping tasks', () => {
      const nonOverlappingTask = {
        ...task2,
        scheduledStart: new Date('2024-01-01T15:00:00'),
        scheduledEnd: new Date('2024-01-01T19:00:00'),
      };
      const errors = BusinessRuleValidator.checkSchedulingConflicts([task1, nonOverlappingTask]);
      expect(errors).toHaveLength(0);
    });
  });

  describe('checkCapacityLimits', () => {
    it('should detect capacity overload', () => {
      const schedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks: [],
        totalScheduledHours: 50,
        userCapacityHours: 40,
        isOverloaded: true,
      };
      const errors = BusinessRuleValidator.checkCapacityLimits(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('capacity_exceeded');
    });

    it('should not detect overload when within capacity', () => {
      const schedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks: [],
        totalScheduledHours: 30,
        userCapacityHours: 40,
        isOverloaded: false,
      };
      const errors = BusinessRuleValidator.checkCapacityLimits(schedule);
      expect(errors).toHaveLength(0);
    });
  });

  describe('checkChannelTaskIntegrity', () => {
    const channels: Channel[] = [{
      id: 'channel-1',
      name: 'Test Channel',
      contentType: 'gaming',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Monday'],
        preferredTimes: ['10:00'],
      },
      color: '#ff0000',
      createdAt: new Date(),
      isActive: true,
    }];

    it('should detect invalid channel references', () => {
      const taskWithInvalidChannel = { ...task1, channelId: 'non-existent' };
      const errors = BusinessRuleValidator.checkChannelTaskIntegrity(channels, [taskWithInvalidChannel]);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('invalid_channel_reference');
    });

    it('should not detect errors for valid channel references', () => {
      const errors = BusinessRuleValidator.checkChannelTaskIntegrity(channels, [task1]);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('DataValidator', () => {
  const validState: Partial<AppState> = {
    channels: [{
      id: 'channel-1',
      name: 'Test Channel',
      contentType: 'gaming',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Monday'],
        preferredTimes: ['10:00'],
      },
      color: '#ff0000',
      createdAt: new Date(),
      isActive: true,
    }],
    templates: [{
      id: 'template-1',
      name: 'Test Template',
      contentType: 'video',
      estimatedHours: {
        planning: 1,
        production: 4,
        editing: 3,
        publishing: 0.5,
      },
      workflowSteps: ['Plan', 'Record'],
      channelIds: ['channel-1'],
    }],
    currentWeek: {
      weekStartDate: new Date('2024-01-01'),
      tasks: [{
        id: 'task-1',
        channelId: 'channel-1',
        templateId: 'template-1',
        title: 'Test Task',
        contentType: 'video',
        estimatedHours: 8,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T10:00:00'),
        scheduledEnd: new Date('2024-01-01T18:00:00'),
      }],
      totalScheduledHours: 8,
      userCapacityHours: 40,
      isOverloaded: false,
    },
  };

  it('should validate valid app state', () => {
    const result = DataValidator.validateAppState(validState);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid channel in state', () => {
    const invalidState = {
      ...validState,
      channels: [{ ...validState.channels![0], id: '' }],
    };
    const result = DataValidator.validateAppState(invalidState);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field?.includes('channels[0]'))).toBe(true);
  });

  it('should detect referential integrity violations', () => {
    const invalidState = {
      ...validState,
      currentWeek: {
        ...validState.currentWeek!,
        tasks: [{
          ...validState.currentWeek!.tasks[0],
          channelId: 'non-existent-channel',
        }],
      },
    };
    const result = DataValidator.validateAppState(invalidState);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'invalid_channel_reference')).toBe(true);
  });
});