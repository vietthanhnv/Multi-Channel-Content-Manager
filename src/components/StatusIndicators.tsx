import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useTaskStatus } from '../hooks/useTaskStatus';
import styles from './StatusIndicators.module.css';

interface StatusIndicatorsProps {
  className?: string;
  layout?: 'horizontal' | 'vertical';
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  className = '',
  layout = 'horizontal',
}) => {
  const { state } = useAppContext();
  const { getTasksByStatus } = useTaskStatus();
  
  const { channels, currentWeek } = state;
  const tasksByStatus = getTasksByStatus();
  
  // Calculate overall health metrics
  const totalTasks = currentWeek.tasks.length;
  const activeChannels = channels.filter(channel => channel.isActive).length;
  const overloadedHours = Math.max(currentWeek.totalScheduledHours - currentWeek.userCapacityHours, 0);
  
  const indicators = [
    {
      id: 'channels',
      label: 'Active Channels',
      value: activeChannels,
      total: channels.length,
      status: activeChannels > 0 ? 'good' : 'warning',
      icon: '📺',
    },
    {
      id: 'tasks',
      label: 'Total Tasks',
      value: totalTasks,
      status: totalTasks > 0 ? 'good' : 'neutral',
      icon: '📋',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: tasksByStatus.completed.length,
      total: totalTasks,
      status: totalTasks > 0 && tasksByStatus.completed.length / totalTasks >= 0.8 ? 'excellent' : 
              totalTasks > 0 && tasksByStatus.completed.length / totalTasks >= 0.5 ? 'good' : 
              totalTasks > 0 ? 'warning' : 'neutral',
      icon: '✅',
    },
    {
      id: 'inProgress',
      label: 'In Progress',
      value: tasksByStatus.inProgress.length,
      status: tasksByStatus.inProgress.length > 0 ? 'good' : 'neutral',
      icon: '🔄',
    },
    {
      id: 'overdue',
      label: 'Overdue',
      value: tasksByStatus.overdue.length,
      status: tasksByStatus.overdue.length === 0 ? 'excellent' : 
              tasksByStatus.overdue.length <= 2 ? 'warning' : 'critical',
      icon: '⚠️',
    },
    {
      id: 'workload',
      label: 'Workload',
      value: `${currentWeek.totalScheduledHours.toFixed(1)}h`,
      status: overloadedHours === 0 ? 'good' : 
              overloadedHours <= 5 ? 'warning' : 'critical',
      icon: '⏱️',
      subtitle: overloadedHours > 0 ? `+${overloadedHours.toFixed(1)}h over` : 'Within capacity',
    },
  ];

  return (
    <div className={`${styles.indicatorsContainer} ${styles[layout]} ${className}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>System Health</h3>
        <div className={styles.timestamp}>
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
      
      <div className={styles.indicatorsGrid}>
        {indicators.map((indicator) => (
          <div 
            key={indicator.id}
            className={`${styles.indicator} ${styles[indicator.status]}`}
          >
            <div className={styles.indicatorIcon}>
              {indicator.icon}
            </div>
            
            <div className={styles.indicatorContent}>
              <div className={styles.indicatorValue}>
                {indicator.value}
                {indicator.total && (
                  <span className={styles.indicatorTotal}>
                    /{indicator.total}
                  </span>
                )}
              </div>
              
              <div className={styles.indicatorLabel}>
                {indicator.label}
              </div>
              
              {indicator.subtitle && (
                <div className={styles.indicatorSubtitle}>
                  {indicator.subtitle}
                </div>
              )}
            </div>
            
            <div className={`${styles.statusDot} ${styles[indicator.status]}`} />
          </div>
        ))}
      </div>
      
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Overall Status:</span>
          <span className={`${styles.summaryValue} ${styles[getOverallStatus()]}`}>
            {getOverallStatus().toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );

  function getOverallStatus(): 'excellent' | 'good' | 'warning' | 'critical' {
    const criticalCount = indicators.filter(i => i.status === 'critical').length;
    const warningCount = indicators.filter(i => i.status === 'warning').length;
    const excellentCount = indicators.filter(i => i.status === 'excellent').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 2) return 'warning';
    if (excellentCount >= 3) return 'excellent';
    return 'good';
  }
};