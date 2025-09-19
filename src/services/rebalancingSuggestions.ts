import { Task, WeeklySchedule, Channel } from '../types';
import { WorkloadCalculationEngine, WorkloadMetrics, DailyWorkload } from './workloadCalculation';

export interface RebalancingSuggestion {
  id: string;
  type: 'redistribute_daily' | 'redistribute_channel' | 'reduce_scope' | 'extend_timeline';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: {
    hoursReduced: number;
    utilizationImprovement: number;
    affectedTasks: number;
  };
  actions: RebalancingAction[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface RebalancingAction {
  type: 'move_task' | 'split_task' | 'reduce_hours' | 'reschedule';
  taskId: string;
  taskTitle: string;
  currentSchedule: {
    start: Date;
    end: Date;
    hours: number;
  };
  proposedSchedule?: {
    start: Date;
    end: Date;
    hours: number;
  };
  reason: string;
}

export interface RebalancingOptions {
  maxDailyHours: number;
  allowTaskSplitting: boolean;
  allowCrossChannelRebalancing: boolean;
  preserveDeadlines: boolean;
  workingDays: string[];
}

export class RebalancingSuggestionEngine {
  /**
   * Generate rebalancing suggestions based on workload metrics
   */
  static generateSuggestions(
    schedule: WeeklySchedule,
    channels: Channel[],
    workloadMetrics: WorkloadMetrics,
    options: RebalancingOptions
  ): RebalancingSuggestion[] {
    const suggestions: RebalancingSuggestion[] = [];

    // Only generate suggestions if there's an overload
    if (!workloadMetrics.isOverloaded && !this.hasOverloadedDays(workloadMetrics, options.workingDays)) {
      return suggestions;
    }

    // Daily redistribution suggestions
    const dailySuggestions = this.generateDailyRedistributionSuggestions(
      schedule,
      workloadMetrics,
      options
    );
    suggestions.push(...dailySuggestions);

    // Channel rebalancing suggestions
    if (options.allowCrossChannelRebalancing) {
      const channelSuggestions = this.generateChannelRebalancingSuggestions(
        schedule,
        channels,
        workloadMetrics,
        options
      );
      suggestions.push(...channelSuggestions);
    }

    // Scope reduction suggestions
    const scopeSuggestions = this.generateScopeReductionSuggestions(
      schedule,
      workloadMetrics,
      options
    );
    suggestions.push(...scopeSuggestions);

    // Timeline extension suggestions
    if (!options.preserveDeadlines) {
      const timelineSuggestions = this.generateTimelineExtensionSuggestions(
        schedule,
        workloadMetrics,
        options
      );
      suggestions.push(...timelineSuggestions);
    }

    // Sort by priority and impact
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.impact.utilizationImprovement - a.impact.utilizationImprovement;
    });
  }

