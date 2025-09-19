import React, { useState } from 'react';
import { ChannelGrid } from './ChannelGrid';
import { Channel, Task } from '../types';
import { CHANNEL_COLORS } from '../utils/constants';
import { AppProvider } from '../context/AppContext';

// Sample data for demonstration
const sampleChannels: Channel[] = [
  {
    id: '1',
    name: 'Gaming Adventures',
    contentType: 'gaming',
    postingSchedule: {
      frequency: 'weekly',
      preferredDays: ['Monday', 'Wednesday', 'Friday'],
      preferredTimes: ['18:00', '20:00'],
    },
    color: CHANNEL_COLORS[0],
    createdAt: new Date('2024-01-01'),
    isActive: true,
  },
  {
    id: '2',
    name: 'Tech Tutorials',
    contentType: 'educational',
    postingSchedule: {
      frequency: 'biweekly',
      preferredDays: ['Tuesday', 'Thursday'],
      preferredTimes: ['14:00'],
    },
    color: CHANNEL_COLORS[1],
    createdAt: new Date('2024-01-15'),
    isActive: true,
  },
  {
    id: '3',
    name: 'Lifestyle Vlogs',
    contentType: 'lifestyle',
    postingSchedule: {
      frequency: 'daily',
      preferredDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      preferredTimes: ['12:00'],
    },
    color: CHANNEL_COLORS[2],
    createdAt: new Date('2024-02-01'),
    isActive: false,
  },
];

const sampleTasks: Task[] = [
  {
    id: '1',
    channelId: '1',
    title: 'New Game Review',
    contentType: 'video',
    estimatedHours: 6,
    status: 'completed',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
  {
    id: '2',
    channelId: '1',
    title: 'Gaming Tips Short',
    contentType: 'short',
    estimatedHours: 2,
    status: 'in-progress',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
  {
    id: '3',
    channelId: '2',
    title: 'React Tutorial',
    contentType: 'video',
    estimatedHours: 8,
    status: 'planned',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
  {
    id: '4',
    channelId: '2',
    title: 'JavaScript Basics',
    contentType: 'video',
    estimatedHours: 5,
    status: 'overdue',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
  {
    id: '5',
    channelId: '3',
    title: 'Morning Routine',
    contentType: 'video',
    estimatedHours: 3,
    status: 'completed',
    scheduledStart: new Date(),
    scheduledEnd: new Date(),
  },
];

export const ChannelPortfolioDemo: React.FC = () => {
  const handleEditChannel = (channel: Channel) => {
    console.log('Edit channel:', channel.name);
  };

  return (
    <AppProvider initialState={{
      channels: sampleChannels,
      templates: [],
      currentWeek: {
        weekStartDate: new Date(),
        tasks: sampleTasks,
        totalScheduledHours: 0,
        userCapacityHours: 40,
        isOverloaded: false,
      },
      selectedChannelId: undefined,
      userSettings: {
        weeklyCapacityHours: 40,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: { start: '09:00', end: '17:00' },
      },
      ui: {
        activeView: 'dashboard',
        isLoading: false,
        errors: [],
      },
    }}>
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <ChannelGrid
          onEditChannel={handleEditChannel}
        />
      </div>
    </AppProvider>
  );
};