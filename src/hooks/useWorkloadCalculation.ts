import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  WorkloadCalculationEngine, 
  WorkloadMetrics, 
  OverloadWarning 
} from '../services/workloadCalculation';

export const useWorkloadCalculation = () => {
  const { state } = useAppContext();

  // Calculate current workload metrics
  const workloadMetrics = useMemo((): WorkloadMetrics => {
    const dailyCapacity = WorkloadCalculationEngine.calculateDailyCapacity(
      state.userSettings.weeklyCapacityHours,
      state.userSettings.workingDays
    );

    return WorkloadCalculationEngine.calculateWorkloadMetrics(
      state.currentWeek,
      state.channels,
      dailyCapacity
    );
  }, [
    state.currentWeek,
    state.channels,
    state.userSettings.weeklyCapacityHours,
    state.userSettings.workingDays,
  ]);

  // Detect overload warnings
  const overloadWarnings = useMemo((): OverloadWarning[] => {
    return WorkloadCalculationEngine.detectOverloadWarnings(
      workloadMetrics,
      state.userSettings.workingDays
    );
  }, [workloadMetrics, state.userSettings.workingDays]);

  // Get high priority warnings (medium and high severity)
  const criticalWarnings = useMemo(() => {
    return overloadWarnings.filter(warning => 
      warning.severity === 'medium' || warning.severity === 'high'
    );
  }, [overloadWarnings]);

  // Check if any working day is overloaded
  const hasOverloadedDays = useMemo(() => {
    return workloadMetrics.dailyBreakdown.some(day => 
      day.isOverloaded && state.userSettings.workingDays.includes(day.dayName)
    );
  }, [workloadMetrics.dailyBreakdown, state.userSettings.workingDays]);

  // Get the most overloaded day
  const mostOverloadedDay = useMemo(() => {
    const workingDays = workloadMetrics.dailyBreakdown.filter(day =>
      state.userSettings.workingDays.includes(day.dayName)
    );

    return workingDays.reduce((max, day) => 
      day.scheduledHours > max.scheduledHours ? day : max,
      workingDays[0] || null
    );
  }, [workloadMetrics.dailyBreakdown, state.userSettings.workingDays]);

  // Get channel with highest workload
  const busiestChannel = useMemo(() => {
    return workloadMetrics.channelBreakdown.reduce((max, channel) =>
      channel.scheduledHours > max.scheduledHours ? channel : max,
      workloadMetrics.channelBreakdown[0] || null
    );
  }, [workloadMetrics.channelBreakdown]);

  // Calculate workload distribution efficiency
  const workloadDistribution = useMemo(() => {
    const workingDays = workloadMetrics.dailyBreakdown.filter(day =>
      state.userSettings.workingDays.includes(day.dayName)
    );

    if (workingDays.length === 0) return { efficiency: 0, variance: 0 };

    const avgDailyHours = workingDays.reduce((sum, day) => sum + day.scheduledHours, 0) / workingDays.length;
    const variance = workingDays.reduce((sum, day) => 
      sum + Math.pow(day.scheduledHours - avgDailyHours, 2), 0
    ) / workingDays.length;

    // Efficiency is inversely related to variance (lower variance = better distribution)
    const efficiency = avgDailyHours > 0 ? Math.max(0, 100 - (variance / avgDailyHours) * 100) : 100;

    return { efficiency, variance };
  }, [workloadMetrics.dailyBreakdown, state.userSettings.workingDays]);

  return {
    // Core metrics
    workloadMetrics,
    overloadWarnings,
    criticalWarnings,

    // Convenience flags
    isOverloaded: workloadMetrics.isOverloaded,
    hasOverloadedDays,
    hasCriticalWarnings: criticalWarnings.length > 0,

    // Analysis data
    mostOverloadedDay,
    busiestChannel,
    workloadDistribution,

    // Utility functions
    getChannelWorkload: (channelId: string) => 
      workloadMetrics.channelBreakdown.find(channel => channel.channelId === channelId),
    
    getDayWorkload: (date: Date) =>
      workloadMetrics.dailyBreakdown.find(day => 
        day.date.toDateString() === date.toDateString()
      ),

    getWarningsByType: (type: 'daily' | 'weekly' | 'channel') =>
      overloadWarnings.filter(warning => warning.type === type),

    getWarningsBySeverity: (severity: 'low' | 'medium' | 'high') =>
      overloadWarnings.filter(warning => warning.severity === severity),
  };
};