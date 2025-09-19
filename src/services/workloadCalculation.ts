import { Task, WeeklySchedule, Channel } from '../types';

export interface WorkloadMetrics {
  totalScheduledHours: number;
  capacityHours: number;
  utilizationPercentage: number;
  overloadHours: number;
  isOverloaded: boolean;
  dailyBreakdown: DailyWorkload[];
  channelBreakdown: ChannelWorkload[];
}

export interface DailyWorkload {
  date: Date;
  dayName: string;
  scheduledHours: number;
  tasks: Task[];
  isOverloaded: boolean;
}

export interface ChannelWorkload {
  channelId: string;
  channelName: string;
  scheduledHours: number;
  taskCount: number;
  completionRate: number;
}

export interface OverloadWarning {
  type: 'daily' | 'weekly' | 'channel';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedDate?: Date;
  affectedChannelId?: string;
  suggestedAction: string;
}

export class WorkloadCalculationEngine {
  /**
   * Calculate comprehensive workload metrics for a weekly schedule
   */
  static calculateWorkloadMetrics(
    schedule: WeeklySchedule,
    channels: Channel[],
    dailyCapacityHours: number = 8
  ): WorkloadMetrics {
    const totalScheduledHours = this.calculateTotalScheduledHours(schedule.tasks);
    const capacityHours = schedule.userCapacityHours;
    const utilizationPercentage = capacityHours > 0 ? (totalScheduledHours / capacityHours) * 100 : 0;
    const overloadHours = Math.max(0, totalScheduledHours - capacityHours);
    const isOverloaded = totalScheduledHours > capacityHours;

    const dailyBreakdown = this.calculateDailyBreakdown(
      schedule.tasks,
      schedule.weekStartDate,
      dailyCapacityHours
    );

    const channelBreakdown = this.calculateChannelBreakdown(
      schedule.tasks,
      channels
    );

    return {
      totalScheduledHours,
      capacityHours,
      utilizationPercentage,
      overloadHours,
      isOverloaded,
      dailyBreakdown,
      channelBreakdown,
    };
  }

  /**
   * Calculate total scheduled hours from tasks
   */
  static calculateTotalScheduledHours(tasks: Task[]): number {
    return tasks.reduce((total, task) => {
      // Only count planned and in-progress tasks
      if (task.status === 'planned' || task.status === 'in-progress') {
        return total + task.estimatedHours;
      }
      return total;
    }, 0);
  }

