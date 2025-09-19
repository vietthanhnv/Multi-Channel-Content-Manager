import React from 'react';
import { ChannelProgressBar } from './ChannelProgressBar';
import { WorkloadChart } from './WorkloadChart';
import { StatusIndicators } from './StatusIndicators';
import { useAppContext } from '../context/AppContext';
import styles from './ProgressTrackingDemo.module.css';

export const ProgressTrackingDemo: React.FC = () => {
  const { state } = useAppContext();
  const { channels } = state;

  return (
    <div className={styles.demoContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Progress Tracking & Analytics</h1>
        <p className={styles.subtitle}>
          Monitor your content creation progress across all channels
        </p>
      </div>

      <div className={styles.content}>
        {/* System Health Overview */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>System Health Overview</h2>
          <StatusIndicators />
        </section>

        {/* Workload Analysis */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Workload Analysis</h2>
          <WorkloadChart />
        </section>

        {/* Channel Progress */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Channel Progress</h2>
          <div className={styles.channelProgressGrid}>
            {channels.length > 0 ? (
              channels.map((channel) => (
                <ChannelProgressBar
                  key={channel.id}
                  channelId={channel.id}
                  channelName={channel.name}
                  channelColor={channel.color}
                  showDetails={true}
                />
              ))
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📊</div>
                <h3 className={styles.emptyTitle}>No Channels Yet</h3>
                <p className={styles.emptyText}>
                  Create your first channel to start tracking progress
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Compact View */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Compact Overview</h2>
          <div className={styles.compactGrid}>
            <div className={styles.compactItem}>
              <StatusIndicators layout="vertical" />
            </div>
            <div className={styles.compactItem}>
              <WorkloadChart showLegend={false} />
            </div>
          </div>
        </section>

        {/* Channel Summary Cards */}
        {channels.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Channel Summary</h2>
            <div className={styles.summaryGrid}>
              {channels.map((channel) => (
                <ChannelProgressBar
                  key={`summary-${channel.id}`}
                  channelId={channel.id}
                  channelName={channel.name}
                  channelColor={channel.color}
                  showDetails={false}
                  className={styles.summaryCard}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};