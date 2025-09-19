import React from 'react';
import { useTaskStatus } from '../hooks/useTaskStatus';
import styles from './ChannelProgressBar.module.css';

interface ChannelProgressBarProps {
  channelId: string;
  channelName: string;
  channelColor: string;
  showDetails?: boolean;
  className?: string;
}

export const ChannelProgressBar: React.FC<ChannelProgressBarProps> = ({
  channelId,
  channelName,
  channelColor,
  showDetails = false,
  className = '',
}) => {
  const { getChannelCompletionRate, getChannelTaskStats } = useTaskStatus();
  
  const completionRate = getChannelCompletionRate(channelId);
  const stats = getChannelTaskStats(channelId);
  
  const getHealthStatus = () => {
    if (stats.overdue > 0) return 'critical';
    if (completionRate < 30) return 'warning';
    if (completionRate >= 80) return 'excellent';
    return 'good';
  };

  const healthStatus = getHealthStatus();

  return (
    <div className={`${styles.progressContainer} ${className}`}>
      <div className={styles.header}>
        <div className={styles.channelInfo}>
          <div 
            className={styles.channelIndicator}
            style={{ backgroundColor: channelColor }}
          />
          <span className={styles.channelName}>{channelName}</span>
          <span className={`${styles.healthBadge} ${styles[healthStatus]}`}>
            {healthStatus}
          </span>
        </div>
        <div className={styles.completionRate}>
          {completionRate}%
        </div>
      </div>
      
      <div className={styles.progressBarContainer}>
        <div 
          className={styles.progressBar}
          style={{ backgroundColor: `${channelColor}20` }}
        >
          <div 
            className={styles.progressFill}
            style={{ 
              width: `${completionRate}%`,
              backgroundColor: channelColor 
            }}
          />
        </div>
      </div>

      {showDetails && (
        <div className={styles.details}>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.completed}</span>
              <span className={styles.statLabel}>Completed</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.inProgress}</span>
              <span className={styles.statLabel}>In Progress</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{stats.planned}</span>
              <span className={styles.statLabel}>Planned</span>
            </div>
            {stats.overdue > 0 && (
              <div className={`${styles.statItem} ${styles.overdue}`}>
                <span className={styles.statValue}>{stats.overdue}</span>
                <span className={styles.statLabel}>Overdue</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};