import { useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { TaskStatusManager } from '../services/taskStatusManager';
import { Task, TaskStatus } from '../types';

/**
 * Custom hook for managing task status updates and related functionality
 */
export const useTaskStatus = () => {
  const { state, dispatch } = useAppContext();

  /**
   * Updates a task's status with automatic persistence
   */
  const updateTaskStatus = useCallback((
    taskId: string,
    newStatus: TaskStatus,
    actualHours?: number
  ) => {
    const task = state.currentWeek.tasks.find(t => t.id === taskId);
    if (!task) {
      console.warn(`Task with id ${taskId} not found`);
      return;
    }

    const updates = TaskStatusManager.updateTaskStatus(task, newStatus, actualHours);
    
    dispatch({
      type: 'UPDATE_TASK',
      payload: { id: taskId, updates }
    });
  }, [state.currentWeek.tasks, dispatch]);

  /**
   * Gets completion rate for a specific channel
   */
  const getChannelCompletionRate = useCallback((channelId: string): number => {
    return TaskStatusManager.calculateChannelCompletionRate(
      state.currentWeek.tasks,
      channelId
    );
  }, [state.currentWeek.tasks]);

  /**
   * Gets task statistics for a channel
   */
  const getChannelTaskStats = useCallback((channelId: string) => {
    return TaskStatusManager.getChannelTaskStats(
      state.currentWeek.tasks,
      channelId
    );
  }, [state.currentWeek.tasks]);

  /**
   * Gets tasks grouped by status
   */
  const getTasksByStatus = useCallback((channelId?: string) => {
    return TaskStatusManager.getTasksByStatus(
      state.currentWeek.tasks,
      channelId
    );
  }, [state.currentWeek.tasks]);

  /**
   * Gets time estimation accuracy for completed tasks
   */
  const getTimeAccuracy = useCallback((channelId?: string) => {
    return TaskStatusManager.calculateTimeAccuracy(
      state.currentWeek.tasks,
      channelId
    );
  }, [state.currentWeek.tasks]);

  /**
   * Checks and updates overdue tasks automatically
   */
  const updateOverdueTasks = useCallback(() => {
    const updatedTasks = TaskStatusManager.updateOverdueTasks(state.currentWeek.tasks);
    
    // Find tasks that changed to overdue status
    const tasksToUpdate = updatedTasks.filter((updatedTask, index) => {
      const originalTask = state.currentWeek.tasks[index];
      return originalTask.status !== updatedTask.status;
    });

    // Update each changed task
    tasksToUpdate.forEach(task => {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id: task.id, updates: { status: task.status } }
      });
    });
  }, [state.currentWeek.tasks, dispatch]);

  /**
   * Auto-update overdue tasks on component mount and periodically
   */
  useEffect(() => {
    updateOverdueTasks();

    // Set up periodic check for overdue tasks (every 5 minutes)
    const interval = setInterval(updateOverdueTasks, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [updateOverdueTasks]);

  return {
    updateTaskStatus,
    getChannelCompletionRate,
    getChannelTaskStats,
    getTasksByStatus,
    getTimeAccuracy,
    updateOverdueTasks,
    tasks: state.currentWeek.tasks,
  };
};