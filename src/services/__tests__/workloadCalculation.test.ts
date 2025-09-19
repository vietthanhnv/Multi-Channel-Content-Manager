import { describe, it, expect } from 'vitest';
import { WorkloadCalculationEngine } from '../workloadCalculation';
import { Task, WeeklySchedule, Channel } from '../../types';

describe('WorkloadCalculationEngine', () => {
  const mockChannels: Channel[] = [
    {
      id: 'channel1',
      name: 'Gaming Channel',
      contentType: 'gaming',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Monday'],
        preferredTimes: ['10:00'],
      },
      color: '#ff0000',
      createdAt: new Date('2024-01-01'),
      isActive: true,
    },
    {
      id: 'channel2',
      name: 'Educational Channel',
      contentType: 'educational',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Wednesday'],
        preferredTimes: ['14:00'],
      },
      color: '#00ff00',
      createdAt: new Date('2024-01-01'),
      isActive: true,
    },
  ];

  const mockTasks: Task[] = [
    {
      id: 'task1',
      channelId: 'channel1',
      title: 'Gaming Video 1',
      contentType: 'video',
      estimatedHours: 8,
      status: 'planned',
      scheduledStart: new Date('2024-01-01T09:00:00'),
      scheduledEnd: new Date('2024-01-01T17:00:00'),
    },
    {
      id: 'task2',
      channelId: 'channel2',
      title: 'Educational Video 1',
      contentType: 'video',
      estimatedHours: 6,
      status: 'in-progress',
      scheduledStart: new Date('2024-01-02T10:00:00'),
      scheduledEnd: new Date('2024-01-02T16:00:00'),
    },
    {
      id: 'task3',
      channelId: 'channel1',
      title: 'Gaming Video 2',
      contentType: 'video',
      estimatedHours: 4,
      status: 'completed',
      scheduledStart: new Date('2024-01-03T09:00:00'),
      scheduledEnd: new Date('2024-01-03T13:00:00'),
    },
  ];

  const mockSchedule: WeeklySchedule = {
    weekStartDate: new Date('2024-01-01'),
    tasks: mockTasks,
    totalScheduledHours: 14,
    userCapacityHours: 40,
    isOverloaded: false,
  };

  describe('calculateTotalScheduledHours', () => {
    it('should calculate total hours for planned and in-progress tasks only', () => {
      const result = WorkloadCalculationEngine.calculateTotalScheduledHours(mockTasks);
      expect(result).toBe(14); // 8 + 6, excluding completed task
    });

    it('should return 0 for empty task list', () => {
      const result = WorkloadCalculationEngine.calculateTotalScheduledHours([]);
      expect(result).toBe(0);
    });

    it('should exclude completed and overdue tasks', () => {
      const tasksWithOverdue: Task[] = [
        ...mockTasks,
        {
          id: 'task4',
          channelId: 'channel1',
          title: 'Overdue Task',
          contentType: 'video',
          estimatedHours: 5,
          status: 'overdue',
          scheduledStart: new Date('2024-01-04T09:00:00'),
          scheduledEnd: new Date('2024-01-04T14:00:00'),
        },
      ];

      const result = WorkloadCalculationEngine.calculateTotalScheduledHours(tasksWithOverdue);
      expect(result).toBe(14); // Still 8 + 6, excluding completed and overdue
    });
  });

  describe('calculateWorkloadMetrics', () => {
    it('should calculate comprehensive workload metrics', () => {
      const result = WorkloadCalculationEngine.calculateWorkloadMetrics(
        mockSchedule,
        mockChannels,
        8
      );

      expect(result.totalScheduledHours).toBe(14);
      expect(result.capacityHours).toBe(40);
      expect(result.utilizationPercentage).toBe(35);
      expect(result.overloadHours).toBe(0);
      expect(result.isOverloaded).toBe(false);
      expect(result.dailyBreakdown).toHaveLength(7);
      expect(result.channelBreakdown).toHaveLength(2);
    });

    it('should detect overload condition', () => {
      const overloadedSchedule: WeeklySchedule = {
        ...mockSchedule,
        userCapacityHours: 10,
      };

      const result = WorkloadCalculationEngine.calculateWorkloadMetrics(
        overloadedSchedule,
        mockChannels,
        8
      );

      expect(result.isOverloaded).toBe(true);
      expect(result.overloadHours).toBe(4);
      expect(result.utilizationPercentage).toBe(140);
    });
  });

  describe('calculateDailyBreakdown', () => {
    it('should create daily breakdown for a week', () => {
      const result = WorkloadCalculationEngine.calculateDailyBreakdown(
        mockTasks,
        new Date('2024-01-01'),
        8
      );

      expect(result).toHaveLength(7);
      expect(result[0].dayName).toBe('Monday');
      expect(result[0].scheduledHours).toBe(8); // task1
      expect(result[1].scheduledHours).toBe(6); // task2
      expect(result[2].scheduledHours).toBe(0); // task3 is completed, not counted
    });

    it('should detect daily overload', () => {
      const overloadTasks: Task[] = [
        {
          id: 'overload-task',
          channelId: 'channel1',
          title: 'Overload Task',
          contentType: 'video',
          estimatedHours: 12,
          status: 'planned',
          scheduledStart: new Date('2024-01-01T09:00:00'),
          scheduledEnd: new Date('2024-01-01T21:00:00'),
        },
      ];

      const result = WorkloadCalculationEngine.calculateDailyBreakdown(
        overloadTasks,
        new Date('2024-01-01'),
        8
      );

      expect(result[0].isOverloaded).toBe(true);
      expect(result[0].scheduledHours).toBe(12);
    });
  });

  describe('calculateChannelBreakdown', () => {
    it('should calculate workload breakdown by channel', () => {
      const result = WorkloadCalculationEngine.calculateChannelBreakdown(
        mockTasks,
        mockChannels
      );

      expect(result).toHaveLength(2);
      
      const gamingChannel = result.find(c => c.channelId === 'channel1');
      const educationalChannel = result.find(c => c.channelId === 'channel2');

      expect(gamingChannel?.scheduledHours).toBe(8); // Only planned task
      expect(gamingChannel?.taskCount).toBe(2); // Both planned and completed
      expect(gamingChannel?.completionRate).toBe(50); // 1 of 2 completed

      expect(educationalChannel?.scheduledHours).toBe(6);
      expect(educationalChannel?.taskCount).toBe(1);
      expect(educationalChannel?.completionRate).toBe(0); // 0 of 1 completed
    });

    it('should handle channels with no tasks', () => {
      const result = WorkloadCalculationEngine.calculateChannelBreakdown(
        [],
        mockChannels
      );

      expect(result).toHaveLength(2);
      result.forEach(channel => {
        expect(channel.scheduledHours).toBe(0);
        expect(channel.taskCount).toBe(0);
        expect(channel.completionRate).toBe(0);
      });
    });
  });

  describe('detectOverloadWarnings', () => {
    it('should detect weekly overload warning', () => {
      const overloadedMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        { ...mockSchedule, userCapacityHours: 10 },
        mockChannels,
        8
      );

      const warnings = WorkloadCalculationEngine.detectOverloadWarnings(overloadedMetrics);
      
      const weeklyWarning = warnings.find(w => w.type === 'weekly');
      expect(weeklyWarning).toBeDefined();
      expect(weeklyWarning?.severity).toBe('medium');
      expect(weeklyWarning?.message).toContain('exceeds capacity');
    });

    it('should detect daily overload warnings', () => {
      const overloadTasks: Task[] = [
        {
          id: 'overload-task',
          channelId: 'channel1',
          title: 'Overload Task',
          contentType: 'video',
          estimatedHours: 12,
          status: 'planned',
          scheduledStart: new Date('2024-01-01T09:00:00'),
          scheduledEnd: new Date('2024-01-01T21:00:00'),
        },
      ];

      const overloadSchedule: WeeklySchedule = {
        ...mockSchedule,
        tasks: overloadTasks,
      };

      const metrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        overloadSchedule,
        mockChannels,
        8
      );

      const warnings = WorkloadCalculationEngine.detectOverloadWarnings(
        metrics,
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      );

      const dailyWarning = warnings.find(w => w.type === 'daily');
      expect(dailyWarning).toBeDefined();
      expect(dailyWarning?.message).toContain('Monday is overloaded');
    });

    it('should detect channel imbalance warnings', () => {
      const imbalancedTasks: Task[] = [
        {
          id: 'task1',
          channelId: 'channel1',
          title: 'Heavy Task 1',
          contentType: 'video',
          estimatedHours: 20,
          status: 'planned',
          scheduledStart: new Date('2024-01-01T09:00:00'),
          scheduledEnd: new Date('2024-01-01T17:00:00'),
        },
        {
          id: 'task2',
          channelId: 'channel2',
          title: 'Light Task',
          contentType: 'video',
          estimatedHours: 2,
          status: 'planned',
          scheduledStart: new Date('2024-01-02T10:00:00'),
          scheduledEnd: new Date('2024-01-02T12:00:00'),
        },
      ];

      const imbalancedSchedule: WeeklySchedule = {
        ...mockSchedule,
        tasks: imbalancedTasks,
      };

      const metrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        imbalancedSchedule,
        mockChannels,
        8
      );

      const warnings = WorkloadCalculationEngine.detectOverloadWarnings(metrics);
      
      const channelWarning = warnings.find(w => w.type === 'channel');
      expect(channelWarning).toBeDefined();
      expect(channelWarning?.message).toContain('disproportionately high workload');
    });
  });

  describe('calculateDailyCapacity', () => {
    it('should calculate daily capacity based on working days', () => {
      const result = WorkloadCalculationEngine.calculateDailyCapacity(
        40,
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      );
      expect(result).toBe(8);
    });

    it('should handle empty working days', () => {
      const result = WorkloadCalculationEngine.calculateDailyCapacity(40, []);
      expect(result).toBe(8); // Default fallback
    });
  });

  describe('getWorkloadTrend', () => {
    it('should detect increasing trend', () => {
      const currentMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        mockSchedule,
        mockChannels,
        8
      );

      const previousMetrics = {
        ...currentMetrics,
        utilizationPercentage: 25,
      };

      const trend = WorkloadCalculationEngine.getWorkloadTrend(
        currentMetrics,
        previousMetrics
      );

      expect(trend.trend).toBe('increasing');
      expect(trend.change).toBe(10);
      expect(trend.message).toContain('increasing by 10.0%');
    });

    it('should detect stable trend', () => {
      const currentMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        mockSchedule,
        mockChannels,
        8
      );

      const previousMetrics = {
        ...currentMetrics,
        utilizationPercentage: 37, // Within 5% threshold
      };

      const trend = WorkloadCalculationEngine.getWorkloadTrend(
        currentMetrics,
        previousMetrics
      );

      expect(trend.trend).toBe('stable');
      expect(Math.abs(trend.change)).toBeLessThan(5);
    });

    it('should handle missing previous data', () => {
      const currentMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        mockSchedule,
        mockChannels,
        8
      );

      const trend = WorkloadCalculationEngine.getWorkloadTrend(currentMetrics);

      expect(trend.trend).toBe('stable');
      expect(trend.change).toBe(0);
      expect(trend.message).toContain('No previous data');
    });
  });
});