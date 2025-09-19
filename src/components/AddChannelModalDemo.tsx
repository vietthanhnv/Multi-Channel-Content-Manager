import React from 'react';
import { AppProviderWithPersistence } from '../context/AppProviderWithPersistence';
import { ChannelGrid } from './ChannelGrid';
import { useAppContext } from '../context/AppContext';

const AddChannelModalDemoContent: React.FC = () => {
  const { state } = useAppContext();

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: '#111827' }}>
        Add Channel Modal Demo
      </h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#374151' }}>
          Instructions:
        </h2>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280' }}>
          <li>Click the "Add Channel" button to open the modal</li>
          <li>Fill in the channel name (required)</li>
          <li>Select content type and posting frequency</li>
          <li>Choose preferred days (for non-daily frequency)</li>
          <li>Add at least one preferred posting time</li>
          <li>Select a channel color</li>
          <li>Click "Create Channel" to add the channel</li>
        </ul>
      </div>

      <ChannelGrid
        channels={state.channels}
        tasks={state.currentWeek.tasks}
      />
    </div>
  );
};

export const AddChannelModalDemo: React.FC = () => {
  return (
    <AppProviderWithPersistence>
      <AddChannelModalDemoContent />
    </AppProviderWithPersistence>
  );
};