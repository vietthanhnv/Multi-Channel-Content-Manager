import { useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useWorkloadCalculation } from './useWorkloadCalculation';
import { 
  RebalancingSuggestionEngine, 
  RebalancingSuggestion, 
  RebalancingOptions 
} from '../services/rebalancingSuggestions';
import { Task } from '../types';

export const useRebalancingSuggestions = (options?: Partial<RebalancingOptions>) => {
  const { state, dispatch } = useAppContext();
  const { workloadMetrics } = useWorkloadCalculation();

  // Default rebalancing options
  const defaultOptions: RebalancingOptions = {
    maxDailyHours: 8,
    allowTaskSplitting: false,
    allowCrossChannelRebalancing: true,
    preserveDeadlines: true,
    workingDays: state.userSettings.workingDays,
  };

  const rebalancingOptions = useMemo(() => ({
    ...defaultOptions,
    ...options,
    workingDays: state.userSettings.workingDays, // Always use current user settings
  }), [options, state.userSettings.workingDays]);

  // Generate rebalancing suggestions
  const suggestions = useMemo((): RebalancingSuggestion[] => {
    if (!workloadMetrics.isOverloaded && !workloadMetrics.dailyBreakdown.some(day => day.isOverloaded)) {
      return [];
    }

    return RebalancingSuggestionEngine.generateSuggestions(
      state.currentWeek,
      state.channels,
      workloadMetrics,
      rebalancingOptions
    );
  }, [state.currentWeek, state.channels, workloadMetrics, rebalancingOptions]);

  // Get suggestions by priority
  const highPrioritySuggestions = useMemo(() => 
    suggestions.filter(s => s.priority === 'high'), [suggestions]
  );

  const mediumPrioritySuggestions = useMemo(() => 
    suggestions.filter(s => s.priority === 'medium'), [suggestions]
  );

  const lowPrioritySuggestions = useMemo(() => 
    suggestions.filter(s => s.priority === 'low'), [suggestions]
  );

  // Get suggestions by type
  const dailyRedistributionSuggestions = useMemo(() => 
    suggestions.filter(s => s.type === 'redistribute_daily'), [suggestions]
  );

  const channelRebalancingSuggestions = useMemo(() => 
    suggestions.filter(s => s.type === 'redistribute_channel'), [suggestions]
  );

  const scopeReductionSuggestions = useMemo(() => 
    suggestions.filter(s => s.type === 'reduce_scope'), [suggestions]
  );

  const timelineExtensionSuggestions = useMemo(() => 
    suggestions.filter(s => s.type === 'extend_timeline'), [suggestions]
  );

  // Apply a suggestion
  const applySuggestion = useCallback(async (suggestion: RebalancingSuggestion): Promise<{
    success: boolean;
    summary: string;
    error?: string;
  }> => {
    try {
      const result = RebalancingSuggestionEngine.applySuggestion(
        suggestion,
        state.currentWeek
      );

      // Update tasks in the state
      const updatedSchedule = {
        ...state.currentWeek,
        tasks: result.updatedTasks,
      };

      // Recalculate totals
      const newTotalHours = result.updatedTasks
        .filter(task => task.status === 'planned' || task.status === 'in-progress')
        .reduce((sum, task) => sum + task.estimatedHours, 0);

      updatedSchedule.totalScheduledHours = newTotalHours;
      updatedSchedule.isOverloaded = newTotalHours > state.userSettings.weeklyCapacityHours;

      dispatch({ type: 'SET_CURRENT_WEEK', payload: updatedSchedule });

      return {
        success: true,
        summary: result.summary,
      };
    } catch (error) {
      return {
        success: false,
        summary: 'Failed to apply suggestion',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [state.currentWeek, state.userSettings.weeklyCapacityHours, dispatch]);

  // Apply multiple suggestions
  const applyMultipleSuggestions = useCallback(async (
    suggestionIds: string[]
  ): Promise<{
    success: boolean;
    appliedCount: number;
    failedCount: number;
    summaries: string[];
    errors: string[];
  }> => {
    const results = {
      success: true,
      appliedCount: 0,
      failedCount: 0,
      summaries: [] as string[],
      errors: [] as string[],
    };

    for (const suggestionId of suggestionIds) {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) {
        results.failedCount++;
        results.errors.push(`Suggestion ${suggestionId} not found`);
        continue;
      }

      const result = await applySuggestion(suggestion);
      if (result.success) {
        results.appliedCount++;
        results.summaries.push(result.summary);
      } else {
        results.failedCount++;
        results.errors.push(result.error || 'Unknown error');
      }
    }

    results.success = results.failedCount === 0;
    return results;
  }, [suggestions, applySuggestion]);

  // Get the most impactful suggestion
  const topSuggestion = useMemo(() => {
    if (suggestions.length === 0) return null;
    
    return suggestions.reduce((best, current) => {
      if (current.priority === 'high' && best.priority !== 'high') return current;
      if (current.priority === best.priority) {
        return current.impact.utilizationImprovement > best.impact.utilizationImprovement 
          ? current 
          : best;
      }
      return best;
    });
  }, [suggestions]);

  // Calculate total potential impact
  const totalPotentialImpact = useMemo(() => {
    return suggestions.reduce((total, suggestion) => ({
      hoursReduced: total.hoursReduced + suggestion.impact.hoursReduced,
      utilizationImprovement: total.utilizationImprovement + suggestion.impact.utilizationImprovement,
      affectedTasks: total.affectedTasks + suggestion.impact.affectedTasks,
    }), {
      hoursReduced: 0,
      utilizationImprovement: 0,
      affectedTasks: 0,
    });
  }, [suggestions]);

  // Check if rebalancing is needed
  const needsRebalancing = useMemo(() => {
    return workloadMetrics.isOverloaded || 
           workloadMetrics.dailyBreakdown.some(day => 
             day.isOverloaded && rebalancingOptions.workingDays.includes(day.dayName)
           );
  }, [workloadMetrics, rebalancingOptions.workingDays]);

  // Get quick wins (low effort, high impact suggestions)
  const quickWins = useMemo(() => {
    return suggestions.filter(s => 
      s.estimatedEffort === 'low' && 
      s.impact.utilizationImprovement >= 5
    );
  }, [suggestions]);

  return {
    // Core data
    suggestions,
    needsRebalancing,
    topSuggestion,
    quickWins,

    // Categorized suggestions
    highPrioritySuggestions,
    mediumPrioritySuggestions,
    lowPrioritySuggestions,
    dailyRedistributionSuggestions,
    channelRebalancingSuggestions,
    scopeReductionSuggestions,
    timelineExtensionSuggestions,

    // Impact analysis
    totalPotentialImpact,

    // Actions
    applySuggestion,
    applyMultipleSuggestions,

    // Configuration
    rebalancingOptions,

    // Utility functions
    getSuggestionById: (id: string) => suggestions.find(s => s.id === id),
    getSuggestionsByType: (type: RebalancingSuggestion['type']) => 
      suggestions.filter(s => s.type === type),
    getSuggestionsByPriority: (priority: RebalancingSuggestion['priority']) => 
      suggestions.filter(s => s.priority === priority),
    getSuggestionsByEffort: (effort: RebalancingSuggestion['estimatedEffort']) => 
      suggestions.filter(s => s.estimatedEffort === effort),
  };
};