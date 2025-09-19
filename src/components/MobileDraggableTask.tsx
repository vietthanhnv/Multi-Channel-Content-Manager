import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../types';
import styles from './MobileDraggableTask.module.css';
import touchStyles from '../styles/touch.module.css';

interface MobileDraggableTaskProps {
  task: Task;
  onDragStart?: (task: Task) => void;
  onDragEnd?: (task: Task, newPosition?: { date: Date; timeSlot: string }) => void;
  onTaskClick?: (task: Task) => void;
  onTaskLongPress?: (task: Task) => void;
  className?: string;
  isDragging?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
}

const MobileDraggableTask: React.FC<MobileDraggableTaskProps> = ({
  task,
  onDragStart,
  onDragEnd,
  onTaskClick,
  onTaskLongPress,
  className = '',
  isDragging = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [dragOffset, setDragOffset] = useState<TouchPosition>({ x: 0, y: 0 });
  const [currentPosition, setCurrentPosition] = useState<TouchPosition>({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const taskRef = useRef<HTMLDivElement>(null);
  const dragStartPosition = useRef<TouchPosition>({ x: 0, y: 0 });
  const dragThreshold = 10; // Minimum distance to start drag
  const longPressDelay = 500; // Long press duration in ms

  // Get task color based on channel or status
  const getTaskColor = () => {
    // This would typically come from the channel color or task status
    const colors = {
      'video': '#3b82f6',
      'short': '#8b5cf6',
      'post': '#10b981',
    };
    return colors[task.contentType] || '#6b7280';
  };

  // Format duration for display
  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours}h`;
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = taskRef.current?.getBoundingClientRect();
    
    if (rect) {
      const offsetX = touch.clientX - rect.left;
      const offsetY = touch.clientY - rect.top;
      
      setDragOffset({ x: offsetX, y: offsetY });
      dragStartPosition.current = { x: touch.clientX, y: touch.clientY };
      setIsPressed(true);
      
      // Start long press timer
      const timer = setTimeout(() => {
        if (onTaskLongPress) {
          onTaskLongPress(task);
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }, longPressDelay);
      
      setLongPressTimer(timer);
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPressed) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartPosition.current.x;
    const deltaY = touch.clientY - dragStartPosition.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Clear long press timer if we start moving
    if (longPressTimer && distance > 5) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // Start dragging if we've moved beyond threshold
    if (distance > dragThreshold && !isDraggingState) {
      setIsDraggingState(true);
      if (onDragStart) {
        onDragStart(task);
      }
    }
    
    if (isDraggingState) {
      setCurrentPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y,
      });
    }
  };

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (isDraggingState) {
      // Handle drop logic here
      const touch = e.changedTouches[0];
      const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      
      // Find the closest time slot element
      const timeSlot = dropTarget?.closest('[data-time-slot]');
      if (timeSlot) {
        const date = timeSlot.getAttribute('data-date');
        const slot = timeSlot.getAttribute('data-time-slot');
        
        if (date && slot && onDragEnd) {
          onDragEnd(task, {
            date: new Date(date),
            timeSlot: slot,
          });
        }
      } else if (onDragEnd) {
        onDragEnd(task);
      }
      
      setIsDraggingState(false);
    } else if (isPressed && onTaskClick) {
      // Handle click if we didn't drag
      onTaskClick(task);
    }
    
    setIsPressed(false);
    setCurrentPosition({ x: 0, y: 0 });
  };

  // Handle mouse events for desktop compatibility
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = taskRef.current?.getBoundingClientRect();
    
    if (rect) {
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      setDragOffset({ x: offsetX, y: offsetY });
      dragStartPosition.current = { x: e.clientX, y: e.clientY };
      setIsPressed(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isPressed) return;
    
    const deltaX = e.clientX - dragStartPosition.current.x;
    const deltaY = e.clientY - dragStartPosition.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > dragThreshold && !isDraggingState) {
      setIsDraggingState(true);
      if (onDragStart) {
        onDragStart(task);
      }
    }
    
    if (isDraggingState) {
      setCurrentPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (isDraggingState) {
      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
      const timeSlot = dropTarget?.closest('[data-time-slot]');
      
      if (timeSlot) {
        const date = timeSlot.getAttribute('data-date');
        const slot = timeSlot.getAttribute('data-time-slot');
        
        if (date && slot && onDragEnd) {
          onDragEnd(task, {
            date: new Date(date),
            timeSlot: slot,
          });
        }
      } else if (onDragEnd) {
        onDragEnd(task);
      }
      
      setIsDraggingState(false);
    } else if (isPressed && onTaskClick) {
      onTaskClick(task);
    }
    
    setIsPressed(false);
    setCurrentPosition({ x: 0, y: 0 });
  };

  // Add mouse event listeners for desktop
  useEffect(() => {
    if (isPressed) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPressed, isDraggingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const taskStyle = isDraggingState ? {
    position: 'fixed' as const,
    left: currentPosition.x,
    top: currentPosition.y,
    zIndex: 1000,
    pointerEvents: 'none' as const,
    transform: 'scale(1.05)',
  } : {};

  return (
    <div
      ref={taskRef}
      className={`
        ${styles.mobileDraggableTask}
        ${touchStyles.mobileDraggable}
        ${isDraggingState ? styles.dragging : ''}
        ${isPressed ? styles.pressed : ''}
        ${className}
      `}
      style={{
        ...taskStyle,
        '--task-color': getTaskColor(),
      } as React.CSSProperties}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}, ${formatDuration(task.estimatedHours)}`}
      data-task-id={task.id}
    >
      <div className={styles.taskContent}>
        <div className={styles.taskHeader}>
          <div className={styles.taskTitle}>{task.title}</div>
          <div className={styles.dragHandle}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
        
        <div className={styles.taskMeta}>
          <span className={styles.taskDuration}>
            {formatDuration(task.estimatedHours)}
          </span>
          <span className={styles.taskType}>
            {task.contentType}
          </span>
        </div>
        
        {task.status !== 'planned' && (
          <div className={`${styles.statusBadge} ${styles[task.status]}`}>
            {task.status.replace('-', ' ')}
          </div>
        )}
      </div>
      
      {/* Visual feedback for touch */}
      <div className={styles.touchFeedback} />
    </div>
  );
};

export default MobileDraggableTask;