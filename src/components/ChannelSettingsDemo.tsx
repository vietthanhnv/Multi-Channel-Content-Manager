import React, { useState } from 'react';
import { ChannelSettings } from './ChannelSettings';
import { AppProvider } from '../context/AppContext';
import { Channel } from '../types';
import { CHANNEL_COLORS } from '../utils/constants';

// Sample channel for testing
const sampleChannel: Channel = {
  id: 'demo-channel-1',
  name: 'Demo Gaming Channel',
  contentType: 'gaming',
  postingSchedule: {
    frequency: 'weekly',
    preferredDays: ['Monday', 'Wednesday', 'Friday'],
    preferredTimes: ['18:00', '20:00'],
  },
  color: CHANNEL_COLORS[0],
  createdAt: new Date('2024-01-01'),
  isActive: true,
};

export const ChannelSettingsDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>(sampleChannel);

  const handleToggleActive = () => {
    setChannel(prev => ({ ...prev, isActive: !prev.isActive }));
  };

  return (
    <AppProvider>
      <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <h1>Channel Settings Demo</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <h2>Current Channel:</h2>
          <div style={{ 
            background: 'white', 
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem',
            border: `3px solid ${channel.color}`
          }}>
            <h3>{channel.name}</h3>
            <p><strong>Type:</strong> {channel.contentType}</p>
            <p><strong>Frequency:</strong> {channel.postingSchedule.frequency}</p>
            <p><strong>Days:</strong> {channel.postingSchedule.preferredDays.join(', ')}</p>
            <p><strong>Times:</strong> {channel.postingSchedule.preferredTimes.join(', ')}</p>
            <p><strong>Status:</strong> {channel.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setIsOpen(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Open Channel Settings
          </button>
          
          <button
            onClick={handleToggleActive}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: channel.isActive ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            {channel.isActive ? 'Deactivate' : 'Activate'} Channel
          </button>
        </div>

        <ChannelSettings
          isOpen={isOpen}
          channel={channel}
          onClose={() => setIsOpen(false)}
        />
      </div>
    </AppProvider>
  );
};