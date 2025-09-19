import { renderHook, act } from '@testing-library/react';
import { useTaskStatus } from '../useTaskStatus';
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

describe('useTaskStatus', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should update task status correctly', () => {
    const tasks = [createMockTask()];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    act(() => {
      result.current.updateTaskStatus('task-1', 'in-progress');
    });

    // The task should be updated in the context
    expect(result.current.tasks.find(t => t.id === 'task-1')?.status).toBe('in-progress');
  });

  it('should calculate channel completion rate correctly', () => {
    const tasks = [
      createMockTask({ id: '1', channelId: 'channel-1', status: 'completed' }),
      createMockTask({ id: '2', channelId: 'channel-1', status: 'planned' }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    const completionRate = result.current.getChannelCompletionRate('channel-1');
    expect(completionRate).toBe(50); // 1 out of 2 tasks completed
  });

  it('should get channel task stats correctly', () => {
    const tasks = [
      createMockTask({ id: '1', channelId: 'channel-1', status: 'planned' }),
      createMockTask({ id: '2', channelId: 'channel-1', status: 'in-progress' }),
      createMockTask({ id: '3', channelId: 'channel-1', status: 'completed' }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    const stats = result.current.getChannelTaskStats('channel-1');
    expect(stats).toEqual({
      total: 3,
      planned: 1,
      inProgress: 1,
      completed: 1,
      overdue: 0,
    });
  });

  it('should group tasks by status correctly', () => {
    const tasks = [
      createMockTask({ id: '1', status: 'planned' }),
      createMockTask({ id: '2', status: 'in-progress' }),
      createMockTask({ id: '3', status: 'completed' }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    const grouped = result.current.getTasksByStatus();
    expect(grouped.planned).toHaveLength(1);
    expect(grouped.inProgress).toHaveLength(1);
    expect(grouped.completed).toHaveLength(1);
    expect(grouped.overdue).toHaveLength(0);
  });

  it('should calculate time accuracy correctly', () => {
    const tasks = [
      createMockTask({ 
        id: '1', 
        status: 'completed', 
        estimatedHours: 4, 
        actualHours: 5 
      }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    const accuracy = result.current.getTimeAccuracy();
    expect(accuracy.totalEstimated).toBe(4);
    expect(accuracy.totalActual).toBe(5);
    expect(accuracy.accuracy).toBe(80); // 4/5 = 80%
  });

  it('should handle task completion with actual hours', () => {
    const tasks = [createMockTask()];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    act(() => {
      result.current.updateTaskStatus('task-1', 'completed', 6);
    });

    const updatedTask = result.current.tasks.find(t => t.id === 'task-1');
    expect(updatedTask?.status).toBe('completed');
    expect(updatedTask?.actualHours).toBe(6);
  });

  it('should automatically check for overdue tasks on mount', () => {
    const pastDate = new Date('2020-01-01T13:00:00');
    const tasks = [
      createMockTask({ 
        id: '1', 
        status: 'planned', 
        scheduledEnd: pastDate 
      }),
    ];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    // The overdue task should be automatically updated
    expect(result.current.tasks.find(t => t.id === '1')?.status).toBe('overdue');
  });

  it('should periodically check for overdue tasks', () => {
    const tasks = [createMockTask()];
    const initialState = createMockState(tasks);
    const wrapper = createWrapper(initialState);

    renderHook(() => useTaskStatus(), { wrapper });

    // Fast-forward time by 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    // The periodic check should have run (we can't easily test the effect,
    // but we can verify the timer was set up)
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });

  it('should warn when trying to update non-existent task', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const initialState = createMockState([]);
    const wrapper = createWrapper(initialState);

    const { result } = renderHook(() => useTaskStatus(), { wrapper });

    act(() => {
      result.current.updateTaskStatus('non-existent', 'completed');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Task with id non-existent not found');
    consoleSpy.mockRestore();
  });
});