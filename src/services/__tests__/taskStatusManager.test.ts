import { TaskStatusManager } from '../taskStatusManager';
import { Task, TaskStatus } from '../../types';

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

describe('TaskStatusManager', () => {
  describe('updateTaskStatus', () => {
    it('should update task status correctly', () => {
      const task = createMockTask();
      const updates = TaskStatusManager.updateTaskStatus(task, 'in-progress');
      
      expect(updates.status).toBe('in-progress');
    });

    it('should set actual hours when completing a task', () => {
      const task = createMockTask();
      const updates = TaskStatusManager.updateTaskStatus(task, 'completed', 5);
      
      expect(updates.status).toBe('completed');
      expect(updates.actualHours).toBe(5);
    });

    it('should use estimated hours if no actual hours provided on completion', () => {
      const task = createMockTask({ estimatedHours: 3 });
      const updates = TaskStatusManager.updateTaskStatus(task, 'completed');
      
      expect(updates.status).toBe('completed');
      expect(updates.actualHours).toBe(3);
    });

    it('should mark task as overdue if past scheduled end date', () => {
      const pastDate = new Date('2020-01-01T13:00:00');
      const task = createMockTask({ scheduledEnd: pastDate });
      const updates = TaskStatusManager.updateTaskStatus(task, 'in-progress');
      
      expect(updates.status).toBe('overdue');
    });
  });

  describe('isTaskOverdue', () => {
    it('should return true for tasks past their scheduled end date', () => {
      const pastDate = new Date('2020-01-01T13:00:00');
      const task = createMockTask({ scheduledEnd: pastDate });
      
      expect(TaskStatusManager.isTaskOverdue(task)).toBe(true);
    });

    it('should return false for tasks within their scheduled time', () => {
      const futureDate = new Date('2030-01-01T13:00:00');
      const task = createMockTask({ scheduledEnd: futureDate });
      
      expect(TaskStatusManager.isTaskOverdue(task)).toBe(false);
    });

    it('should return false for completed tasks even if past due date', () => {
      const pastDate = new Date('2020-01-01T13:00:00');
      const task = createMockTask({ 
        scheduledEnd: pastDate,
        status: 'completed'
      });
      
      expect(TaskStatusManager.isTaskOverdue(task)).toBe(false);
    });
  });

  describe('calculateChannelCompletionRate', () => {
    it('should return 0 for channels with no tasks', () => {
      const tasks: Task[] = [];
      const rate = TaskStatusManager.calculateChannelCompletionRate(tasks, 'channel-1');
      
      expect(rate).toBe(0);
    });

    it('should calculate completion rate correctly', () => {
      const tasks = [
        createMockTask({ id: '1', channelId: 'channel-1', status: 'completed' }),
        createMockTask({ id: '2', channelId: 'channel-1', status: 'completed' }),
        createMockTask({ id: '3', channelId: 'channel-1', status: 'planned' }),
        createMockTask({ id: '4', channelId: 'channel-2', status: 'completed' }),
      ];
      
      const rate = TaskStatusManager.calculateChannelCompletionRate(tasks, 'channel-1');
      expect(rate).toBe(67); // 2 out of 3 tasks completed, rounded
    });
  });

  describe('getChannelTaskStats', () => {
    it('should return correct task statistics', () => {
      const tasks = [
        createMockTask({ id: '1', channelId: 'channel-1', status: 'planned' }),
        createMockTask({ id: '2', channelId: 'channel-1', status: 'in-progress' }),
        createMockTask({ id: '3', channelId: 'channel-1', status: 'completed' }),
        createMockTask({ id: '4', channelId: 'channel-1', status: 'overdue' }),
        createMockTask({ id: '5', channelId: 'channel-2', status: 'completed' }),
      ];
      
      const stats = TaskStatusManager.getChannelTaskStats(tasks, 'channel-1');
      
      expect(stats).toEqual({
        total: 4,
        planned: 1,
        inProgress: 1,
        completed: 1,
        overdue: 1,
      });
    });
  });

  describe('updateOverdueTasks', () => {
    it('should mark overdue tasks correctly', () => {
      const pastDate = new Date('2020-01-01T13:00:00');
      const futureDate = new Date('2030-01-01T13:00:00');
      
      const tasks = [
        createMockTask({ id: '1', status: 'planned', scheduledEnd: pastDate }),
        createMockTask({ id: '2', status: 'in-progress', scheduledEnd: pastDate }),
        createMockTask({ id: '3', status: 'completed', scheduledEnd: pastDate }),
        createMockTask({ id: '4', status: 'planned', scheduledEnd: futureDate }),
      ];
      
      const updatedTasks = TaskStatusManager.updateOverdueTasks(tasks);
      
      expect(updatedTasks[0].status).toBe('overdue');
      expect(updatedTasks[1].status).toBe('overdue');
      expect(updatedTasks[2].status).toBe('completed'); // Should remain completed
      expect(updatedTasks[3].status).toBe('planned'); // Should remain planned
    });
  });

  describe('getTasksByStatus', () => {
    it('should group tasks by status correctly', () => {
      const tasks = [
        createMockTask({ id: '1', status: 'planned' }),
        createMockTask({ id: '2', status: 'in-progress' }),
        createMockTask({ id: '3', status: 'completed' }),
        createMockTask({ id: '4', status: 'overdue' }),
      ];
      
      const grouped = TaskStatusManager.getTasksByStatus(tasks);
      
      expect(grouped.planned).toHaveLength(1);
      expect(grouped.inProgress).toHaveLength(1);
      expect(grouped.completed).toHaveLength(1);
      expect(grouped.overdue).toHaveLength(1);
    });

    it('should filter by channel when provided', () => {
      const tasks = [
        createMockTask({ id: '1', channelId: 'channel-1', status: 'planned' }),
        createMockTask({ id: '2', channelId: 'channel-2', status: 'planned' }),
      ];
      
      const grouped = TaskStatusManager.getTasksByStatus(tasks, 'channel-1');
      
      expect(grouped.planned).toHaveLength(1);
      expect(grouped.planned[0].channelId).toBe('channel-1');
    });
  });

  describe('calculateTimeAccuracy', () => {
    it('should return 100% accuracy when no completed tasks', () => {
      const tasks = [createMockTask({ status: 'planned' })];
      const accuracy = TaskStatusManager.calculateTimeAccuracy(tasks);
      
      expect(accuracy.accuracy).toBe(100);
      expect(accuracy.totalEstimated).toBe(0);
      expect(accuracy.totalActual).toBe(0);
    });

    it('should calculate accuracy correctly', () => {
      const tasks = [
        createMockTask({ 
          id: '1', 
          status: 'completed', 
          estimatedHours: 4, 
          actualHours: 5 
        }),
        createMockTask({ 
          id: '2', 
          status: 'completed', 
          estimatedHours: 6, 
          actualHours: 5 
        }),
      ];
      
      const accuracy = TaskStatusManager.calculateTimeAccuracy(tasks);
      
      expect(accuracy.totalEstimated).toBe(10);
      expect(accuracy.totalActual).toBe(10);
      expect(accuracy.accuracy).toBe(100);
    });

    it('should handle overestimation correctly', () => {
      const tasks = [
        createMockTask({ 
          id: '1', 
          status: 'completed', 
          estimatedHours: 10, 
          actualHours: 5 
        }),
      ];
      
      const accuracy = TaskStatusManager.calculateTimeAccuracy(tasks);
      
      expect(accuracy.accuracy).toBe(50); // 5/10 = 50%
    });
  });
});