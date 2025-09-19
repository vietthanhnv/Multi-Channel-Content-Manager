import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkloadOverview } from '../WorkloadOverview';
import { AppProvider } from '../../context/AppContext';
import { AppState } from '../../types';

// Mock the hooks
vi.mock('../hooks/useWorkloadCalculation', () => ({
  useWorkloadCalculation: () => ({
    workloadMetrics: {
      totalScheduledHours: 35,
      capacityHours: 40,
      utilizationPercentage: 87.5,
      overloadHours: 0,
      isOverloaded: false,
      dailyBreakdown: [
        {
          date: new Date('2024-01-01'),
          dayName: 'Monday',
          scheduledHours: 10,
          tasks: [],
          isOverloaded: true,
        },
        {
          date: new Date('2024-01-02'),
          dayName: 'Tuesday',
          scheduledHours: 6,
          tasks: [],
          isOverloaded: false,
        },
      ],
      channelBreakdown: [
        {
          channelId: 'channel1',
          channelName: 'Gaming Channel',
          scheduledHours: 20,
          taskCount: 3,
          completionRate: 66.7,
        },
        {
          channelId: 'channel2',
          channelName: 'Educational Channel',
          scheduledHours: 15,
          taskCount: 2,
          completionRate: 50,
        },
      ],
    },
    isOverloaded: false,
    hasOverloadedDays: true,
    mostOverloadedDay: {
      date: new Date('2024-01-01'),
      dayName: 'Monday',
      scheduledHours: 10,
      tasks: [],
      isOverloaded: true,
    },
    busiestChannel: {
      channelId: 'channel1',
      channelName: 'Gaming Channel',
      scheduledHours: 20,
      taskCount: 3,
      completionRate: 66.7,
    },
    workloadDistribution: {
      efficiency: 75,
      variance: 4,
    },
  }),
}));

vi.mock('../hooks/useRebalancingSuggestions', () => ({
  useRebalancingSuggestions: () => ({
    needsRebalancing: true,
    quickWins: [
      {
        id: 'quick-1',
        title: 'Quick Task Move',
        impact: { hoursReduced: 4, utilizationImprovement: 10, affectedTasks: 1 },
      },
      {
        id: 'quick-2',
        title: 'Another Quick Win',
        impact: { hoursReduced: 2, utilizationImprovement: 5, affectedTasks: 1 },
      },
    ],
    topSuggestion: {
      id: 'top-suggestion',
      title: 'Redistribute Tasks Across Days',
      impact: {
        hoursReduced: 6,
        utilizationImprovement: 15,
        affectedTasks: 2,
      },
    },
  }),
}));

const mockState: AppState = {
  channels: [],
  templates: [],
  currentWeek: {
    weekStartDate: new Date('2024-01-01'),
    tasks: [],
    totalScheduledHours: 35,
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

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AppProvider initialState={mockState}>
      {component}
    </AppProvider>
  );
};

describe('WorkloadOverview', () => {
  it('should render workload overview with metrics', () => {
    renderWithProvider(<WorkloadOverview />);

    expect(screen.getByText('Workload Overview')).toBeInTheDocument();
    expect(screen.getByText('Weekly Utilization')).toBeInTheDocument();
    expect(screen.getByText('87.5%')).toBeInTheDocument();
    expect(screen.getByText('35.0h / 40h')).toBeInTheDocument();
  });

  it('should display distribution efficiency', () => {
    renderWithProvider(<WorkloadOverview />);

    expect(screen.getByText('Distribution Efficiency')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('Uneven distribution')).toBeInTheDocument();
  });

  it('should show peak day information', () => {
    renderWithProvider(<WorkloadOverview />);

    expect(screen.getByText('Peak Day')).toBeInTheDocument();
    expect(screen.getByText('10.0h')).toBeInTheDocument();
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument(); // Overload indicator
  });

  it('should show busiest channel information', () => {
    renderWithProvider(<WorkloadOverview />);

    expect(screen.getByText('Busiest Channel')).toBeInTheDocument();
    expect(screen.getByText('20.0h')).toBeInTheDocument();
    expect(screen.getByText('Gaming Channel')).toBeInTheDocument();
  });

  it('should display rebalancing suggestions when needed', () => {
    renderWithProvider(<WorkloadOverview />);

    expect(screen.getByText('💡 Rebalancing Available')).toBeInTheDocument();
    expect(screen.getByText('⚡ 2 quick wins')).toBeInTheDocument();
    expect(screen.getByText('Redistribute Tasks Across Days')).toBeInTheDocument();
    expect(screen.getByText('Save 6.0h • 15.0% improvement')).toBeInTheDocument();
  });

  it('should hide suggestions when showSuggestions is false', () => {
    renderWithProvider(<WorkloadOverview showSuggestions={false} />);

    expect(screen.queryByText('💡 Rebalancing Available')).not.toBeInTheDocument();
    expect(screen.queryByText('⚡ 2 quick wins')).not.toBeInTheDocument();
  });

  it('should apply correct utilization color classes', () => {
    renderWithProvider(<WorkloadOverview />);

    const utilizationValue = screen.getByText('87.5%');
    expect(utilizationValue).toHaveClass('utilizationMedium'); // 80-100% range
  });

  it('should apply correct efficiency color classes', () => {
    renderWithProvider(<WorkloadOverview />);

    const efficiencyValue = screen.getByText('75.0%');
    expect(efficiencyValue).toHaveClass('efficiencyMedium'); // 60-80% range
  });

  it('should show utilization bar with correct width', () => {
    renderWithProvider(<WorkloadOverview />);

    const utilizationBar = document.querySelector('.utilizationFill');
    expect(utilizationBar).toHaveStyle({ width: '87.5%' });
  });
});

