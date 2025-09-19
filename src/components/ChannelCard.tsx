import React from 'react';
import { Channel, Task } from '../types';
import { TASK_STATUSES } from '../utils/constants';
import styles from './ChannelCard.module.css';

interface ChannelCardProps {
  channel: Channel;
  tasks?: Task[];
  onEdit?: (channel: Channel) => void;
  onToggleActive?: (channelId: string) => void;
  onDelete?: (channelId: string) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  tasks = [],
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  // Calculate channel statistics
  const channelTasks = tasks.filter(task => task.channelId === channel.id);
  const completedTasks = channelTasks.filter(task => task.status === 'completed');
  const inProgressTasks = channelTasks.filter(task => task.status === 'in-progress');
  const overdueTasks = channelTasks.filter(task => task.status === 'overdue');
  
  const completionRate = channelTasks.length > 0 
    ? Math.round((completedTasks.length / channelTasks.length) * 100)
    : 0;

  // Determine channel status
  const getChannelStatus = () => {
    if (!channel.isActive) return 'inactive';
    if (overdueTasks.length > 0) return 'behind';
    if (inProgressTasks.length > 0) return 'active';
    if (completedTasks.length === channelTasks.length && channelTasks.length > 0) return 'on-track';
    return 'idle';
  };

  const channelStatus = getChannelStatus();

  const handleEdit = () => {
    onEdit?.(channel);
  };

  const handleToggleActive = () => {
    onToggleActive?.(channel.id);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${channel.name}"? This action cannot be undone.`)) {
      onDelete?.(channel.id);
    }
  };

  return (
    <div 
      className={`${styles.channelCard} ${!channel.isActive ? styles.inactive : ''}`}
      style={{ '--channel-color': channel.color } as React.CSSProperties}
    >
      {/* Channel Header */}
      <div className={styles.channelHeader}>
        <div className={styles.channelColorIndicator} />
        <div className={styles.channelInfo}>
          <h3 className={styles.channelName}>{channel.name}</h3>
          <span className={styles.channelType}>{channel.contentType}</span>
        </div>
        <div className={`${styles.channelStatusIndicator} ${styles[channelStatus]}`} />
      </div>

      {/* Channel Stats */}
      <div className={styles.channelStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Tasks</span>
          <span className={styles.statValue}>{channelTasks.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Completion</span>
          <span className={styles.statValue}>{completionRate}%</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Frequency</span>
          <span className={styles.statValue}>{channel.postingSchedule.frequency}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <span className={styles.progressText}>{completedTasks.length}/{channelTasks.length} completed</span>
      </div>

      {/* Status Indicators */}
      {channelTasks.length > 0 && (
        <div className={styles.statusIndicators}>
          {inProgressTasks.length > 0 && (
            <div className={`${styles.statusBadge} ${styles.inProgress}`}>
              {inProgressTasks.length} in progress
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className={`${styles.statusBadge} ${styles.overdue}`}>
              {overdueTasks.length} overdue
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.channelActions}>
        <button 
          className={`${styles.actionBtn} ${styles.edit}`}
          onClick={handleEdit}
          title="Edit channel"
        >
          ✏️
        </button>
        <button 
          className={`${styles.actionBtn} ${styles.toggle} ${channel.isActive ? styles.active : styles.inactive}`}
          onClick={handleToggleActive}
          title={channel.isActive ? 'Deactivate channel' : 'Activate channel'}
        >
          {channel.isActive ? '⏸️' : '▶️'}
        </button>
        <button 
          className={`${styles.actionBtn} ${styles.delete}`}
          onClick={handleDelete}
          title="Delete channel"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};