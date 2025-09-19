import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWorkloadCalculation } from '../useWorkloadCalculation';
import { AppProvider } from '../../context/AppContext';
import { AppState } from '../../types';
import { ReactNode } from 'react';

const mockState: AppState = {
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
    ],
    totalScheduledHours: 14,
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
};

const createWrapper = (initialState: AppState) => {
  return ({ children }: { children: ReactNode }) => (
    <AppProvider initialState={initialState}>
      {children}
    </AppProvider>
  );
};

describe('useWorkloadCalculation', () => {
  it('should calculate workload metrics correctly', () => {
    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(mockState),
    });

    expect(result.current.workloadMetrics.totalScheduledHours).toBe(14);
    expect(result.current.workloadMetrics.capacityHours).toBe(40);
    expect(result.current.workloadMetrics.utilizationPercentage).toBe(35);
    expect(result.current.workloadMetrics.isOverloaded).toBe(false);
    expect(result.current.workloadMetrics.overloadHours).toBe(0);
  });

  it('should detect overload condition', () => {
    const overloadedState: AppState = {
      ...mockState,
      userSettings: {
        ...mockState.userSettings,
        weeklyCapacityHours: 10,
      },
    };

    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(overloadedState),
    });

    expect(result.current.isOverloaded).toBe(true);
    expect(result.current.workloadMetrics.overloadHours).toBe(4);
    expect(result.current.workloadMetrics.utilizationPercentage).toBe(140);
  });

  it('should provide daily breakdown', () => {
    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(mockState),
    });

    const dailyBreakdown = result.current.workloadMetrics.dailyBreakdown;
    expect(dailyBreakdown).toHaveLength(7);
    
    // Monday should have 8 hours (task1)
    const monday = dailyBreakdown.find(day => day.dayName === 'Monday');
    expect(monday?.scheduledHours).toBe(8);
    
    // Tuesday should have 6 hours (task2)
    const tuesday = dailyBreakdown.find(day => day.dayName === 'Tuesday');
    expect(tuesday?.scheduledHours).toBe(6);
    
    // Wednesday should have 0 hours (task3 is completed)
    const wednesday = dailyBreakdown.find(day => day.dayName === 'Wednesday');
    expect(wednesday?.scheduledHours).toBe(0);
  });

  it('should provide channel breakdown', () => {
    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(mockState),
    });

    const channelBreakdown = result.current.workloadMetrics.channelBreakdown;
    expect(channelBreakdown).toHaveLength(2);
    
    const gamingChannel = channelBreakdown.find(c => c.channelId === 'channel1');
    const educationalChannel = channelBreakdown.find(c => c.channelId === 'channel2');

    expect(gamingChannel?.scheduledHours).toBe(8); // Only planned task
    expect(gamingChannel?.taskCount).toBe(2); // Both planned and completed
    expect(gamingChannel?.completionRate).toBe(50); // 1 of 2 completed

    expect(educationalChannel?.scheduledHours).toBe(6);
    expect(educationalChannel?.taskCount).toBe(1);
    expect(educationalChannel?.completionRate).toBe(0); // 0 of 1 completed
  });

  it('should detect overload warnings', () => {
    const overloadedState: AppState = {
      ...mockState,
      userSettings: {
        ...mockState.userSettings,
        weeklyCapacityHours: 10,
      },
    };

    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(overloadedState),
    });

    expect(result.current.overloadWarnings.length).toBeGreaterThan(0);
    expect(result.current.hasCriticalWarnings).toBe(true);
    
    const weeklyWarning = result.current.overloadWarnings.find(w => w.type === 'weekly');
    expect(weeklyWarning).toBeDefined();
    expect(weeklyWarning?.severity).toBe('medium');
  });

  it('should detect overloaded days', () => {
    const overloadedDayState: AppState = {
      ...mockState,
      currentWeek: {
        ...mockState.currentWeek,
        tasks: [
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
        ],
      },
    };

    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(overloadedDayState),
    });

    expect(result.current.hasOverloadedDays).toBe(true);
    expect(result.current.mostOverloadedDay?.scheduledHours).toBe(12);
    expect(result.current.mostOverloadedDay?.dayName).toBe('Monday');
  });

  it('should identify busiest channel', () => {
    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(mockState),
    });

    expect(result.current.busiestChannel?.channelId).toBe('channel1');
    expect(result.current.busiestChannel?.scheduledHours).toBe(8);
  });

  it('should calculate workload distribution efficiency', () => {
    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(mockState),
    });

    expect(result.current.workloadDistribution.efficiency).toBeGreaterThan(0);
    expect(result.current.workloadDistribution.variance).toBeGreaterThanOrEqual(0);
  });

  it('should provide utility functions', () => {
    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(mockState),
    });

    // Test getChannelWorkload
    const channelWorkload = result.current.getChannelWorkload('channel1');
    expect(channelWorkload?.channelId).toBe('channel1');
    expect(channelWorkload?.scheduledHours).toBe(8);

    // Test getDayWorkload
    const dayWorkload = result.current.getDayWorkload(new Date('2024-01-01'));
    expect(dayWorkload?.scheduledHours).toBe(8);

    // Test getWarningsByType
    const overloadedState: AppState = {
      ...mockState,
      userSettings: {
        ...mockState.userSettings,
        weeklyCapacityHours: 10,
      },
    };

    const { result: overloadedResult } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(overloadedState),
    });

    const weeklyWarnings = overloadedResult.current.getWarningsByType('weekly');
    expect(weeklyWarnings.length).toBeGreaterThan(0);

    const mediumWarnings = overloadedResult.current.getWarningsBySeverity('medium');
    expect(mediumWarnings.length).toBeGreaterThan(0);
  });

  it('should handle empty state gracefully', () => {
    const emptyState: AppState = {
      ...mockState,
      channels: [],
      currentWeek: {
        ...mockState.currentWeek,
        tasks: [],
      },
    };

    const { result } = renderHook(() => useWorkloadCalculation(), {
      wrapper: createWrapper(emptyState),
    });

    expect(result.current.workloadMetrics.totalScheduledHours).toBe(0);
    expect(result.current.workloadMetrics.channelBreakdown).toHaveLength(0);
    expect(result.current.overloadWarnings).toHaveLength(0);
    expect(result.current.busiestChannel).toBeNull();
  });
});