import React, { useState } from 'react';
import CalendarGrid from './CalendarGrid';
import { Task, Channel } from '../types';

const CalendarDemo: React.FC = () => {
  // Sample data for demonstration
  const [weekStartDate] = useState(new Date('2024-01-01')); // Monday
  
  const sampleChannels: Channel[] = [
    {
      id: 'channel1',
      name: 'Gaming Channel',
      contentType: 'gaming',
      postingSchedule: {
        frequency: 'weekly',
        preferredDays: ['Monday', 'Wednesday', 'Friday'],
        preferredTimes: ['10:00', '14:00'],
      },
      color: '#ef4444',
      createdAt: new Date(),
      isActive: true,
    },
    {
      id: 'channel2',
      name: 'Educational Content',
      contentType: 'educational',
      postingSchedule: {
        frequency: 'biweekly',
        preferredDays: ['Tuesday', 'Thursday'],
        preferredTimes: ['11:00', '15:00'],
      },
      color: '#3b82f6',
      createdAt: new Date(),
      isActive: true,
    },
  ];

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'task1',
      channelId: 'channel1',
      title: 'Gaming Video - Boss Fight Guide',
      contentType: 'video',
      estimatedHours: 3,
      status: 'planned',
      scheduledStart: new Date('2024-01-01T10:00:00'),
      scheduledEnd: new Date('2024-01-01T13:00:00'),
    },
    {
      id: 'task2',
      channelId: 'channel2',
      title: 'Math Tutorial - Calculus Basics',
      contentType: 'video',
      estimatedHours: 2,
      status: 'in-progress',
      scheduledStart: new Date('2024-01-02T11:00:00'),
      scheduledEnd: new Date('2024-01-02T13:00:00'),
    },
    {
      id: 'task3',
      channelId: 'channel1',
      title: 'Gaming Short - Quick Tips',
      contentType: 'short',
      estimatedHours: 1,
      status: 'planned',
      scheduledStart: new Date('2024-01-03T14:00:00'),
      scheduledEnd: new Date('2024-01-03T15:00:00'),
    },
    {
      id: 'task4',
      channelId: 'channel2',
      title: 'Science Experiment Demo',
      contentType: 'video',
      estimatedHours: 2.5,
      status: 'planned',
      scheduledStart: new Date('2024-01-04T09:00:00'),
      scheduledEnd: new Date('2024-01-04T11:30:00'),
    },
    // Add a conflicting task for demonstration
    {
      id: 'task5',
      channelId: 'channel1',
      title: 'Conflicting Task',
      contentType: 'post',
      estimatedHours: 1,
      status: 'planned',
      scheduledStart: new Date('2024-01-01T11:00:00'),
      scheduledEnd: new Date('2024-01-01T12:00:00'),
    },
  ]);

  const workingHours = { start: '09:00', end: '18:00' };
  const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const handleTaskDrop = (taskId: string, newStart: Date, newEnd: Date) => {
    console.log('Task dropped:', { taskId, newStart, newEnd });
    
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, scheduledStart: newStart, scheduledEnd: newEnd }
          : task
      )
    );
  };

  const getChannelColor = (channelId: string) => {
    const channel = sampleChannels.find(c => c.id === channelId);
    return channel?.color || '#6b7280';
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Calendar Grid Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Week of {weekStartDate.toLocaleDateString()}</h2>
        <p>Working Hours: {workingHours.start} - {workingHours.end}</p>
        <p>Working Days: {workingDays.join(', ')}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Channels:</h3>
        {sampleChannels.map(channel => (
          <div key={channel.id} style={{ marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                backgroundColor: channel.color,
                marginRight: '8px',
                borderRadius: '2px',
              }}
            ></span>
            <strong>{channel.name}</strong> ({channel.contentType})
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Tasks Summary:</h3>
        <ul>
          {tasks.map(task => (
            <li key={task.id} style={{ marginBottom: '4px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  backgroundColor: getChannelColor(task.channelId),
                  marginRight: '8px',
                  borderRadius: '2px',
                }}
              ></span>
              <strong>{task.title}</strong> - {task.estimatedHours}h 
              ({task.scheduledStart.toLocaleString()} - {task.scheduledEnd.toLocaleString()})
            </li>
          ))}
        </ul>
      </div>

      <div style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden' }}>
        <CalendarGrid
          weekStartDate={weekStartDate}
          tasks={tasks}
          workingHours={workingHours}
          workingDays={workingDays}
          onTaskDrop={handleTaskDrop}
        />
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ul>
          <li>The calendar shows a weekly view with hourly time slots</li>
          <li>Tasks are displayed in their scheduled time slots</li>
          <li>Working days are highlighted, non-working days are grayed out</li>
          <li>Conflicting tasks (overlapping times) are marked with a red background</li>
          <li>Empty working time slots show "Drop task here" on hover</li>
          <li>Drag and drop functionality will be implemented in the next subtask</li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarDemo;