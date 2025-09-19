import { describe, it, expect } from 'vitest';
import { RebalancingSuggestionEngine } from '../rebalancingSuggestions';
import { Task, WeeklySchedule, Channel } from '../../types';
import { WorkloadCalculationEngine } from '../workloadCalculation';

describe('RebalancingSuggestionEngine', () => {
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

  const createOverloadedSchedule = (): WeeklySchedule => ({
    weekStartDate: new Date('2024-01-01'), // Monday
    tasks: [
      {
        id: 'task1',
        channelId: 'channel1',
        title: 'Heavy Gaming Video',
        contentType: 'video',
        estimatedHours: 12,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T09:00:00'), // Monday
        scheduledEnd: new Date('2024-01-01T21:00:00'),
      },
      {
        id: 'task2',
        channelId: 'channel1',
        title: 'Gaming Short',
        contentType: 'short',
        estimatedHours: 4,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T22:00:00'), // Monday
        scheduledEnd: new Date('2024-01-02T02:00:00'),
      },
      {
        id: 'task3',
        channelId: 'channel2',
        title: 'Educational Video',
        contentType: 'video',
        estimatedHours: 6,
        status: 'planned',
        scheduledStart: new Date('2024-01-02T09:00:00'), // Tuesday
        scheduledEnd: new Date('2024-01-02T15:00:00'),
      },
    ],
    totalScheduledHours: 22,
    userCapacityHours: 40,
    isOverloaded: false,
  });

  const defaultOptions = {
    maxDailyHours: 8,
    allowTaskSplitting: false,
    allowCrossChannelRebalancing: true,
    preserveDeadlines: true,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  };

  describe('generateSuggestions', () => {
    it('should return empty array for well-balanced schedule', () => {
      const balancedSchedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks: [
          {
            id: 'task1',
            channelId: 'channel1',
            title: 'Light Task',
            contentType: 'video',
            estimatedHours: 4,
            status: 'planned',
            scheduledStart: new Date('2024-01-01T09:00:00'),
            scheduledEnd: new Date('2024-01-01T13:00:00'),
          },
        ],
        totalScheduledHours: 4,
        userCapacityHours: 40,
        isOverloaded: false,
      };

      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        balancedSchedule,
        mockChannels,
        8
      );

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        balancedSchedule,
        mockChannels,
        workloadMetrics,
        defaultOptions
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should generate daily redistribution suggestions for overloaded days', () => {
      const schedule = createOverloadedSchedule();
      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        mockChannels,
        8
      );

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        schedule,
        mockChannels,
        workloadMetrics,
        defaultOptions
      );

      const dailySuggestions = suggestions.filter(s => s.type === 'redistribute_daily');
      expect(dailySuggestions.length).toBeGreaterThan(0);

      const dailySuggestion = dailySuggestions[0];
      expect(dailySuggestion.title).toContain('Redistribute Tasks');
      expect(dailySuggestion.actions.length).toBeGreaterThan(0);
      expect(dailySuggestion.impact.hoursReduced).toBeGreaterThan(0);
    });

    it('should generate scope reduction suggestions for high-effort tasks', () => {
      const schedule = createOverloadedSchedule();
      // Make it more overloaded to trigger scope reduction
      schedule.userCapacityHours = 15;
      schedule.isOverloaded = true;

      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        mockChannels,
        8
      );

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        schedule,
        mockChannels,
        workloadMetrics,
        defaultOptions
      );

      const scopeSuggestions = suggestions.filter(s => s.type === 'reduce_scope');
      expect(scopeSuggestions.length).toBeGreaterThan(0);

      const scopeSuggestion = scopeSuggestions[0];
      expect(scopeSuggestion.title).toContain('Optimize Task Scope');
      expect(scopeSuggestion.actions.some(a => a.type === 'reduce_hours')).toBe(true);
    });

    it('should generate channel rebalancing suggestions when enabled', () => {
      const imbalancedSchedule: WeeklySchedule = {
        weekStartDate: new Date('2024-01-01'),
        tasks: [
          {
            id: 'task1',
            channelId: 'channel1',
            title: 'Heavy Task 1',
            contentType: 'video',
            estimatedHours: 15,
            status: 'planned',
            scheduledStart: new Date('2024-01-01T09:00:00'),
            scheduledEnd: new Date('2024-01-02T00:00:00'),
          },
          {
            id: 'task2',
            channelId: 'channel1',
            title: 'Heavy Task 2',
            contentType: 'video',
            estimatedHours: 10,
            status: 'planned',
            scheduledStart: new Date('2024-01-02T09:00:00'),
            scheduledEnd: new Date('2024-01-02T19:00:00'),
          },
          {
            id: 'task3',
            channelId: 'channel2',
            title: 'Light Task',
            contentType: 'video',
            estimatedHours: 2,
            status: 'planned',
            scheduledStart: new Date('2024-01-03T09:00:00'),
            scheduledEnd: new Date('2024-01-03T11:00:00'),
          },
        ],
        totalScheduledHours: 27,
        userCapacityHours: 40,
        isOverloaded: false,
      };

      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        imbalancedSchedule,
        mockChannels,
        8
      );

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        imbalancedSchedule,
        mockChannels,
        workloadMetrics,
        defaultOptions
      );

      const channelSuggestions = suggestions.filter(s => s.type === 'redistribute_channel');
      expect(channelSuggestions.length).toBeGreaterThan(0);

      const channelSuggestion = channelSuggestions[0];
      expect(channelSuggestion.title).toContain('Rebalance Workload Across Channels');
    });

    it('should generate timeline extension suggestions when deadlines are flexible', () => {
      const schedule = createOverloadedSchedule();
      schedule.userCapacityHours = 15; // Make it overloaded
      schedule.isOverloaded = true;

      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        mockChannels,
        8
      );

      const flexibleOptions = {
        ...defaultOptions,
        preserveDeadlines: false,
      };

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        schedule,
        mockChannels,
        workloadMetrics,
        flexibleOptions
      );

      const timelineSuggestions = suggestions.filter(s => s.type === 'extend_timeline');
      expect(timelineSuggestions.length).toBeGreaterThan(0);

      const timelineSuggestion = timelineSuggestions[0];
      expect(timelineSuggestion.title).toContain('Extend Timeline');
      expect(timelineSuggestion.actions.some(a => a.type === 'reschedule')).toBe(true);
    });

    it('should sort suggestions by priority and impact', () => {
      const schedule = createOverloadedSchedule();
      schedule.userCapacityHours = 10; // Heavily overloaded
      schedule.isOverloaded = true;

      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        mockChannels,
        8
      );

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        schedule,
        mockChannels,
        workloadMetrics,
        { ...defaultOptions, preserveDeadlines: false }
      );

      expect(suggestions.length).toBeGreaterThan(1);

      // Check that high priority suggestions come first
      const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
      if (highPrioritySuggestions.length > 0) {
        expect(suggestions[0].priority).toBe('high');
      }

      // Check that suggestions are sorted by impact within same priority
      for (let i = 0; i < suggestions.length - 1; i++) {
        const current = suggestions[i];
        const next = suggestions[i + 1];
        
        if (current.priority === next.priority) {
          expect(current.impact.utilizationImprovement)
            .toBeGreaterThanOrEqual(next.impact.utilizationImprovement);
        }
      }
    });

    it('should respect cross-channel rebalancing option', () => {
      const schedule = createOverloadedSchedule();
      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        mockChannels,
        8
      );

      const noChannelRebalancingOptions = {
        ...defaultOptions,
        allowCrossChannelRebalancing: false,
      };

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        schedule,
        mockChannels,
        workloadMetrics,
        noChannelRebalancingOptions
      );

      const channelSuggestions = suggestions.filter(s => s.type === 'redistribute_channel');
      expect(channelSuggestions).toHaveLength(0);
    });

    it('should not generate timeline extension when preserving deadlines', () => {
      const schedule = createOverloadedSchedule();
      schedule.userCapacityHours = 15;
      schedule.isOverloaded = true;

      const workloadMetrics = WorkloadCalculationEngine.calculateWorkloadMetrics(
        schedule,
        mockChannels,
        8
      );

      const strictOptions = {
        ...defaultOptions,
        preserveDeadlines: true,
      };

      const suggestions = RebalancingSuggestionEngine.generateSuggestions(
        schedule,
        mockChannels,
        workloadMetrics,
        strictOptions
      );

      const timelineSuggestions = suggestions.filter(s => s.type === 'extend_timeline');
      expect(timelineSuggestions).toHaveLength(0);
    });
  });

  describe('applySuggestion', () => {
    it('should apply move_task actions correctly', () => {
      const schedule = createOverloadedSchedule();
      const suggestion = {
        id: 'test-suggestion',
        type: 'redistribute_daily' as const,
        priority: 'medium' as const,
        title: 'Test Suggestion',
        description: 'Test description',
        impact: { hoursReduced: 4, utilizationImprovement: 10, affectedTasks: 1 },
        actions: [
          {
            type: 'move_task' as const,
            taskId: 'task2',
            taskTitle: 'Gaming Short',
            currentSchedule: {
              start: new Date('2024-01-01T22:00:00'),
              end: new Date('2024-01-02T02:00:00'),
              hours: 4,
            },
            proposedSchedule: {
              start: new Date('2024-01-03T09:00:00'),
              end: new Date('2024-01-03T13:00:00'),
              hours: 4,
            },
            reason: 'Move to less busy day',
          },
        ],
        estimatedEffort: 'low' as const,
      };

      const result = RebalancingSuggestionEngine.applySuggestion(suggestion, schedule);

      expect(result.updatedTasks).toHaveLength(3);
      
      const movedTask = result.updatedTasks.find(t => t.id === 'task2');
      expect(movedTask?.scheduledStart).toEqual(new Date('2024-01-03T09:00:00'));
      expect(movedTask?.scheduledEnd).toEqual(new Date('2024-01-03T13:00:00'));
      
      expect(result.summary).toContain('Applied 1 of 1');
    });

    it('should apply reduce_hours actions correctly', () => {
      const schedule = createOverloadedSchedule();
      const suggestion = {
        id: 'test-suggestion',
        type: 'reduce_scope' as const,
        priority: 'high' as const,
        title: 'Reduce Scope',
        description: 'Optimize workflow',
        impact: { hoursReduced: 2, utilizationImprovement: 5, affectedTasks: 1 },
        actions: [
          {
            type: 'reduce_hours' as const,
            taskId: 'task1',
            taskTitle: 'Heavy Gaming Video',
            currentSchedule: {
              start: new Date('2024-01-01T09:00:00'),
              end: new Date('2024-01-01T21:00:00'),
              hours: 12,
            },
            proposedSchedule: {
              start: new Date('2024-01-01T09:00:00'),
              end: new Date('2024-01-01T19:00:00'),
              hours: 10,
            },
            reason: 'Optimize workflow',
          },
        ],
        estimatedEffort: 'medium' as const,
      };

      const result = RebalancingSuggestionEngine.applySuggestion(suggestion, schedule);

      const optimizedTask = result.updatedTasks.find(t => t.id === 'task1');
      expect(optimizedTask?.estimatedHours).toBe(10);
      expect(optimizedTask?.scheduledEnd.getHours()).toBe(19); // 9 AM + 10 hours
    });

    it('should handle non-existent task IDs gracefully', () => {
      const schedule = createOverloadedSchedule();
      const suggestion = {
        id: 'test-suggestion',
        type: 'redistribute_daily' as const,
        priority: 'medium' as const,
        title: 'Test Suggestion',
        description: 'Test description',
        impact: { hoursReduced: 4, utilizationImprovement: 10, affectedTasks: 1 },
        actions: [
          {
            type: 'move_task' as const,
            taskId: 'non-existent-task',
            taskTitle: 'Non-existent Task',
            currentSchedule: {
              start: new Date('2024-01-01T09:00:00'),
              end: new Date('2024-01-01T13:00:00'),
              hours: 4,
            },
            proposedSchedule: {
              start: new Date('2024-01-02T09:00:00'),
              end: new Date('2024-01-02T13:00:00'),
              hours: 4,
            },
            reason: 'Test move',
          },
        ],
        estimatedEffort: 'low' as const,
      };

      const result = RebalancingSuggestionEngine.applySuggestion(suggestion, schedule);

      expect(result.updatedTasks).toHaveLength(3); // Original tasks unchanged
      expect(result.summary).toContain('Applied 0 of 1');
    });
  });
});