  /**
   * Generate suggestions for redistributing tasks across days
   */
  private static generateDailyRedistributionSuggestions(
    schedule: WeeklySchedule,
    workloadMetrics: WorkloadMetrics,
    options: RebalancingOptions
  ): RebalancingSuggestion[] {
    const suggestions: RebalancingSuggestion[] = [];
    const overloadedDays = workloadMetrics.dailyBreakdown.filter(
      day => day.isOverloaded && options.workingDays.includes(day.dayName)
    );

    if (overloadedDays.length === 0) return suggestions;

    const underutilizedDays = workloadMetrics.dailyBreakdown.filter(
      day => !day.isOverloaded && 
            options.workingDays.includes(day.dayName) && 
            day.scheduledHours < options.maxDailyHours * 0.8
    );

    if (underutilizedDays.length === 0) return suggestions;

    // Find tasks that can be moved
    const movableTasks = this.findMovableTasks(overloadedDays, schedule.tasks);

    if (movableTasks.length === 0) return suggestions;

    const actions: RebalancingAction[] = [];
    let totalHoursReduced = 0;
    let affectedTasks = 0;

    // Create redistribution plan
    for (const task of movableTasks.slice(0, 3)) { // Limit to 3 tasks for simplicity
      const bestTargetDay = this.findBestTargetDay(task, underutilizedDays, options.maxDailyHours);
      
      if (bestTargetDay) {
        const newStart = new Date(bestTargetDay.date);
        newStart.setHours(9, 0, 0, 0); // Default to 9 AM
        const newEnd = new Date(newStart);
        newEnd.setHours(newStart.getHours() + task.estimatedHours);

        actions.push({
          type: 'move_task',
          taskId: task.id,
          taskTitle: task.title,
          currentSchedule: {
            start: new Date(task.scheduledStart),
            end: new Date(task.scheduledEnd),
            hours: task.estimatedHours,
          },
          proposedSchedule: {
            start: newStart,
            end: newEnd,
            hours: task.estimatedHours,
          },
          reason: `Move from overloaded ${this.getDayName(new Date(task.scheduledStart))} to available ${bestTargetDay.dayName}`,
        });

        totalHoursReduced += task.estimatedHours;
        affectedTasks++;
        
        // Update target day capacity for next iteration
        bestTargetDay.scheduledHours += task.estimatedHours;
      }
    }

    if (actions.length > 0) {
      const utilizationImprovement = (totalHoursReduced / schedule.userCapacityHours) * 100;
      
      suggestions.push({
        id: `daily-redistribution-${Date.now()}`,
        type: 'redistribute_daily',
        priority: totalHoursReduced > options.maxDailyHours ? 'high' : 'medium',
        title: 'Redistribute Tasks Across Days',
        description: `Move ${affectedTasks} task(s) from overloaded days to available time slots`,
        impact: {
          hoursReduced: totalHoursReduced,
          utilizationImprovement,
          affectedTasks,
        },
        actions,
        estimatedEffort: affectedTasks > 2 ? 'medium' : 'low',
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions for rebalancing workload across channels
   */
  private static generateChannelRebalancingSuggestions(
    schedule: WeeklySchedule,
    channels: Channel[],
    workloadMetrics: WorkloadMetrics,
    options: RebalancingOptions
  ): RebalancingSuggestion[] {
    const suggestions: RebalancingSuggestion[] = [];
    const channelBreakdown = workloadMetrics.channelBreakdown;

    if (channelBreakdown.length < 2) return suggestions;

    // Find imbalanced channels
    const avgHours = channelBreakdown.reduce((sum, ch) => sum + ch.scheduledHours, 0) / channelBreakdown.length;
    const overloadedChannels = channelBreakdown.filter(ch => ch.scheduledHours > avgHours * 1.5);
    const underutilizedChannels = channelBreakdown.filter(ch => ch.scheduledHours < avgHours * 0.5);

    if (overloadedChannels.length === 0 || underutilizedChannels.length === 0) return suggestions;

    const actions: RebalancingAction[] = [];
    let totalHoursReduced = 0;
    let affectedTasks = 0;

    // Suggest moving some tasks between channels
    for (const overloadedChannel of overloadedChannels.slice(0, 2)) {
      const channelTasks = schedule.tasks.filter(task => 
        task.channelId === overloadedChannel.channelId && 
        (task.status === 'planned' || task.status === 'in-progress')
      );

      const movableTask = channelTasks
        .sort((a, b) => a.estimatedHours - b.estimatedHours)[0]; // Start with smallest task

      if (movableTask && underutilizedChannels.length > 0) {
        const targetChannel = underutilizedChannels[0];
        
        actions.push({
          type: 'reschedule',
          taskId: movableTask.id,
          taskTitle: movableTask.title,
          currentSchedule: {
            start: new Date(movableTask.scheduledStart),
            end: new Date(movableTask.scheduledEnd),
            hours: movableTask.estimatedHours,
          },
          reason: `Consider reassigning from ${overloadedChannel.channelName} to ${targetChannel.channelName} for better balance`,
        });

        totalHoursReduced += movableTask.estimatedHours;
        affectedTasks++;
      }
    }

    if (actions.length > 0) {
      suggestions.push({
        id: `channel-rebalancing-${Date.now()}`,
        type: 'redistribute_channel',
        priority: 'low',
        title: 'Rebalance Workload Across Channels',
        description: `Consider redistributing tasks between channels for more balanced workload`,
        impact: {
          hoursReduced: totalHoursReduced,
          utilizationImprovement: (totalHoursReduced / schedule.userCapacityHours) * 100,
          affectedTasks,
        },
        actions,
        estimatedEffort: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * Generate suggestions for reducing task scope
   */
  private static generateScopeReductionSuggestions(
    schedule: WeeklySchedule,
    workloadMetrics: WorkloadMetrics,
    options: RebalancingOptions
  ): RebalancingSuggestion[] {
    const suggestions: RebalancingSuggestion[] = [];

    if (workloadMetrics.overloadHours < options.maxDailyHours) return suggestions;

    // Find tasks with highest time estimates that could be optimized
    const optimizableTasks = schedule.tasks
      .filter(task => 
        (task.status === 'planned' || task.status === 'in-progress') &&
        task.estimatedHours >= 4 // Only suggest for tasks >= 4 hours
      )
      .sort((a, b) => b.estimatedHours - a.estimatedHours)
      .slice(0, 3);

    if (optimizableTasks.length === 0) return suggestions;

    const actions: RebalancingAction[] = optimizableTasks.map(task => ({
      type: 'reduce_hours',
      taskId: task.id,
      taskTitle: task.title,
      currentSchedule: {
        start: new Date(task.scheduledStart),
        end: new Date(task.scheduledEnd),
        hours: task.estimatedHours,
      },
      proposedSchedule: {
        start: new Date(task.scheduledStart),
        end: new Date(task.scheduledEnd),
        hours: Math.max(2, task.estimatedHours * 0.8), // Reduce by 20%, minimum 2 hours
      },
      reason: `Consider optimizing workflow or reducing scope to save time`,
    }));

    const totalHoursReduced = actions.reduce((sum, action) => 
      sum + (action.currentSchedule.hours - (action.proposedSchedule?.hours || 0)), 0
    );

    suggestions.push({
      id: `scope-reduction-${Date.now()}`,
      type: 'reduce_scope',
      priority: workloadMetrics.overloadHours > options.maxDailyHours * 2 ? 'high' : 'medium',
      title: 'Optimize Task Scope',
      description: `Consider reducing scope or optimizing workflow for ${actions.length} high-effort task(s)`,
      impact: {
        hoursReduced: totalHoursReduced,
        utilizationImprovement: (totalHoursReduced / schedule.userCapacityHours) * 100,
        affectedTasks: actions.length,
      },
      actions,
      estimatedEffort: 'high',
    });

    return suggestions;
  }

  /**
   * Generate suggestions for extending timeline
   */
  private static generateTimelineExtensionSuggestions(
    schedule: WeeklySchedule,
    workloadMetrics: WorkloadMetrics,
    options: RebalancingOptions
  ): RebalancingSuggestion[] {
    const suggestions: RebalancingSuggestion[] = [];

    if (workloadMetrics.overloadHours < options.maxDailyHours) return suggestions;

    // Find tasks that could be moved to next week
    const deferableTasks = schedule.tasks
      .filter(task => 
        (task.status === 'planned' || task.status === 'in-progress') &&
        new Date(task.scheduledEnd) > new Date() // Future tasks only
      )
      .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime())
      .slice(0, 2);

    if (deferableTasks.length === 0) return suggestions;

    const actions: RebalancingAction[] = deferableTasks.map(task => {
      const newStart = new Date(task.scheduledStart);
      newStart.setDate(newStart.getDate() + 7); // Move to next week
      const newEnd = new Date(task.scheduledEnd);
      newEnd.setDate(newEnd.getDate() + 7);

      return {
        type: 'reschedule',
        taskId: task.id,
        taskTitle: task.title,
        currentSchedule: {
          start: new Date(task.scheduledStart),
          end: new Date(task.scheduledEnd),
          hours: task.estimatedHours,
        },
        proposedSchedule: {
          start: newStart,
          end: newEnd,
          hours: task.estimatedHours,
        },
        reason: 'Move to next week to reduce current week overload',
      };
    });

    const totalHoursReduced = actions.reduce((sum, action) => sum + action.currentSchedule.hours, 0);

    suggestions.push({
      id: `timeline-extension-${Date.now()}`,
      type: 'extend_timeline',
      priority: 'medium',
      title: 'Extend Timeline',
      description: `Consider moving ${actions.length} task(s) to next week to reduce overload`,
      impact: {
        hoursReduced: totalHoursReduced,
        utilizationImprovement: (totalHoursReduced / schedule.userCapacityHours) * 100,
        affectedTasks: actions.length,
      },
      actions,
      estimatedEffort: 'low',
    });

    return suggestions;
  }

  /**
   * Apply a rebalancing suggestion to the schedule
   */
  static applySuggestion(
    suggestion: RebalancingSuggestion,
    schedule: WeeklySchedule
  ): { updatedTasks: Task[]; summary: string } {
    const updatedTasks = [...schedule.tasks];
    let appliedActions = 0;

    for (const action of suggestion.actions) {
      const taskIndex = updatedTasks.findIndex(task => task.id === action.taskId);
      
      if (taskIndex === -1) continue;

      const task = updatedTasks[taskIndex];

      switch (action.type) {
        case 'move_task':
        case 'reschedule':
          if (action.proposedSchedule) {
            updatedTasks[taskIndex] = {
              ...task,
              scheduledStart: action.proposedSchedule.start,
              scheduledEnd: action.proposedSchedule.end,
            };
            appliedActions++;
          }
          break;

        case 'reduce_hours':
          if (action.proposedSchedule) {
            const newEnd = new Date(task.scheduledStart);
            newEnd.setHours(newEnd.getHours() + action.proposedSchedule.hours);
            
            updatedTasks[taskIndex] = {
              ...task,
              estimatedHours: action.proposedSchedule.hours,
              scheduledEnd: newEnd,
            };
            appliedActions++;
          }
          break;

        case 'split_task':
          // Implementation for task splitting would go here
          // This is more complex and might require creating new tasks
          break;
      }
    }

    const summary = `Applied ${appliedActions} of ${suggestion.actions.length} suggested changes. ${suggestion.title} completed.`;

    return { updatedTasks, summary };
  }

  // Helper methods
  private static hasOverloadedDays(workloadMetrics: WorkloadMetrics, workingDays: string[]): boolean {
    return workloadMetrics.dailyBreakdown.some(
      day => day.isOverloaded && workingDays.includes(day.dayName)
    );
  }

  private static findMovableTasks(overloadedDays: DailyWorkload[], allTasks: Task[]): Task[] {
    const movableTasks: Task[] = [];

    for (const day of overloadedDays) {
      const dayTasks = day.tasks.filter(task => 
        task.status === 'planned' || task.status === 'in-progress'
      );
      
      // Prefer smaller tasks for easier redistribution
      const sortedTasks = dayTasks.sort((a, b) => a.estimatedHours - b.estimatedHours);
      movableTasks.push(...sortedTasks.slice(0, 2)); // Max 2 tasks per overloaded day
    }

    return movableTasks;
  }

  private static findBestTargetDay(
    task: Task, 
    availableDays: DailyWorkload[], 
    maxDailyHours: number
  ): DailyWorkload | null {
    return availableDays
      .filter(day => day.scheduledHours + task.estimatedHours <= maxDailyHours)
      .sort((a, b) => a.scheduledHours - b.scheduledHours)[0] || null;
  }

  private static getDayName(date: Date): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[date.getDay()];
  }
}