import { render, screen } from '@testing-library/react';
import { WorkloadChart } from '../WorkloadChart';
import { AppProvider } from '../../context/AppContext';
import { AppState, Task } from '../../types';
import { ReactNode } from 'react';

// Mock task data
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  channelId: 'channel-1',
  title: 'Test Task',
  contentType: 'video',
  estimatedHours: 4,
  status: 'planned',
  scheduledStart: new Date('2024-01-01T09:00:00'),
  scheduledEnd: new Date('2024-01-01T13:00:00'),
  ...overrides,
});

const createMockState = (tasks: Task[] = [], userCapacityHours: number = 40): AppState => ({
  channels: [],
  templates: [],
  currentWeek: {
    weekStartDate: new Date('2024-01-01'),
    tasks,
    totalScheduledHours: tasks.reduce((sum, task) => sum + task.estimatedHours, 0),
    userCapacityHours,
    isOverloaded: tasks.reduce((sum, task) => sum + task.estimatedHours, 0) > userCapacityHours,
  },
  selectedChannelId: undefined,
  userSettings: {
    weeklyCapacityHours: userCapacityHours,
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

describe('WorkloadChart', () => {
  it('should render workload chart with scheduled and capacity hours', () => {
    const tasks = [
      createMockTask({ estimatedHours: 10 }),
      createMockTask({ estimatedHours: 15 }),
    ];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText('Weekly Workload')).toBeInTheDocument();
    expect(screen.getByText('25.0h')).toBeInTheDocument(); // Total scheduled
    expect(screen.getByText('40h')).toBeInTheDocument(); // Capacity
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
  });

  it('should show healthy status when within capacity', () => {
    const tasks = [createMockTask({ estimatedHours: 20 })];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('should show warning status when near capacity', () => {
    const tasks = [createMockTask({ estimatedHours: 38 })];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText('critical')).toBeInTheDocument(); // 95% capacity
  });

  it('should show overloaded status and overload hours when exceeding capacity', () => {
    const tasks = [
      createMockTask({ estimatedHours: 30 }),
      createMockTask({ estimatedHours: 20 }),
    ];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText('overloaded')).toBeInTheDocument();
    expect(screen.getByText('+10.0h')).toBeInTheDocument(); // Overload hours
    expect(screen.getByText('Overload')).toBeInTheDocument();
  });

  it('should display time estimation accuracy', () => {
    const tasks = [
      createMockTask({ 
        status: 'completed', 
        estimatedHours: 10, 
        actualHours: 12 
      }),
    ];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText('Time Estimation Accuracy:')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument(); // 10/12 = 83%
  });

  it('should show estimated vs actual hours comparison', () => {
    const tasks = [
      createMockTask({ 
        status: 'completed', 
        estimatedHours: 8, 
        actualHours: 10 
      }),
      createMockTask({ 
        status: 'completed', 
        estimatedHours: 6, 
        actualHours: 5 
      }),
    ];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText(/Estimated: 14h/)).toBeInTheDocument();
    expect(screen.getByText(/Actual: 15h/)).toBeInTheDocument();
  });

  it('should hide legend when showLegend is false', () => {
    const tasks = [createMockTask({ estimatedHours: 20 })];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart showLegend={false} />, { wrapper });

    expect(screen.queryByText('Scheduled Hours')).not.toBeInTheDocument();
    expect(screen.queryByText('Available Capacity')).not.toBeInTheDocument();
  });

  it('should handle zero scheduled hours', () => {
    const initialState = createMockState([], 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText('0.0h')).toBeInTheDocument(); // Scheduled hours
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('should show overload in legend when overloaded', () => {
    const tasks = [createMockTask({ estimatedHours: 50 })];
    const initialState = createMockState(tasks, 40);
    const wrapper = createWrapper(initialState);

    render(<WorkloadChart />, { wrapper });

    expect(screen.getByText('Overload')).toBeInTheDocument();
  });
});