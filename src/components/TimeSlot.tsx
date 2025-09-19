import React from 'react';
import { Task, TimeSlot as TimeSlotType } from '../types';
import styles from './TimeSlot.module.css';

interface TimeSlotProps {
  date: Date;
  timeSlot: TimeSlotType;
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
    const slotEnd = new Date(date);
    
    // Set times based on time slot
    switch (timeSlot) {
      case 'morning':
        slotStart.setHours(9, 0, 0, 0);
        slotEnd.setHours(12, 0, 0, 0);
        break;
      case 'afternoon':
        slotStart.setHours(12, 0, 0, 0);
        slotEnd.setHours(17, 0, 0, 0);
        break;
      case 'evening':
        slotStart.setHours(17, 0, 0, 0);
        slotEnd.setHours(21, 0, 0, 0);
        break;
      default:
        slotStart.setHours(9, 0, 0, 0);
        slotEnd.setHours(17, 0, 0, 0);
    }
    
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
      
      // Use the slot end time as the task end time for simplicity
      onTaskDrop(taskData.id, slotStart, slotEnd);
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