  /**
   * Calculate daily workload breakdown
   */
  static calculateDailyBreakdown(
    tasks: Task[],
    weekStartDate: Date,
    dailyCapacityHours: number
  ): DailyWorkload[] {
    const dailyBreakdown: DailyWorkload[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStartDate);
      currentDate.setDate(weekStartDate.getDate() + i);
      
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.scheduledStart);
        return taskDate.toDateString() === currentDate.toDateString();
      });

      const scheduledHours = dayTasks.reduce((total, task) => {
        if (task.status === 'planned' || task.status === 'in-progress') {
          return total + task.estimatedHours;
        }
        return total;
      }, 0);

      dailyBreakdown.push({
        date: new Date(currentDate),
        dayName: dayNames[currentDate.getDay()],
        scheduledHours,
        tasks: dayTasks,
        isOverloaded: scheduledHours > dailyCapacityHours,
      });
    }

    return dailyBreakdown;
  }

  /**
   * Calculate workload breakdown by channel
   */
  static calculateChannelBreakdown(
    tasks: Task[],
    channels: Channel[]
  ): ChannelWorkload[] {
    const channelMap = new Map<string, ChannelWorkload>();

    // Initialize channel workload data
    channels.forEach(channel => {
      channelMap.set(channel.id, {
        channelId: channel.id,
        channelName: channel.name,
        scheduledHours: 0,
        taskCount: 0,
        completionRate: 0,
      });
    });

    // Calculate workload for each channel
    tasks.forEach(task => {
      const channelWorkload = channelMap.get(task.channelId);
      if (channelWorkload) {
        channelWorkload.taskCount++;
        
        if (task.status === 'planned' || task.status === 'in-progress') {
          channelWorkload.scheduledHours += task.estimatedHours;
        }
      }
    });

    // Calculate completion rates
    channelMap.forEach((workload, channelId) => {
      const channelTasks = tasks.filter(task => task.channelId === channelId);
      const completedTasks = channelTasks.filter(task => task.status === 'completed');
      
      workload.completionRate = channelTasks.length > 0 
        ? (completedTasks.length / channelTasks.length) * 100 
        : 0;
    });

    return Array.from(channelMap.values());
  }

  /**
   * Detect overload conditions and generate warnings
   */
  static detectOverloadWarnings(
    metrics: WorkloadMetrics,
    workingDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  ): OverloadWarning[] {
    const warnings: OverloadWarning[] = [];

    // Weekly overload warning
    if (metrics.isOverloaded) {
      const severity = this.getOverloadSeverity(metrics.utilizationPercentage);
      warnings.push({
        type: 'weekly',
        severity,
        message: `Weekly workload exceeds capacity by ${metrics.overloadHours.toFixed(1)} hours (${metrics.utilizationPercentage.toFixed(1)}% utilization)`,
        suggestedAction: severity === 'high' 
          ? 'Consider rescheduling tasks or extending the timeline'
          : 'Monitor workload and consider minor adjustments',
      });
    }

    // Daily overload warnings
    metrics.dailyBreakdown.forEach(day => {
      if (day.isOverloaded && workingDays.includes(day.dayName)) {
        warnings.push({
          type: 'daily',
          severity: 'medium',
          message: `${day.dayName} is overloaded with ${day.scheduledHours.toFixed(1)} hours scheduled`,
          affectedDate: day.date,
          suggestedAction: 'Redistribute tasks to other days or reduce scope',
        });
      }
    });

    // Channel imbalance warnings
    const avgChannelHours = metrics.channelBreakdown.length > 0
      ? metrics.totalScheduledHours / metrics.channelBreakdown.length
      : 0;

    metrics.channelBreakdown.forEach(channel => {
      if (channel.scheduledHours > avgChannelHours * 1.5) {
        warnings.push({
          type: 'channel',
          severity: 'low',
          message: `${channel.channelName} has disproportionately high workload (${channel.scheduledHours.toFixed(1)} hours)`,
          affectedChannelId: channel.channelId,
          suggestedAction: 'Consider balancing workload across channels',
        });
      }
    });

    return warnings;
  }

  /**
   * Determine overload severity based on utilization percentage
   */
  private static getOverloadSeverity(utilizationPercentage: number): 'low' | 'medium' | 'high' {
    if (utilizationPercentage >= 150) return 'high';
    if (utilizationPercentage >= 120) return 'medium';
    return 'low';
  }

  /**
   * Calculate optimal daily capacity based on working days and hours
   */
  static calculateDailyCapacity(
    weeklyCapacityHours: number,
    workingDays: string[]
  ): number {
    return workingDays.length > 0 ? weeklyCapacityHours / workingDays.length : 8;
  }

  /**
   * Get workload trend analysis
   */
  static getWorkloadTrend(
    currentMetrics: WorkloadMetrics,
    previousMetrics?: WorkloadMetrics
  ): {
    trend: 'increasing' | 'decreasing' | 'stable';
    change: number;
    message: string;
  } {
    if (!previousMetrics) {
      return {
        trend: 'stable',
        change: 0,
        message: 'No previous data available for comparison',
      };
    }

    const change = currentMetrics.utilizationPercentage - previousMetrics.utilizationPercentage;
    const threshold = 5; // 5% threshold for trend detection

    if (Math.abs(change) < threshold) {
      return {
        trend: 'stable',
        change,
        message: `Workload is stable (${change > 0 ? '+' : ''}${change.toFixed(1)}% change)`,
      };
    }

    return {
      trend: change > 0 ? 'increasing' : 'decreasing',
      change,
      message: `Workload is ${change > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(change).toFixed(1)}%`,
    };
  }
}