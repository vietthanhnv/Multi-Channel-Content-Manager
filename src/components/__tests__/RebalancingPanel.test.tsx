import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RebalancingPanel } from '../RebalancingPanel';
import { AppProvider } from '../../context/AppContext';
import { AppState } from '../../types';

// Mock the hooks
vi.mock('../hooks/useWorkloadCalculation', () => ({
  useWorkloadCalculation: () => ({
    workloadMetrics: {
      totalScheduledHours: 22,
      capacityHours: 40,
      utilizationPercentage: 55,
      overloadHours: 0,
      isOverloaded: false,
      dailyBreakdown: [],
      channelBreakdown: [],
    },
    isOverloaded: false,
  }),
}));

vi.mock('../hooks/useRebalancingSuggestions', () => ({
  useRebalancingSuggestions: () => ({
    suggestions: [
      {
        id: 'suggestion-1',
        type: 'redistribute_daily',
        priority: 'high',
        title: 'Redistribute Tasks Across Days',
        description: 'Move 2 tasks from overloaded days to available time slots',
        impact: {
          hoursReduced: 8,
          utilizationImprovement: 20,
          affectedTasks: 2,
        },
        actions: [
          {
            type: 'move_task',
            taskId: 'task-1',
            taskTitle: 'Gaming Video',
            currentSchedule: {
              start: new Date('2024-01-01T09:00:00'),
              end: new Date('2024-01-01T17:00:00'),
              hours: 8,
            },
            proposedSchedule: {
              start: new Date('2024-01-02T09:00:00'),
              end: new Date('2024-01-02T17:00:00'),
              hours: 8,
            },
            reason: 'Move from overloaded Monday to available Tuesday',
          },
        ],
        estimatedEffort: 'low',
      },
    ],
    needsRebalancing: true,
    topSuggestion: {
      id: 'suggestion-1',
      type: 'redistribute_daily',
      priority: 'high',
      title: 'Redistribute Tasks Across Days',
      description: 'Move 2 tasks from overloaded days to available time slots',
      impact: {
        hoursReduced: 8,
        utilizationImprovement: 20,
        affectedTasks: 2,
      },
      actions: [],
      estimatedEffort: 'low',
    },
    quickWins: [
      {
        id: 'quick-win-1',
        type: 'redistribute_daily',
        priority: 'medium',
        title: 'Quick Task Move',
        description: 'Easy redistribution with high impact',
        impact: {
          hoursReduced: 4,
          utilizationImprovement: 10,
          affectedTasks: 1,
        },
        actions: [],
        estimatedEffort: 'low',
      },
    ],
    applySuggestion: vi.fn().mockResolvedValue({
      success: true,
      summary: 'Applied 1 of 1 suggested changes',
    }),
    totalPotentialImpact: {
      hoursReduced: 8,
      utilizationImprovement: 20,
      affectedTasks: 2,
    },
  }),
}));

