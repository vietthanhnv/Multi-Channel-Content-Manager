import React, { useState } from 'react';
import { useRebalancingSuggestions } from '../hooks/useRebalancingSuggestions';
import { useWorkloadCalculation } from '../hooks/useWorkloadCalculation';
import { RebalancingSuggestion } from '../services/rebalancingSuggestions';
import styles from './RebalancingPanel.module.css';

interface RebalancingPanelProps {
  className?: string;
}

export const RebalancingPanel: React.FC<RebalancingPanelProps> = ({ className }) => {
  const { workloadMetrics, isOverloaded } = useWorkloadCalculation();
  const {
    suggestions,
    needsRebalancing,
    topSuggestion,
    quickWins,
    applySuggestion,
    totalPotentialImpact,
  } = useRebalancingSuggestions();

  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const handleApplySuggestion = async (suggestion: RebalancingSuggestion) => {
    setApplyingIds(prev => new Set(prev).add(suggestion.id));
    
    try {
      const result = await applySuggestion(suggestion);
      if (result.success) {
        setAppliedIds(prev => new Set(prev).add(suggestion.id));
      }
    } finally {
      setApplyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.id);
        return newSet;
      });
    }
  };

  const getPriorityColor = (priority: RebalancingSuggestion['priority']) => {
    switch (priority) {
      case 'high': return styles.priorityHigh;
      case 'medium': return styles.priorityMedium;
      case 'low': return styles.priorityLow;
      default: return '';
    }
  };

  const getEffortIcon = (effort: RebalancingSuggestion['estimatedEffort']) => {
    switch (effort) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '';
    }
  };

  if (!needsRebalancing) {
    return (
      <div className={`${styles.panel} ${className || ''}`}>
        <div className={styles.header}>
          <h3>Workload Balance</h3>
          <div className={styles.statusGood}>✅ Well Balanced</div>
        </div>
        <p className={styles.noSuggestions}>
          Your workload is well distributed. No rebalancing needed at this time.
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${className || ''}`}>
      <div className={styles.header}>
        <h3>Rebalancing Suggestions</h3>
        <div className={styles.overloadStatus}>
          {isOverloaded && (
            <span className={styles.statusOverloaded}>
              ⚠️ {workloadMetrics.overloadHours.toFixed(1)}h overloaded
            </span>
          )}
        </div>
      </div>

      {totalPotentialImpact.hoursReduced > 0 && (
        <div className={styles.impactSummary}>
          <h4>Potential Impact</h4>
          <div className={styles.impactMetrics}>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                {totalPotentialImpact.hoursReduced.toFixed(1)}h
              </span>
              <span className={styles.metricLabel}>Hours Saved</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                {totalPotentialImpact.utilizationImprovement.toFixed(1)}%
              </span>
              <span className={styles.metricLabel}>Utilization Improvement</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricValue}>
                {totalPotentialImpact.affectedTasks}
              </span>
              <span className={styles.metricLabel}>Tasks Affected</span>
            </div>
          </div>
        </div>
      )}

      {quickWins.length > 0 && (
        <div className={styles.quickWins}>
          <h4>⚡ Quick Wins</h4>
          <p className={styles.quickWinsDescription}>
            Low-effort changes with high impact
          </p>
          {quickWins.slice(0, 2).map(suggestion => (
            <div key={suggestion.id} className={styles.quickWinCard}>
              <div className={styles.quickWinHeader}>
                <span className={styles.quickWinTitle}>{suggestion.title}</span>
                <button
                  className={styles.quickApplyButton}
                  onClick={() => handleApplySuggestion(suggestion)}
                  disabled={applyingIds.has(suggestion.id) || appliedIds.has(suggestion.id)}
                >
                  {appliedIds.has(suggestion.id) ? '✅ Applied' : 
                   applyingIds.has(suggestion.id) ? 'Applying...' : 'Quick Apply'}
                </button>
              </div>
              <p className={styles.quickWinDescription}>{suggestion.description}</p>
            </div>
          ))}
        </div>
      )}

      <div className={styles.suggestions}>
        <h4>All Suggestions ({suggestions.length})</h4>
        {suggestions.map(suggestion => (
          <div 
            key={suggestion.id} 
            className={`${styles.suggestion} ${getPriorityColor(suggestion.priority)}`}
          >
            <div className={styles.suggestionHeader}>
              <div className={styles.suggestionTitle}>
                <span className={styles.priorityBadge}>
                  {suggestion.priority.toUpperCase()}
                </span>
                <h5>{suggestion.title}</h5>
                <span className={styles.effortBadge}>
                  {getEffortIcon(suggestion.estimatedEffort)} {suggestion.estimatedEffort} effort
                </span>
              </div>
              <div className={styles.suggestionActions}>
                <button
                  className={styles.expandButton}
                  onClick={() => toggleExpanded(suggestion.id)}
                >
                  {expandedSuggestions.has(suggestion.id) ? '▼' : '▶'}
                </button>
                <button
                  className={styles.applyButton}
                  onClick={() => handleApplySuggestion(suggestion)}
                  disabled={applyingIds.has(suggestion.id) || appliedIds.has(suggestion.id)}
                >
                  {appliedIds.has(suggestion.id) ? '✅ Applied' : 
                   applyingIds.has(suggestion.id) ? 'Applying...' : 'Apply'}
                </button>
              </div>
            </div>

            <p className={styles.suggestionDescription}>{suggestion.description}</p>

            <div className={styles.suggestionImpact}>
              <span className={styles.impactItem}>
                📉 {suggestion.impact.hoursReduced.toFixed(1)}h saved
              </span>
              <span className={styles.impactItem}>
                📊 {suggestion.impact.utilizationImprovement.toFixed(1)}% improvement
              </span>
              <span className={styles.impactItem}>
                📋 {suggestion.impact.affectedTasks} tasks
              </span>
            </div>

            {expandedSuggestions.has(suggestion.id) && (
              <div className={styles.suggestionDetails}>
                <h6>Actions:</h6>
                <div className={styles.actions}>
                  {suggestion.actions.map((action, index) => (
                    <div key={index} className={styles.action}>
                      <div className={styles.actionHeader}>
                        <span className={styles.actionType}>
                          {action.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={styles.taskTitle}>{action.taskTitle}</span>
                      </div>
                      <p className={styles.actionReason}>{action.reason}</p>
                      
                      {action.currentSchedule && action.proposedSchedule && (
                        <div className={styles.scheduleComparison}>
                          <div className={styles.scheduleItem}>
                            <strong>Current:</strong> {action.currentSchedule.hours}h
                            {action.currentSchedule.start && (
                              <span className={styles.scheduleTime}>
                                {' '}({action.currentSchedule.start.toLocaleDateString()})
                              </span>
                            )}
                          </div>
                          <div className={styles.scheduleItem}>
                            <strong>Proposed:</strong> {action.proposedSchedule.hours}h
                            {action.proposedSchedule.start && (
                              <span className={styles.scheduleTime}>
                                {' '}({action.proposedSchedule.start.toLocaleDateString()})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {suggestions.length === 0 && (
        <div className={styles.noSuggestions}>
          <p>No rebalancing suggestions available at this time.</p>
          <p className={styles.hint}>
            Try adjusting your capacity settings or task schedules manually.
          </p>
        </div>
      )}
    </div>
  );
};