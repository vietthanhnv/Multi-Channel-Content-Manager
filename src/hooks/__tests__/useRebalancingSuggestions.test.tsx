import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRebalancingSuggestions } from '../useRebalancingSuggestions';
import { AppProvider } from '../../context/AppContext';
import { AppState } from '../../types';
import { ReactNode } from 'react';

const createOverloadedState = (): AppState => ({
  channels: [
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
  ],
  templates: [],
  currentWeek: {
    weekStartDate: new Date('2024-01-01'),
    tasks: [
      {
        id: 'task1',
        channelId: 'channel1',
        title: 'Heavy Gaming Video',
        contentType: 'video',
        estimatedHours: 12,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T09:00:00'),
        scheduledEnd: new Date('2024-01-01T21:00:00'),
      },
      {
        id: 'task2',
        channelId: 'channel1',
        title: 'Gaming Short',
        contentType: 'short',
        estimatedHours: 4,
        status: 'planned',
        scheduledStart: new Date('2024-01-01T22:00:00'),
        scheduledEnd: new Date('2024-01-02T02:00:00'),
      },
      {
        id: 'task3',
        channelId: 'channel2',
        title: 'Educational Video',
        contentType: 'video',
        estimatedHours: 6,
        status: 'planned',
        scheduledStart: new Date('2024-01-02T09:00:00'),
        scheduledEnd: new Date('2024-01-02T15:00:00'),
      },
    ],
    totalScheduledHours: 22,
    userCapacityHours: 40,
    isOverloaded: false,
  },
  selectedChannelId: undefined,
  userSettings: {
    weeklyCapacityHours: 40,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: { start: '09:00', end: '17:00' },
  },
  ui: {
    activeView: 'dashboard',
    isLoading: false,
    errors: [],
  },
});

const createWrapper = (initialState: AppState) => {
  return ({ children }: { children: ReactNode }) => (
    <AppProvider initialState={initialState}>
      {children}
    </AppProvider>
  );
};