describe('WorkloadOverview - Overloaded State', () => {
  it('should show overload badge and details when overloaded', () => {
    // Mock overloaded state
    vi.doMock('../hooks/useWorkloadCalculation', () => ({
      useWorkloadCalculation: () => ({
        workloadMetrics: {
          totalScheduledHours: 45,
          capacityHours: 40,
          utilizationPercentage: 112.5,
          overloadHours: 5,
          isOverloaded: true,
          dailyBreakdown: [],
          channelBreakdown: [],
        },
        isOverloaded: true,
        hasOverloadedDays: true,
        mostOverloadedDay: null,
        busiestChannel: null,
        workloadDistribution: { efficiency: 60, variance: 8 },
      }),
    }));

    renderWithProvider(<WorkloadOverview />);

    expect(screen.getByText('⚠️ Overloaded')).toBeInTheDocument();
    expect(screen.getByText('112.5%')).toBeInTheDocument();
    expect(screen.getByText('(+5.0h over)')).toBeInTheDocument();
  });
});

describe('WorkloadOverview - Well Balanced State', () => {
  it('should show well balanced message when no rebalancing needed', () => {
    // Mock well-balanced state
    vi.doMock('../hooks/useWorkloadCalculation', () => ({
      useWorkloadCalculation: () => ({
        workloadMetrics: {
          totalScheduledHours: 30,
          capacityHours: 40,
          utilizationPercentage: 75,
          overloadHours: 0,
          isOverloaded: false,
          dailyBreakdown: [],
          channelBreakdown: [],
        },
        isOverloaded: false,
        hasOverloadedDays: false,
        mostOverloadedDay: null,
        busiestChannel: null,
        workloadDistribution: { efficiency: 85, variance: 2 },
      }),
    }));

    vi.doMock('../hooks/useRebalancingSuggestions', () => ({
      useRebalancingSuggestions: () => ({
        needsRebalancing: false,
        quickWins: [],
        topSuggestion: null,
      }),
    }));

    renderWithProvider(<WorkloadOverview />);

    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('Workload is well balanced')).toBeInTheDocument();
    expect(screen.queryByText('💡 Rebalancing Available')).not.toBeInTheDocument();
  });
});

describe('WorkloadOverview - Custom Props', () => {
  it('should apply custom className', () => {
    const { container } = renderWithProvider(
      <WorkloadOverview className="custom-class" />
    );

    const overviewElement = container.querySelector('.overview');
    expect(overviewElement).toHaveClass('custom-class');
  });

  it('should handle missing peak day gracefully', () => {
    // Mock state without peak day
    vi.doMock('../hooks/useWorkloadCalculation', () => ({
      useWorkloadCalculation: () => ({
        workloadMetrics: {
          totalScheduledHours: 20,
          capacityHours: 40,
          utilizationPercentage: 50,
          overloadHours: 0,
          isOverloaded: false,
          dailyBreakdown: [],
          channelBreakdown: [],
        },
        isOverloaded: false,
        hasOverloadedDays: false,
        mostOverloadedDay: null,
        busiestChannel: null,
        workloadDistribution: { efficiency: 90, variance: 1 },
      }),
    }));

    renderWithProvider(<WorkloadOverview />);

    expect(screen.queryByText('Peak Day')).not.toBeInTheDocument();
  });

  it('should handle missing busiest channel gracefully', () => {
    // Mock state without busiest channel
    vi.doMock('../hooks/useWorkloadCalculation', () => ({
      useWorkloadCalculation: () => ({
        workloadMetrics: {
          totalScheduledHours: 20,
          capacityHours: 40,
          utilizationPercentage: 50,
          overloadHours: 0,
          isOverloaded: false,
          dailyBreakdown: [],
          channelBreakdown: [],
        },
        isOverloaded: false,
        hasOverloadedDays: false,
        mostOverloadedDay: null,
        busiestChannel: null,
        workloadDistribution: { efficiency: 90, variance: 1 },
      }),
    }));

    renderWithProvider(<WorkloadOverview />);

    expect(screen.queryByText('Busiest Channel')).not.toBeInTheDocument();
  });
});