const mockState: AppState = {
  channels: [],
  templates: [],
  currentWeek: {
    weekStartDate: new Date('2024-01-01'),
    tasks: [],
    totalScheduledHours: 0,
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

describe('RebalancingPanel', () => {
  it('should render rebalancing suggestions when needed', () => {
    renderWithProvider(<RebalancingPanel />);

    expect(screen.getByText('Rebalancing Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Potential Impact')).toBeInTheDocument();
    expect(screen.getByText('8.0h')).toBeInTheDocument(); // Hours Saved
    expect(screen.getByText('20.0%')).toBeInTheDocument(); // Utilization Improvement
    expect(screen.getByText('2')).toBeInTheDocument(); // Tasks Affected
  });

  it('should display quick wins section', () => {
    renderWithProvider(<RebalancingPanel />);

    expect(screen.getByText('⚡ Quick Wins')).toBeInTheDocument();
    expect(screen.getByText('Low-effort changes with high impact')).toBeInTheDocument();
    expect(screen.getByText('Quick Task Move')).toBeInTheDocument();
  });

  it('should show all suggestions with proper categorization', () => {
    renderWithProvider(<RebalancingPanel />);

    expect(screen.getByText('All Suggestions (1)')).toBeInTheDocument();
    expect(screen.getByText('Redistribute Tasks Across Days')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument(); // Priority badge
    expect(screen.getByText('🟢 low effort')).toBeInTheDocument(); // Effort badge
  });

  it('should display suggestion impact metrics', () => {
    renderWithProvider(<RebalancingPanel />);

    expect(screen.getByText('📉 8.0h saved')).toBeInTheDocument();
    expect(screen.getByText('📊 20.0% improvement')).toBeInTheDocument();
    expect(screen.getByText('📋 2 tasks')).toBeInTheDocument();
  });

  it('should expand suggestion details when clicked', async () => {
    renderWithProvider(<RebalancingPanel />);

    const expandButton = screen.getByText('▶');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Actions:')).toBeInTheDocument();
      expect(screen.getByText('MOVE TASK')).toBeInTheDocument();
      expect(screen.getByText('Gaming Video')).toBeInTheDocument();
      expect(screen.getByText('Move from overloaded Monday to available Tuesday')).toBeInTheDocument();
    });

    // Should show schedule comparison
    expect(screen.getByText('Current:')).toBeInTheDocument();
    expect(screen.getByText('Proposed:')).toBeInTheDocument();
  });

  it('should apply suggestions when apply button is clicked', async () => {
    const { useRebalancingSuggestions } = await import('../hooks/useRebalancingSuggestions');
    const mockApplySuggestion = vi.fn().mockResolvedValue({
      success: true,
      summary: 'Applied 1 of 1 suggested changes',
    });

    vi.mocked(useRebalancingSuggestions).mockReturnValue({
      ...vi.mocked(useRebalancingSuggestions)(),
      applySuggestion: mockApplySuggestion,
    });

    renderWithProvider(<RebalancingPanel />);

    const applyButton = screen.getAllByText('Apply')[0];
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockApplySuggestion).toHaveBeenCalled();
    });
  });

  it('should show applying state when suggestion is being applied', async () => {
    const { useRebalancingSuggestions } = await import('../hooks/useRebalancingSuggestions');
    const mockApplySuggestion = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        success: true,
        summary: 'Applied 1 of 1 suggested changes',
      }), 100))
    );

    vi.mocked(useRebalancingSuggestions).mockReturnValue({
      ...vi.mocked(useRebalancingSuggestions)(),
      applySuggestion: mockApplySuggestion,
    });

    renderWithProvider(<RebalancingPanel />);

    const applyButton = screen.getAllByText('Apply')[0];
    fireEvent.click(applyButton);

    expect(screen.getByText('Applying...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('✅ Applied')).toBeInTheDocument();
    });
  });

  it('should handle quick apply for quick wins', async () => {
    const { useRebalancingSuggestions } = await import('../hooks/useRebalancingSuggestions');
    const mockApplySuggestion = vi.fn().mockResolvedValue({
      success: true,
      summary: 'Applied quick win suggestion',
    });

    vi.mocked(useRebalancingSuggestions).mockReturnValue({
      ...vi.mocked(useRebalancingSuggestions)(),
      applySuggestion: mockApplySuggestion,
    });

    renderWithProvider(<RebalancingPanel />);

    const quickApplyButton = screen.getByText('Quick Apply');
    fireEvent.click(quickApplyButton);

    await waitFor(() => {
      expect(mockApplySuggestion).toHaveBeenCalled();
    });
  });
});

describe('RebalancingPanel - Well Balanced State', () => {
  it('should show well balanced message when no rebalancing needed', () => {
    // Mock well-balanced state
    vi.doMock('../hooks/useRebalancingSuggestions', () => ({
      useRebalancingSuggestions: () => ({
        suggestions: [],
        needsRebalancing: false,
        topSuggestion: null,
        quickWins: [],
        applySuggestion: vi.fn(),
        totalPotentialImpact: {
          hoursReduced: 0,
          utilizationImprovement: 0,
          affectedTasks: 0,
        },
      }),
    }));

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
      }),
    }));

    renderWithProvider(<RebalancingPanel />);

    expect(screen.getByText('Workload Balance')).toBeInTheDocument();
    expect(screen.getByText('✅ Well Balanced')).toBeInTheDocument();
    expect(screen.getByText('Your workload is well distributed. No rebalancing needed at this time.')).toBeInTheDocument();
  });
});