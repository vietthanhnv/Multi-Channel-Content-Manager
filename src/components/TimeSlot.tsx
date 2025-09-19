import React from 'react';
import { Task } from '../types';
import styles from './TimeSlot.module.css';

interface TimeSlotProps {
  date: Date;
  timeSlot: string;
  tasks: Task[];
  isWorkingTime: boolean;
  onTaskDrop?: (taskId: string, newStart: Date, newEnd: Date) => void;
}

const TimeSlot: React.FC<TimeSlotProps> = ({
  date,
  timeSlot,
  tasks,
  isWorkingTime,
  onTaskDrop,
}) => {
  // Calculate the start and end times for this slot
  const getSlotTimes = () => {
    const slotStart = new Date(date);
    const [hours, minutes] = timeSlot.split(':').map(Number);
    slotStart.setHours(hours, minutes, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setHours(hours + 1, 0, 0, 0);
    
    return { slotStart, slotEnd };
  };

  // Handle drag over event
  const handleDragOver = (e: React.DragEvent) => {
    if (!isWorkingTime) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    if (!isWorkingTime || !onTaskDrop) return;
    
    e.preventDefault();
    
    try {
      const taskData = JSON.parse(e.dataTransfer.getData('application/json'));
      const { slotStart, slotEnd } = getSlotTimes();
      
      // Calculate new end time based on task duration
      const taskDuration = taskData.estimatedHours * 60 * 60 * 1000; // Convert hours to milliseconds
      const newEnd = new Date(slotStart.getTime() + taskDuration);
      
      onTaskDrop(taskData.id, slotStart, newEnd);
    } catch (error) {
      console.error('Error handling task drop:', error);
    }
  };

  // Handle drag enter for visual feedback
  const handleDragEnter = (e: React.DragEvent) => {
    if (!isWorkingTime) return;
    e.preventDefault();
  };

  // Check if there are conflicting tasks
  const hasConflicts = tasks.length > 1;

  // Get the primary task for display (first task if multiple)
  const primaryTask = tasks[0];

  return (
    <div
      className={`${styles.timeSlot} ${!isWorkingTime ? styles.nonWorkingTime : ''} ${hasConflicts ? styles.hasConflicts : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      data-testid={`time-slot-${date.toISOString().split('T')[0]}-${timeSlot}`}
    >
      {/* Task display */}
      {primaryTask && (
        <div 
          className={styles.taskPreview}
          style={{ 
            backgroundColor: primaryTask.channelId ? `var(--channel-${primaryTask.channelId}-color, #6b7280)` : '#6b7280',
            opacity: hasConflicts ? 0.8 : 1
          }}
        >
          <div className={styles.taskTitle}>
            {primaryTask.title}
          </div>
          <div className={styles.taskDuration}>
            {primaryTask.estimatedHours}h
          </div>
        </div>
      )}
      
      {/* Conflict indicator */}
      {hasConflicts && (
        <div className={styles.conflictIndicator}>
          <span className={styles.conflictCount}>
            {tasks.length} tasks
          </span>
        </div>
      )}
      
      {/* Drop zone indicator */}
      {isWorkingTime && !primaryTask && (
        <div className={styles.dropZone}>
          <span className={styles.dropHint}>Drop task here</span>
        </div>
      )}
    </div>
  );
};

export default TimeSlot;