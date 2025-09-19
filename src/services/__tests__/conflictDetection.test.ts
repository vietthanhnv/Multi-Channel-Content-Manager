import { describe, it, expect } from 'vitest';
import { Task } from '../../types';

// Conflict detection utility functions
export class ConflictDetectionEngine {
  /**
   * Check if two tasks have overlapping time slots
   */
  static hasTimeOverlap(task1: Task, task2: Task): boolean {
    const start1 = new Date(task1.scheduledStart);
    const end1 = new Date(task1.scheduledEnd);
    const start2 = new Date(task2.scheduledStart);
    const end2 = new Date(task2.scheduledEnd);

    // Check if tasks overlap
    return start1 < end2 && start2 < end1;
  }

  /**
   * Find all scheduling conflicts in a list of tasks
   */
  static findSchedulingConflicts(tasks: Task[]): Array<{
    task1: Task;
    task2: Task;
    overlapMinutes: number;
  }> {
    const conflicts: Array<{
      task1: Task;
      task2: Task;
      overlapMinutes: number;
    }> = [];

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const task1 = tasks[i];
        const task2 = tasks[j];

        if (this.hasTimeOverlap(task1, task2)) {
          const overlapMinutes = this.calculateOverlapMinutes(task1, task2);
          conflicts.push({ task1, task2, overlapMinutes });
        }
      }
    }

    return conflicts;
  }

  /**
   * Calculate overlap duration in minutes between two tasks
   */
  static calculateOverlapMinutes(task1: Task, task2: Task): number {
    const start1 = new Date(task1.scheduledStart);
    const end1 = new Date(task1.scheduledEnd);
    const start2 = new Date(task2.scheduledStart);
    const end2 = new Date(task2.scheduledEnd);

    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    if (overlapStart >= overlapEnd) {
      return 0;
    }

    return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
  }

  /**
   * Check if a task can be scheduled without conflicts
   */
  static canScheduleTask(newTask: Task, existingTasks: Task[]): boolean {
    return !existingTasks.some(task => 
      task.id !== newTask.id && this.hasTimeOverlap(newTask, task)
    );
  }

  /**
   * Find available time slots for a task of given duration
   */
  static findAvailableTimeSlots(
    duration: number, // in hours
    existingTasks: Task[],
    startDate: Date,
    endDate: Date,
    workingHours: { start: string; end: string }
  ): Array<{ start: Date; end: Date }> {
    const availableSlots: Array<{ start: Date; end: Date }> = [];
    const durationMs = duration * 60 * 60 * 1000;

    // Sort existing tasks by start time
    const sortedTasks = [...existingTasks].sort(
      (a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
    );

    const current = new Date(startDate);
    while (current < endDate) {
      const dayStart = new Date(current);
      const [startHour, startMinute] = workingHours.start.split(':').map(Number);
      dayStart.setHours(startHour, startMinute, 0, 0);

      const dayEnd = new Date(current);
      const [endHour, endMinute] = workingHours.end.split(':').map(Number);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      // Find gaps in this day
      const dayTasks = sortedTasks.filter(task => {
        const taskStart = new Date(task.scheduledStart);
        return taskStart.toDateString() === current.toDateString();
      });

      let slotStart = new Date(dayStart);
      
      for (const task of dayTasks) {
        const taskStart = new Date(task.scheduledStart);
        const taskEnd = new Date(task.scheduledEnd);

        // Check if there's a gap before this task
        if (taskStart.getTime() - slotStart.getTime() >= durationMs) {
          availableSlots.push({
            start: new Date(slotStart),
            end: new Date(Math.min(taskStart.getTime(), slotStart.getTime() + durationMs))
          });
        }

        slotStart = new Date(Math.max(slotStart.getTime(), taskEnd.getTime()));
      }

      // Check if there's a gap at the end of the day
      if (dayEnd.getTime() - slotStart.getTime() >= durationMs) {
        availableSlots.push({
          start: new Date(slotStart),
          end: new Date(Math.min(dayEnd.getTime(), slotStart.getTime() + durationMs))
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return availableSlots;
  }

  /**
   * Suggest alternative time slots for a conflicting task
   */
  static suggestAlternativeSlots(
    conflictingTask: Task,
    existingTasks: Task[],
    workingHours: { start: string; end: string }
  ): Array<{ start: Date; end: Date; reason: string }> {
    const suggestions: Array<{ start: Date; end: Date; reason: string }> = [];
    const taskDuration = conflictingTask.estimatedHours;

    // Try same day, different time
    const taskDate = new Date(conflictingTask.scheduledStart);
    const nextWeek = new Date(taskDate);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const availableSlots = this.findAvailableTimeSlots(
      taskDuration,
      existingTasks.filter(t => t.id !== conflictingTask.id),
      taskDate,
      nextWeek,
      workingHours
    );

    // Prioritize slots on the same day
    const sameDaySlots = availableSlots.filter(slot => 
      slot.start.toDateString() === taskDate.toDateString()
    );

    sameDaySlots.forEach(slot => {
      suggestions.push({
        start: slot.start,
        end: slot.end,
        reason: 'Same day, different time'
      });
    });

    // Add next day slots
    const nextDaySlots = availableSlots.filter(slot => {
      const slotDate = new Date(taskDate);
      slotDate.setDate(slotDate.getDate() + 1);
      return slot.start.toDateString() === slotDate.toDateString();
    });

    nextDaySlots.slice(0, 2).forEach(slot => {
      suggestions.push({
        start: slot.start,
        end: slot.end,
        reason: 'Next day'
      });
    });

    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }
}

describe('ConflictDetectionEngine', () => {
  const createTask = (
    id: string,
    startTime: string,
    endTime: string,
    hours: number = 4
  ): Task => ({
    id,
    channelId: 'channel-1',
    title: `Task ${id}`,
    contentType: 'video',
    estimatedHours: hours,
    status: 'planned',
    scheduledStart: new Date(startTime),
    scheduledEnd: new Date(endTime),
  });

  describe('hasTimeOverlap', () => {
    it('should detect overlapping tasks', () => {
      const task1 = createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00');
      const task2 = createTask('2', '2024-01-01T11:00:00', '2024-01-01T15:00:00');

      expect(ConflictDetectionEngine.hasTimeOverlap(task1, task2)).toBe(true);
    });

    it('should not detect non-overlapping tasks', () => {
      const task1 = createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00');
      const task2 = createTask('2', '2024-01-01T14:00:00', '2024-01-01T18:00:00');

      expect(ConflictDetectionEngine.hasTimeOverlap(task1, task2)).toBe(false);
    });

    it('should handle adjacent tasks correctly', () => {
      const task1 = createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00');
      const task2 = createTask('2', '2024-01-01T13:00:00', '2024-01-01T17:00:00');

      expect(ConflictDetectionEngine.hasTimeOverlap(task1, task2)).toBe(false);
    });

    it('should detect complete overlap', () => {
      const task1 = createTask('1', '2024-01-01T09:00:00', '2024-01-01T17:00:00');
      const task2 = createTask('2', '2024-01-01T11:00:00', '2024-01-01T15:00:00');

      expect(ConflictDetectionEngine.hasTimeOverlap(task1, task2)).toBe(true);
    });
  });

  describe('findSchedulingConflicts', () => {
    it('should find all conflicts in a task list', () => {
      const tasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00'),
        createTask('2', '2024-01-01T11:00:00', '2024-01-01T15:00:00'),
        createTask('3', '2024-01-01T14:00:00', '2024-01-01T18:00:00'),
        createTask('4', '2024-01-02T09:00:00', '2024-01-02T13:00:00'),
      ];

      const conflicts = ConflictDetectionEngine.findSchedulingConflicts(tasks);

      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].task1.id).toBe('1');
      expect(conflicts[0].task2.id).toBe('2');
      expect(conflicts[1].task1.id).toBe('2');
      expect(conflicts[1].task2.id).toBe('3');
    });

    it('should return empty array for non-conflicting tasks', () => {
      const tasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00'),
        createTask('2', '2024-01-01T14:00:00', '2024-01-01T18:00:00'),
        createTask('3', '2024-01-02T09:00:00', '2024-01-02T13:00:00'),
      ];

      const conflicts = ConflictDetectionEngine.findSchedulingConflicts(tasks);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('calculateOverlapMinutes', () => {
    it('should calculate overlap duration correctly', () => {
      const task1 = createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00');
      const task2 = createTask('2', '2024-01-01T11:00:00', '2024-01-01T15:00:00');

      const overlap = ConflictDetectionEngine.calculateOverlapMinutes(task1, task2);

      expect(overlap).toBe(120); // 2 hours = 120 minutes
    });

    it('should return 0 for non-overlapping tasks', () => {
      const task1 = createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00');
      const task2 = createTask('2', '2024-01-01T14:00:00', '2024-01-01T18:00:00');

      const overlap = ConflictDetectionEngine.calculateOverlapMinutes(task1, task2);

      expect(overlap).toBe(0);
    });

    it('should handle partial overlaps', () => {
      const task1 = createTask('1', '2024-01-01T09:00:00', '2024-01-01T12:00:00');
      const task2 = createTask('2', '2024-01-01T11:30:00', '2024-01-01T15:00:00');

      const overlap = ConflictDetectionEngine.calculateOverlapMinutes(task1, task2);

      expect(overlap).toBe(30); // 30 minutes overlap
    });
  });

  describe('canScheduleTask', () => {
    it('should return true for non-conflicting task', () => {
      const existingTasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00'),
        createTask('2', '2024-01-01T14:00:00', '2024-01-01T18:00:00'),
      ];

      const newTask = createTask('3', '2024-01-02T09:00:00', '2024-01-02T13:00:00');

      expect(ConflictDetectionEngine.canScheduleTask(newTask, existingTasks)).toBe(true);
    });

    it('should return false for conflicting task', () => {
      const existingTasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00'),
        createTask('2', '2024-01-01T14:00:00', '2024-01-01T18:00:00'),
      ];

      const newTask = createTask('3', '2024-01-01T11:00:00', '2024-01-01T15:00:00');

      expect(ConflictDetectionEngine.canScheduleTask(newTask, existingTasks)).toBe(false);
    });

    it('should allow updating existing task without self-conflict', () => {
      const existingTasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00'),
        createTask('2', '2024-01-01T14:00:00', '2024-01-01T18:00:00'),
      ];

      const updatedTask = createTask('1', '2024-01-01T10:00:00', '2024-01-01T14:00:00');

      expect(ConflictDetectionEngine.canScheduleTask(updatedTask, existingTasks)).toBe(true);
    });
  });

  describe('findAvailableTimeSlots', () => {
    it('should find available slots in a day', () => {
      const existingTasks = [
        createTask('1', '2024-01-01T10:00:00', '2024-01-01T12:00:00', 2),
        createTask('2', '2024-01-01T14:00:00', '2024-01-01T16:00:00', 2),
      ];

      const workingHours = { start: '09:00', end: '17:00' };
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const slots = ConflictDetectionEngine.findAvailableTimeSlots(
        2, // 2 hours
        existingTasks,
        startDate,
        endDate,
        workingHours
      );

      expect(slots.length).toBeGreaterThan(0);
      
      // Should find slots that don't conflict with existing tasks
      slots.forEach(slot => {
        const duration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60 * 60);
        expect(duration).toBeGreaterThanOrEqual(2);
        
        // Check that slot doesn't overlap with existing tasks
        const hasConflict = existingTasks.some(task => {
          const taskStart = new Date(task.scheduledStart);
          const taskEnd = new Date(task.scheduledEnd);
          return slot.start < taskEnd && slot.end > taskStart;
        });
        expect(hasConflict).toBe(false);
      });
    });

    it('should respect working hours', () => {
      const existingTasks: Task[] = [];
      const workingHours = { start: '09:00', end: '17:00' };
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const slots = ConflictDetectionEngine.findAvailableTimeSlots(
        2,
        existingTasks,
        startDate,
        endDate,
        workingHours
      );

      slots.forEach(slot => {
        expect(slot.start.getHours()).toBeGreaterThanOrEqual(9);
        expect(slot.end.getHours()).toBeLessThanOrEqual(17);
      });
    });

    it('should handle fully booked days', () => {
      const existingTasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T17:00:00', 8),
      ];

      const workingHours = { start: '09:00', end: '17:00' };
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const slots = ConflictDetectionEngine.findAvailableTimeSlots(
        2,
        existingTasks,
        startDate,
        endDate,
        workingHours
      );

      // Should not find any slots on the fully booked day
      const sameDaySlots = slots.filter(slot => 
        slot.start.toDateString() === startDate.toDateString()
      );
      expect(sameDaySlots).toHaveLength(0);
    });
  });

  describe('suggestAlternativeSlots', () => {
    it('should suggest alternative time slots for conflicting task', () => {
      const conflictingTask = createTask('conflict', '2024-01-01T10:00:00', '2024-01-01T14:00:00', 4);
      const existingTasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T13:00:00', 4),
      ];

      const workingHours = { start: '09:00', end: '17:00' };

      const suggestions = ConflictDetectionEngine.suggestAlternativeSlots(
        conflictingTask,
        existingTasks,
        workingHours
      );

      expect(suggestions.length).toBeGreaterThan(0);
      
      // Should include reason for each suggestion
      suggestions.forEach(suggestion => {
        expect(suggestion.reason).toBeDefined();
        expect(typeof suggestion.reason).toBe('string');
      });
    });

    it('should prioritize same-day alternatives', () => {
      const conflictingTask = createTask('conflict', '2024-01-01T10:00:00', '2024-01-01T12:00:00', 2);
      const existingTasks = [
        createTask('1', '2024-01-01T09:00:00', '2024-01-01T11:00:00', 2),
      ];

      const workingHours = { start: '09:00', end: '17:00' };

      const suggestions = ConflictDetectionEngine.suggestAlternativeSlots(
        conflictingTask,
        existingTasks,
        workingHours
      );

      const sameDaySuggestions = suggestions.filter(s => s.reason.includes('Same day'));
      expect(sameDaySuggestions.length).toBeGreaterThan(0);
    });

    it('should limit number of suggestions', () => {
      const conflictingTask = createTask('conflict', '2024-01-01T10:00:00', '2024-01-01T12:00:00', 2);
      const existingTasks: Task[] = [];

      const workingHours = { start: '09:00', end: '17:00' };

      const suggestions = ConflictDetectionEngine.suggestAlternativeSlots(
        conflictingTask,
        existingTasks,
        workingHours
      );

      expect(suggestions.length).toBeLessThanOrEqual(5);
    });
  });
});