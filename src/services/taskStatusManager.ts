import { Task, TaskStatus } from '../types';

/**
 * Service for managing task status updates and related business logic
 */
export class TaskStatusManager {
  /**
   * Updates a task's status and handles related side effects
   */
  static updateTaskStatus(
    task: Task,
    newStatus: TaskStatus,
    actualHours?: number
  ): Partial<Task> {
    const updates: Partial<Task> = {
      status: newStatus,
    };

    // Handle completion logic
    if (newStatus === 'completed') {
      updates.actualHours = actualHours || task.estimatedHours;
    }

    // Handle overdue detection
    if (newStatus !== 'completed' && this.isTaskOverdue(task)) {
      updates.status = 'overdue';
    }

    return updates;
  }

  /**
   * Determines if a task is overdue based on current date and scheduled end
   */
  static isTaskOverdue(task: Task): boolean {
    const now = new Date();
    const scheduledEnd = new Date(task.scheduledEnd);
    return now > scheduledEnd && task.status !== 'completed';
  }

  /**
   * Calculates completion rate for a channel based on its tasks
   */
  static calculateChannelCompletionRate(tasks: Task[], channelId: string): number {
    const channelTasks = tasks.filter(task => task.channelId === channelId);
    
    if (channelTasks.length === 0) {
      return 0;
    }

    const completedTasks = channelTasks.filter(task => task.status === 'completed');
    return Math.round((completedTasks.length / channelTasks.length) * 100);
  }

  /**
   * Gets task statistics for a channel
   */
  static getChannelTaskStats(tasks: Task[], channelId: string) {
    const channelTasks = tasks.filter(task => task.channelId === channelId);
    
    const stats = {
      total: channelTasks.length,
      planned: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    };

    channelTasks.forEach(task => {
      switch (task.status) {
        case 'planned':
          stats.planned++;
          break;
        case 'in-progress':
          stats.inProgress++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'overdue':
          stats.overdue++;
          break;
      }
    });

    return stats;
  }

  /**
   * Updates all tasks to check for overdue status
   */
  static updateOverdueTasks(tasks: Task[]): Task[] {
    return tasks.map(task => {
      if (task.status !== 'completed' && this.isTaskOverdue(task)) {
        return { ...task, status: 'overdue' as TaskStatus };
      }
      return task;
    });
  }

  /**
   * Gets tasks grouped by status for a channel
   */
  static getTasksByStatus(tasks: Task[], channelId?: string) {
    const filteredTasks = channelId 
      ? tasks.filter(task => task.channelId === channelId)
      : tasks;

    return {
      planned: filteredTasks.filter(task => task.status === 'planned'),
      inProgress: filteredTasks.filter(task => task.status === 'in-progress'),
      completed: filteredTasks.filter(task => task.status === 'completed'),
      overdue: filteredTasks.filter(task => task.status === 'overdue'),
    };
  }

  /**
   * Calculates total actual hours vs estimated hours for completed tasks
   */
  static calculateTimeAccuracy(tasks: Task[], channelId?: string) {
    const filteredTasks = channelId 
      ? tasks.filter(task => task.channelId === channelId)
      : tasks;

    const completedTasks = filteredTasks.filter(
      task => task.status === 'completed' && task.actualHours !== undefined
    );

    if (completedTasks.length === 0) {
      return { accuracy: 100, totalEstimated: 0, totalActual: 0 };
    }

    const totalEstimated = completedTasks.reduce((sum, task) => sum + task.estimatedHours, 0);
    const totalActual = completedTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);

    const accuracy = totalEstimated > 0 
      ? Math.round((Math.min(totalEstimated, totalActual) / Math.max(totalEstimated, totalActual)) * 100)
      : 100;

    return {
      accuracy,
      totalEstimated,
      totalActual,
    };
  }
}