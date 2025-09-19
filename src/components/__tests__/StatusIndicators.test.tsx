import { render, screen } from '@testing-library/react';
import { StatusIndicators } from '../StatusIndicators';
import { AppProvider } from '../../context/AppContext';
import { AppState, Task, Channel } from '../../types';
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

const createMockChannel = (overrides: Partial<Channel> = {}): Channel => ({
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
  ...overrides,
});

const createMockState = (
  tasks: Task[] = [], 
  channels: Channel[] = [],
  userCapacityHours: number = 40
): AppState => ({
  channels,
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

describe('StatusIndicators', () => {
  beforeEach(() => {
    // Mock Date.now() to have consistent timestamps in tests
    jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('12:00:00 PM');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render system health indicators', () => {
    const channels = [
      createMockChannel({ id: '1', isActive: true }),
      createMockChannel({ id: '2', isActive: true }),
    ];
    const tasks = [
      createMockTask({ id: '1', status: 'completed' }),
      createMockTask({ id: '2', status: 'in-progress' }),
      createMockTask({ id: '3', status: 'planned' }),
    ];
    const initialState = createMockState(tasks, channels);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Active Channels')).toBeInTheDocument();
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText('Workload')).toBeInTheDocument();
  });

  it('should show correct channel count', () => {
    const channels = [
      createMockChannel({ id: '1', isActive: true }),
      createMockChannel({ id: '2', isActive: false }),
      createMockChannel({ id: '3', isActive: true }),
    ];
    const initialState = createMockState([], channels);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('2')).toBeInTheDocument(); // Active channels
    expect(screen.getByText('/3')).toBeInTheDocument(); // Total channels
  });

  it('should show correct task statistics', () => {
    const tasks = [
      createMockTask({ id: '1', status: 'completed' }),
      createMockTask({ id: '2', status: 'completed' }),
      createMockTask({ id: '3', status: 'in-progress' }),
      createMockTask({ id: '4', status: 'planned' }),
      createMockTask({ id: '5', status: 'overdue' }),
    ];
    const initialState = createMockState(tasks, []);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    // Find the completed tasks indicator
    const completedSection = screen.getByText('Completed').closest('.indicator');
    expect(completedSection).toHaveTextContent('2');

    // Find the in progress tasks indicator
    const inProgressSection = screen.getByText('In Progress').closest('.indicator');
    expect(inProgressSection).toHaveTextContent('1');

    // Find the overdue tasks indicator
    const overdueSection = screen.getByText('Overdue').closest('.indicator');
    expect(overdueSection).toHaveTextContent('1');
  });

  it('should show workload information correctly', () => {
    const tasks = [
      createMockTask({ estimatedHours: 15 }),
      createMockTask({ estimatedHours: 10 }),
    ];
    const initialState = createMockState(tasks, [], 40);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('25.0h')).toBeInTheDocument(); // Total scheduled hours
    expect(screen.getByText('Within capacity')).toBeInTheDocument();
  });

  it('should show overload information when exceeding capacity', () => {
    const tasks = [
      createMockTask({ estimatedHours: 30 }),
      createMockTask({ estimatedHours: 20 }),
    ];
    const initialState = createMockState(tasks, [], 40);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('50.0h')).toBeInTheDocument(); // Total scheduled hours
    expect(screen.getByText('+10.0h over')).toBeInTheDocument(); // Overload amount
  });

  it('should calculate overall status correctly - excellent', () => {
    const channels = [createMockChannel({ isActive: true })];
    const tasks = [
      createMockTask({ id: '1', status: 'completed' }),
      createMockTask({ id: '2', status: 'completed' }),
      createMockTask({ id: '3', status: 'completed' }),
      createMockTask({ id: '4', status: 'completed' }),
      createMockTask({ id: '5', status: 'planned' }),
    ];
    const initialState = createMockState(tasks, channels, 40);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('EXCELLENT')).toBeInTheDocument();
  });

  it('should calculate overall status correctly - critical', () => {
    const channels = [createMockChannel({ isActive: true })];
    const tasks = [
      createMockTask({ id: '1', status: 'overdue' }),
      createMockTask({ id: '2', status: 'overdue' }),
      createMockTask({ id: '3', estimatedHours: 50 }), // This will cause overload
    ];
    const initialState = createMockState(tasks, channels, 40);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('should show timestamp', () => {
    const initialState = createMockState([], []);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('Last updated: 12:00:00 PM')).toBeInTheDocument();
  });

  it('should handle vertical layout', () => {
    const initialState = createMockState([], []);
    const wrapper = createWrapper(initialState);

    const { container } = render(<StatusIndicators layout="vertical" />, { wrapper });

    expect(container.querySelector('.vertical')).toBeInTheDocument();
  });

  it('should handle empty state correctly', () => {
    const initialState = createMockState([], []);
    const wrapper = createWrapper(initialState);

    render(<StatusIndicators />, { wrapper });

    expect(screen.getByText('0')).toBeInTheDocument(); // No active channels
    expect(screen.getByText('0.0h')).toBeInTheDocument(); // No scheduled hours
  });
});