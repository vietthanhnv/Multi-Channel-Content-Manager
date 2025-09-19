import React from 'react';
import { AppProviderWithPersistence } from '../context';
import { useChannels, useTemplates, useSchedule, useUserSettings, useUI } from '../hooks';
import { Channel, ContentTemplate, Task } from '../types';

/**
 * Example component demonstrating how to use the state management system
 */
const StateManagementDemo: React.FC = () => {
  const { channels, addChannel, updateChannel, deleteChannel } = useChannels();
  const { templates, addTemplate } = useTemplates();
  const { currentWeek, addTask } = useSchedule();
  const { userSettings, updateUserSettings } = useUserSettings();
  const { activeView, setActiveView, isLoading, addError } = useUI();

  const handleAddChannel = () => {
    const newChannel: Channel = {
      id: `channel-${Date.now()}`,
      name: `Test Channel ${channels.length + 1}`,
      contentType: 'gaming',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Monday', 'Wednesday', 'Friday'],
        preferredTimes: ['10:00', '14:00'],
      },
      color: '#ef4444',
      createdAt: new Date(),
      isActive: true,
    };

    addChannel(newChannel);
  };

  const handleAddTemplate = () => {
    const newTemplate: ContentTemplate = {
      id: `template-${Date.now()}`,
      name: `Template ${templates.length + 1}`,
      contentType: 'video',
      estimatedHours: {
        planning: 2,
        production: 4,
        editing: 3,
        publishing: 1,
      },
      workflowSteps: ['Research', 'Script', 'Record', 'Edit', 'Publish'],
      channelIds: channels.map(c => c.id),
    };

    addTemplate(newTemplate);
  };

  const handleAddTask = () => {
    if (channels.length === 0) {
      addError('Please add a channel first');
      return;
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      channelId: channels[0].id,
      title: `Task ${currentWeek.tasks.length + 1}`,
      contentType: 'video',
      estimatedHours: 4,
      status: 'planned',
      scheduledStart: new Date(),
      scheduledEnd: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours later
    };

    addTask(newTask);
  };

  const handleUpdateCapacity = () => {
    updateUserSettings({ weeklyCapacityHours: userSettings.weeklyCapacityHours + 5 });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>State Management Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Current View: {activeView}</h2>
        <div>
          {(['dashboard', 'templates', 'calendar', 'analytics'] as const).map(view => (
            <button 
              key={view}
              onClick={() => setActiveView(view)}
              style={{ 
                margin: '5px', 
                padding: '5px 10px',
                backgroundColor: activeView === view ? '#007bff' : '#f8f9fa',
                color: activeView === view ? 'white' : 'black',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Channels ({channels.length})</h3>
          <button onClick={handleAddChannel} style={{ marginBottom: '10px' }}>
            Add Channel
          </button>
          {channels.map(channel => (
            <div key={channel.id} style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '5px 0',
              borderRadius: '4px'
            }}>
              <strong>{channel.name}</strong> ({channel.contentType})
              <br />
              <small>Active: {channel.isActive ? 'Yes' : 'No'}</small>
              <div style={{ marginTop: '5px' }}>
                <button 
                  onClick={() => updateChannel(channel.id, { isActive: !channel.isActive })}
                  style={{ marginRight: '5px', fontSize: '12px' }}
                >
                  Toggle Active
                </button>
                <button 
                  onClick={() => deleteChannel(channel.id)}
                  style={{ fontSize: '12px', color: 'red' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h3>Templates ({templates.length})</h3>
          <button onClick={handleAddTemplate} style={{ marginBottom: '10px' }}>
            Add Template
          </button>
          {templates.map(template => (
            <div key={template.id} style={{ 
              border: '1px solid #ccc', 
              padding: '10px', 
              margin: '5px 0',
              borderRadius: '4px'
            }}>
              <strong>{template.name}</strong> ({template.contentType})
              <br />
              <small>
                Total Hours: {
                  template.estimatedHours.planning + 
                  template.estimatedHours.production + 
                  template.estimatedHours.editing + 
                  template.estimatedHours.publishing
                }
              </small>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Current Week Schedule</h3>
        <p>
          Tasks: {currentWeek.tasks.length} | 
          Scheduled Hours: {currentWeek.totalScheduledHours} | 
          Capacity: {currentWeek.userCapacityHours} |
          Overloaded: {currentWeek.isOverloaded ? 'Yes' : 'No'}
        </p>
        <button onClick={handleAddTask} style={{ marginBottom: '10px' }}>
          Add Task
        </button>
        {currentWeek.tasks.map(task => (
          <div key={task.id} style={{ 
            border: '1px solid #ccc', 
            padding: '10px', 
            margin: '5px 0',
            borderRadius: '4px'
          }}>
            <strong>{task.title}</strong> ({task.status})
            <br />
            <small>
              {task.estimatedHours}h | {task.contentType} | 
              Channel: {channels.find(c => c.id === task.channelId)?.name || 'Unknown'}
            </small>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>User Settings</h3>
        <p>Weekly Capacity: {userSettings.weeklyCapacityHours} hours</p>
        <p>Working Days: {userSettings.workingDays.join(', ')}</p>
        <p>Working Hours: {userSettings.workingHours.start} - {userSettings.workingHours.end}</p>
        <button onClick={handleUpdateCapacity}>
          Increase Capacity by 5 hours
        </button>
      </div>

      {isLoading && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          background: '#007bff', 
          color: 'white', 
          padding: '10px',
          borderRadius: '4px'
        }}>
          Loading...
        </div>
      )}
    </div>
  );
};

/**
 * Example app with state management
 */
export const StateManagementExample: React.FC = () => {
  return (
    <AppProviderWithPersistence>
      <StateManagementDemo />
    </AppProviderWithPersistence>
  );
};