import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useTaskStatus } from '../hooks/useTaskStatus';
import styles from './WorkloadChart.module.css';

interface WorkloadChartProps {
  className?: string;
  showLegend?: boolean;
}

export const WorkloadChart: React.FC<WorkloadChartProps> = ({
  className = '',
  showLegend = true,
}) => {
  const { state } = useAppContext();
  const { getTimeAccuracy } = useTaskStatus();
  
  const { currentWeek, userSettings } = state;
  const { totalScheduledHours, userCapacityHours } = currentWeek;
  
  const capacityPercentage = Math.min((totalScheduledHours / userCapacityHours) * 100, 100);
  const overloadHours = Math.max(totalScheduledHours - userCapacityHours, 0);
  const overloadPercentage = overloadHours > 0 ? (overloadHours / userCapacityHours) * 100 : 0;
  
  const timeAccuracy = getTimeAccuracy();
  
  const getCapacityStatus = () => {
    if (overloadHours > 0) return 'overloaded';
    if (capacityPercentage > 90) return 'critical';
    if (capacityPercentage > 75) return 'warning';
    return 'healthy';
  };

  const capacityStatus = getCapacityStatus();

  return (
    <div className={`${styles.chartContainer} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Weekly Workload</h3>
        <div className={`${styles.statusBadge} ${styles[capacityStatus]}`}>
          {capacityStatus}
        </div>
      </div>

      <div className={styles.chartArea}>
        <div className={styles.barContainer}>
          <div className={styles.capacityBar}>
            <div 
              className={styles.scheduledFill}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
            {overloadPercentage > 0 && (
              <div 
                className={styles.overloadFill}
                style={{ width: `${overloadPercentage}%` }}
              />
            )}
          </div>
          <div className={styles.capacityLine} />
        </div>

        <div className={styles.metrics}>
          <div className={styles.metricGroup}>
            <div className={styles.metricValue}>
              {totalScheduledHours.toFixed(1)}h
            </div>
            <div className={styles.metricLabel}>Scheduled</div>
          </div>
          
          <div className={styles.metricGroup}>
            <div className={styles.metricValue}>
              {userCapacityHours}h
            </div>
            <div className={styles.metricLabel}>Capacity</div>
          </div>
          
          {overloadHours > 0 && (
            <div className={`${styles.metricGroup} ${styles.overload}`}>
              <div className={styles.metricValue}>
                +{overloadHours.toFixed(1)}h
              </div>
              <div className={styles.metricLabel}>Overload</div>
            </div>
          )}
        </div>
      </div>

      {showLegend && (
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.scheduled}`} />
            <span>Scheduled Hours</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.capacity}`} />
            <span>Available Capacity</span>
          </div>
          {overloadHours > 0 && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.overloadLegend}`} />
              <span>Overload</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.additionalMetrics}>
        <div className={styles.accuracyMetric}>
          <span className={styles.accuracyLabel}>Time Estimation Accuracy:</span>
          <span className={styles.accuracyValue}>{timeAccuracy.accuracy}%</span>
        </div>
        
        {timeAccuracy.totalEstimated > 0 && (
          <div className={styles.timeComparison}>
            <span className={styles.comparisonText}>
              Estimated: {timeAccuracy.totalEstimated}h | 
              Actual: {timeAccuracy.totalActual}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
};