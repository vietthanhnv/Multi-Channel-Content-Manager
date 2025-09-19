import React from 'react';
import { useWorkloadCalculation } from '../hooks/useWorkloadCalculation';
import { useRebalancingSuggestions } from '../hooks/useRebalancingSuggestions';
import styles from './WorkloadOverview.module.css';

interface WorkloadOverviewProps {
  className?: string;
  showSuggestions?: boolean;
}

export const WorkloadOverview: React.FC<WorkloadOverviewProps> = ({ 
  className, 
  showSuggestions = true 
}) => {
  const { 
    workloadMetrics, 
    isOverloaded, 
    hasOverloadedDays, 
    mostOverloadedDay,
    busiestChannel,
    workloadDistribution 
  } = useWorkloadCalculation();

  const { 
    needsRebalancing, 
    quickWins, 
    topSuggestion 
  } = useRebalancingSuggestions();

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return styles.utilizationHigh;
    if (percentage >= 80) return styles.utilizationMedium;
    return styles.utilizationLow;
  };

  const getDistributionEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return styles.efficiencyGood;
    if (efficiency >= 60) return styles.efficiencyMedium;
    return styles.efficiencyPoor;
  };

  return (
    <div className={`${styles.overview} ${className || ''}`}>
      <div className={styles.header}>
        <h3>Workload Overview</h3>
        {isOverloaded && (
          <div className={styles.overloadBadge}>
            ⚠️ Overloaded
          </div>
        )}
      </div>

      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Weekly Utilization</span>
            <span className={`${styles.metricValue} ${getUtilizationColor(workloadMetrics.utilizationPercentage)}`}>
              {workloadMetrics.utilizationPercentage.toFixed(1)}%
            </span>
          </div>
          <div className={styles.utilizationBar}>
            <div 
              className={`${styles.utilizationFill} ${getUtilizationColor(workloadMetrics.utilizationPercentage)}`}
              style={{ width: `${Math.min(100, workloadMetrics.utilizationPercentage)}%` }}
            />
          </div>
          <div className={styles.metricDetails}>
            {workloadMetrics.totalScheduledHours.toFixed(1)}h / {workloadMetrics.capacityHours}h
            {isOverloaded && (
              <span className={styles.overloadText}>
                (+{workloadMetrics.overloadHours.toFixed(1)}h over)
              </span>
            )}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Distribution Efficiency</span>
            <span className={`${styles.metricValue} ${getDistributionEfficiencyColor(workloadDistribution.efficiency)}`}>
              {workloadDistribution.efficiency.toFixed(1)}%
            </span>
          </div>
          <div className={styles.metricDetails}>
            {hasOverloadedDays ? 'Uneven distribution' : 'Well balanced'}
          </div>
        </div>

        {mostOverloadedDay && (
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Peak Day</span>
              <span className={styles.metricValue}>
                {mostOverloadedDay.scheduledHours.toFixed(1)}h
              </span>
            </div>
            <div className={styles.metricDetails}>
              {mostOverloadedDay.dayName}
              {mostOverloadedDay.isOverloaded && (
                <span className={styles.overloadIndicator}> ⚠️</span>
              )}
            </div>
          </div>
        )}

        {busiestChannel && (
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Busiest Channel</span>
              <span className={styles.metricValue}>
                {busiestChannel.scheduledHours.toFixed(1)}h
              </span>
            </div>
            <div className={styles.metricDetails}>
              {busiestChannel.channelName}
            </div>
          </div>
        )}
      </div>

      {showSuggestions && needsRebalancing && (
        <div className={styles.suggestions}>
          <div className={styles.suggestionsHeader}>
            <span className={styles.suggestionsTitle}>
              💡 Rebalancing Available
            </span>
            {quickWins.length > 0 && (
              <span className={styles.quickWinsBadge}>
                ⚡ {quickWins.length} quick win{quickWins.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {topSuggestion && (
            <div className={styles.topSuggestion}>
              <div className={styles.suggestionTitle}>
                {topSuggestion.title}
              </div>
              <div className={styles.suggestionImpact}>
                Save {topSuggestion.impact.hoursReduced.toFixed(1)}h • 
                {topSuggestion.impact.utilizationImprovement.toFixed(1)}% improvement
              </div>
            </div>
          )}
        </div>
      )}

      {!needsRebalancing && !isOverloaded && (
        <div className={styles.allGood}>
          <span className={styles.allGoodIcon}>✅</span>
          <span className={styles.allGoodText}>Workload is well balanced</span>
        </div>
      )}
    </div>
  );
};