describe('useRebalancingSuggestions', () => {
  it('should return empty suggestions for well-balanced workload', () => {
    const balancedState: AppState = {
      ...createOverloadedState(),
      currentWeek: {
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
      },
    };

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(balancedState),
    });

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.needsRebalancing).toBe(false);
    expect(result.current.topSuggestion).toBeNull();
    expect(result.current.quickWins).toHaveLength(0);
  });

  it('should generate suggestions for overloaded schedule', () => {
    const overloadedState = createOverloadedState();
    // Make it actually overloaded by reducing capacity
    overloadedState.userSettings.weeklyCapacityHours = 15;
    overloadedState.currentWeek.userCapacityHours = 15;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    expect(result.current.suggestions.length).toBeGreaterThan(0);
    expect(result.current.needsRebalancing).toBe(true);
    expect(result.current.topSuggestion).not.toBeNull();
  });

  it('should categorize suggestions by priority', () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 10; // Heavily overloaded
    overloadedState.currentWeek.userCapacityHours = 10;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    const allSuggestions = result.current.suggestions;
    const highPriority = result.current.highPrioritySuggestions;
    const mediumPriority = result.current.mediumPrioritySuggestions;
    const lowPriority = result.current.lowPrioritySuggestions;

    expect(highPriority.length + mediumPriority.length + lowPriority.length)
      .toBe(allSuggestions.length);

    highPriority.forEach(s => expect(s.priority).toBe('high'));
    mediumPriority.forEach(s => expect(s.priority).toBe('medium'));
    lowPriority.forEach(s => expect(s.priority).toBe('low'));
  });

  it('should categorize suggestions by type', () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 10;
    overloadedState.currentWeek.userCapacityHours = 10;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    const dailyRedistribution = result.current.dailyRedistributionSuggestions;
    const channelRebalancing = result.current.channelRebalancingSuggestions;
    const scopeReduction = result.current.scopeReductionSuggestions;

    dailyRedistribution.forEach(s => expect(s.type).toBe('redistribute_daily'));
    channelRebalancing.forEach(s => expect(s.type).toBe('redistribute_channel'));
    scopeReduction.forEach(s => expect(s.type).toBe('reduce_scope'));
  });

  it('should calculate total potential impact', () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 15;
    overloadedState.currentWeek.userCapacityHours = 15;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    const { totalPotentialImpact } = result.current;

    if (result.current.suggestions.length > 0) {
      expect(totalPotentialImpact.hoursReduced).toBeGreaterThan(0);
      expect(totalPotentialImpact.utilizationImprovement).toBeGreaterThan(0);
      expect(totalPotentialImpact.affectedTasks).toBeGreaterThan(0);

      // Verify it's the sum of all suggestions
      const expectedHours = result.current.suggestions.reduce(
        (sum, s) => sum + s.impact.hoursReduced, 0
      );
      expect(totalPotentialImpact.hoursReduced).toBeCloseTo(expectedHours, 1);
    }
  });

  it('should identify quick wins', () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 15;
    overloadedState.currentWeek.userCapacityHours = 15;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    const { quickWins } = result.current;

    quickWins.forEach(suggestion => {
      expect(suggestion.estimatedEffort).toBe('low');
      expect(suggestion.impact.utilizationImprovement).toBeGreaterThanOrEqual(5);
    });
  });

  it('should apply suggestions correctly', async () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 15;
    overloadedState.currentWeek.userCapacityHours = 15;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    if (result.current.suggestions.length > 0) {
      const suggestion = result.current.suggestions[0];

      await act(async () => {
        const applyResult = await result.current.applySuggestion(suggestion);
        expect(applyResult.success).toBe(true);
        expect(applyResult.summary).toContain('Applied');
      });
    }
  });

  it('should apply multiple suggestions', async () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 10;
    overloadedState.currentWeek.userCapacityHours = 10;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    if (result.current.suggestions.length >= 2) {
      const suggestionIds = result.current.suggestions.slice(0, 2).map(s => s.id);

      await act(async () => {
        const applyResult = await result.current.applyMultipleSuggestions(suggestionIds);
        expect(applyResult.appliedCount).toBeGreaterThan(0);
        expect(applyResult.summaries.length).toBeGreaterThan(0);
      });
    }
  });

  it('should handle custom rebalancing options', () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 15;
    overloadedState.currentWeek.userCapacityHours = 15;
    overloadedState.currentWeek.isOverloaded = true;

    const customOptions = {
      maxDailyHours: 6,
      allowCrossChannelRebalancing: false,
      preserveDeadlines: false,
    };

    const { result } = renderHook(() => useRebalancingSuggestions(customOptions), {
      wrapper: createWrapper(overloadedState),
    });

    expect(result.current.rebalancingOptions.maxDailyHours).toBe(6);
    expect(result.current.rebalancingOptions.allowCrossChannelRebalancing).toBe(false);
    expect(result.current.rebalancingOptions.preserveDeadlines).toBe(false);

    // Should not have channel rebalancing suggestions
    expect(result.current.channelRebalancingSuggestions).toHaveLength(0);
  });

  it('should provide utility functions', () => {
    const overloadedState = createOverloadedState();
    overloadedState.userSettings.weeklyCapacityHours = 15;
    overloadedState.currentWeek.userCapacityHours = 15;
    overloadedState.currentWeek.isOverloaded = true;

    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    if (result.current.suggestions.length > 0) {
      const suggestion = result.current.suggestions[0];

      // Test getSuggestionById
      const foundSuggestion = result.current.getSuggestionById(suggestion.id);
      expect(foundSuggestion).toEqual(suggestion);

      // Test getSuggestionsByType
      const typeSuggestions = result.current.getSuggestionsByType(suggestion.type);
      expect(typeSuggestions).toContain(suggestion);

      // Test getSuggestionsByPriority
      const prioritySuggestions = result.current.getSuggestionsByPriority(suggestion.priority);
      expect(prioritySuggestions).toContain(suggestion);

      // Test getSuggestionsByEffort
      const effortSuggestions = result.current.getSuggestionsByEffort(suggestion.estimatedEffort);
      expect(effortSuggestions).toContain(suggestion);
    }
  });

  it('should handle error in applySuggestion gracefully', async () => {
    const overloadedState = createOverloadedState();
    
    const { result } = renderHook(() => useRebalancingSuggestions(), {
      wrapper: createWrapper(overloadedState),
    });

    // Create an invalid suggestion
    const invalidSuggestion = {
      id: 'invalid',
      type: 'redistribute_daily' as const,
      priority: 'medium' as const,
      title: 'Invalid Suggestion',
      description: 'This will fail',
      impact: { hoursReduced: 0, utilizationImprovement: 0, affectedTasks: 0 },
      actions: [
        {
          type: 'move_task' as const,
          taskId: 'non-existent',
          taskTitle: 'Non-existent Task',
          currentSchedule: {
            start: new Date(),
            end: new Date(),
            hours: 0,
          },
          reason: 'Test',
        },
      ],
      estimatedEffort: 'low' as const,
    };

    await act(async () => {
      const result_apply = await result.current.applySuggestion(invalidSuggestion);
      expect(result_apply.success).toBe(true); // Should still succeed with 0 applied actions
      expect(result_apply.summary).toContain('Applied 0 of 1');
    });
  });
});