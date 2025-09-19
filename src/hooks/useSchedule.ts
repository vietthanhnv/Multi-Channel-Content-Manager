import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Task, WeeklySchedule, TaskStatus } from '../types';

export const useSchedule = () => {
  const { state, dispatch } = useAppContext();

  const addTask = useCallback((task: Task) => {
    dispatch({ type: 'ADD_TASK', payload: task });
  }, [dispatch]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, updates } });
  }, [dispatch]);

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TASK', payload: id });
  }, [dispatch]);

  const setCurrentWeek = useCallback((weekSchedule: WeeklySchedule) => {
    dispatch({ type: 'SET_CURRENT_WEEK', payload: weekSchedule });
  }, [dispatch]);

  const getTaskById = useCallback((id: string) => {
    return state.currentWeek.tasks.find(task => task.id === id);
  }, [state.currentWeek.tasks]);

  const getTasksByChannel = useCallback((channelId: string) => {
    return state.currentWeek.tasks.filter(task => task.channelId === channelId);
  }, [state.currentWeek.tasks]);

  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return state.currentWeek.tasks.filter(task => task.status === status);
  }, [state.currentWeek.tasks]);

  const getTasksForTimeSlot = useCallback((startTime: Date, endTime: Date) => {
    return state.currentWeek.tasks.filter(task => {
      const taskStart = new Date(task.scheduledStart);
      const taskEnd = new Date(task.scheduledEnd);
      
      // Check for overlap
      return taskStart < endTime && taskEnd > startTime;
    });
  }, [state.currentWeek.tasks]);

  const hasSchedulingConflict = useCallback((task: Task, excludeTaskId?: string) => {
    const conflictingTasks = getTasksForTimeSlot(
      new Date(task.scheduledStart),
      new Date(task.scheduledEnd)
    );
    
    return conflictingTasks.some(existingTask => 
      existingTask.id !== excludeTaskId && existingTask.id !== task.id
    );
  }, [getTasksForTimeSlot]);

  const getWeekProgress = useCallback(() => {
    const totalTasks = state.currentWeek.tasks.length;
    const completedTasks = state.currentWeek.tasks.filter(task => task.status === 'completed').length;
    
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  }, [state.currentWeek.tasks]);

  const getChannelProgress = useCallback((channelId: string) => {
    const channelTasks = getTasksByChannel(channelId);
    const completedTasks = channelTasks.filter(task => task.status === 'completed');
    
    return channelTasks.length > 0 ? (completedTasks.length / channelTasks.length) * 100 : 0;
  }, [getTasksByChannel]);

  return {
    currentWeek: state.currentWeek,
    tasks: state.currentWeek.tasks,
    addTask,
    updateTask,
    deleteTask,
    setCurrentWeek,
    getTaskById,
    getTasksByChannel,
    getTasksByStatus,
    getTasksForTimeSlot,
    hasSchedulingConflict,
    getWeekProgress,
    getChannelProgress,
  };
};