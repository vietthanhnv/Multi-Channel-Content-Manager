import React, { useState, useMemo, useCallback } from 'react';
import { Channel, Task } from '../types';
import { ChannelCard } from './ChannelCard';
import { AddChannelModal } from './AddChannelModal';
import { ChannelSettings } from './ChannelSettings';
import { useAppContext } from '../context/AppContext';
import styles from './ChannelGrid.module.css';

interface ChannelGridProps {
  channels?: Channel[];
  tasks?: Task[];
  onEditChannel?: (channel: Channel) => void;
}

export const ChannelGrid: React.FC<ChannelGridProps> = React.memo(({
  channels: propChannels,
  tasks: propTasks,
  onEditChannel,
}) => {
  const { state, dispatch } = useAppContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  // Use context data if props are not provided
  const channels = propChannels || state.channels;
  const tasks = propTasks || state.currentWeek.tasks;

  // Debug logging
  console.log('ChannelGrid render - isAddModalOpen:', isAddModalOpen);

  // Memoized handlers to prevent unnecessary re-renders
  const handleEditChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    setIsSettingsModalOpen(true);
    onEditChannel?.(channel);
  }, [onEditChannel]);

  const handleToggleChannelActive = useCallback((channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      dispatch({
        type: 'UPDATE_CHANNEL',
        payload: {
          id: channelId,
          updates: { isActive: !channel.isActive }
        }
      });
    }
  }, [channels, dispatch]);

  const handleDeleteChannel = useCallback((channelId: string) => {
    dispatch({ type: 'DELETE_CHANNEL', payload: channelId });
  }, [dispatch]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalOpen(false);
    setSelectedChannel(null);
  }, []);

  // Memoized sorted channels to prevent unnecessary sorting
  const sortedChannels = useMemo(() => {
    return [...channels].sort((a, b) => {
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [channels]);

  // Memoized statistics to prevent recalculation
  const statistics = useMemo(() => {
    const activeChannels = channels.filter(c => c.isActive).length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    
    return {
      totalChannels: channels.length,
      activeChannels,
      totalTasks: tasks.length,
      completedTasks,
    };
  }, [channels, tasks]);

  const renderContent = () => {
    if (channels.length === 0) {
      return (
        <div className={styles.channelGridContainer}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📺</div>
            <h2 className={styles.emptyStateTitle}>No channels yet</h2>
            <p className={styles.emptyStateDescription}>
              Create your first channel to start managing your content across multiple platforms.
            </p>
            <button 
              className={`${styles.addChannelBtn} ${styles.primary}`}
              onClick={() => {
                console.log('Create Your First Channel button clicked');
                setIsAddModalOpen(true);
                console.log('Modal state set to true');
              }}
            >
              Create Your First Channel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.channelGridContainer}>
        <div className={styles.channelGridHeader}>
          <div className={styles.gridTitleSection}>
            <h2 className={styles.gridTitle}>Your Channels</h2>
            <span className={styles.channelCount}>
              {statistics.activeChannels} active, {statistics.totalChannels} total
            </span>
          </div>
          <button 
            className={`${styles.addChannelBtn} ${styles.secondary}`}
            onClick={() => setIsAddModalOpen(true)}
          >
            + Add Channel
          </button>
        </div>

        <div className={styles.channelGrid}>
          {sortedChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              tasks={tasks}
              onEdit={handleEditChannel}
              onToggleActive={handleToggleChannelActive}
              onDelete={handleDeleteChannel}
            />
          ))}
        </div>

        {/* Grid Statistics */}
        <div className={styles.gridStats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{statistics.totalChannels}</span>
            <span className={styles.statLabel}>Total Channels</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{statistics.activeChannels}</span>
            <span className={styles.statLabel}>Active Channels</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{statistics.totalTasks}</span>
            <span className={styles.statLabel}>Total Tasks</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{statistics.completedTasks}</span>
            <span className={styles.statLabel}>Completed Tasks</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      
      {/* Add Channel Modal - Always rendered outside conditional content */}
      <AddChannelModal
        isOpen={isAddModalOpen}
        onClose={() => {
          console.log('Closing modal');
          setIsAddModalOpen(false);
        }}
      />

      {/* Channel Settings Modal */}
      <ChannelSettings
        isOpen={isSettingsModalOpen}
        channel={selectedChannel}
        onClose={handleCloseSettings}
      />
    </>
  );
});