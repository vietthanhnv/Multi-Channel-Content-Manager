import { render, screen } from '@testing-library/react';
import { ChannelProgressBar } from '../ChannelProgressBar';
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

const createMockState = (tasks: Task[] = []): AppState => ({
  channels: [
    {
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
    },
  ],
  templates: [],
  currentWeek: {
    weekStartDate: new Date('2024-01-01'),
    tasks,
    totalScheduledHours: tasks.reduce((sum, task) => sum + task.estimatedHours, 0),
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

describe('ChannelProgressBar', () => {
  it('should render channel name and progress', () => {
    const tasks = [
      createMockTask({ id: '1', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '2', channelId: 'channel-1', status: 'planned' }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    render(
      <ChannelProgressBar
        channelId="channel-1"
        channelName="Test Channel"
        channelColor="#ff0000"
      />,
      { wrapper }
    );

    expect(screen.getByText('Test Channel')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 1 out of 2 tasks completed
  });

  it('should show correct health status for different completion rates', () => {
    const tasks = [
      createMockTask({ id: '1', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '2', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '3', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '4', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '5', channelId: 'channel-1', status: 'planned' }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    render(
      <ChannelProgressBar
        channelId="channel-1"
        channelName="Test Channel"
        channelColor="#ff0000"
      />,
      { wrapper }
    );

    expect(screen.getByText('excellent')).toBeInTheDocument(); // 80% completion
  });

  it('should show critical status when tasks are overdue', () => {
    const pastDate = new Date('2020-01-01T13:00:00');
    const tasks = [
      createMockTask({ 
        id: '1', 
        channelId: 'channel-1', 
        status: 'overdue',
        scheduledEnd: pastDate 
      }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    render(
      <ChannelProgressBar
        channelId="channel-1"
        channelName="Test Channel"
        channelColor="#ff0000"
      />,
      { wrapper }
    );

    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('should show detailed stats when showDetails is true', () => {
    const tasks = [
      createMockTask({ id: '1', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '2', channelId: 'channel-1', status: 'in-progress' }),
      createMockTask({ id: '3', channelId: 'channel-1', status: 'planned' }),
      createMockTask({ id: '4', channelId: 'channel-1', status: 'overdue' }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    render(
      <ChannelProgressBar
        channelId="channel-1"
        channelName="Test Channel"
        channelColor="#ff0000"
        showDetails={true}
      />,
      { wrapper }
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    
    // Check the numbers
    expect(screen.getByText('1')).toBeInTheDocument(); // completed count
  });

  it('should not show overdue section when no overdue tasks', () => {
    const tasks = [
      createMockTask({ id: '1', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '2', channelId: 'channel-1', status: 'planned' }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    render(
      <ChannelProgressBar
        channelId="channel-1"
        channelName="Test Channel"
        channelColor="#ff0000"
        showDetails={true}
      />,
      { wrapper }
    );

    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('should handle channels with no tasks', () => {
    const initialState = createMockState([]);
    const wrapper = createWrapper(initialState);

    render(
      <ChannelProgressBar
        channelId="channel-1"
        channelName="Test Channel"
        channelColor="#ff0000"
      />,
      { wrapper }
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('good')).toBeInTheDocument(); // Default status for no tasks
  });
});