import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { DAYS_OF_WEEK } from '../utils/constants';
import { useKeyboardNavigation, useAccessibleDragDrop, useScreenReaderAnnouncement } from '../hooks/useKeyboardNavigation';
import styles from './CalendarGrid.module.css';
import accessibilityStyles from '../styles/accessibility.module.css';

interface AccessibleCalendarGridProps {
  weekStartDate: Date;
  tasks: Task[];
  workingHours: { start: string; end: string };
  workingDays: string[];
  onTaskDrop?: (taskId: string, newStart: Date, newEnd: Date) => void;
  onTaskSelect?: (task: Task) => void;
  onTimeSlotSelect?: (date: Date, timeSlot: string) => void;
}

interface CalendarCell {
  date: Date;
  timeSlot: string;
  tasks: Task[];
  isWorkingTime: boolean;
  cellId: string;
}

const AccessibleCalendarGrid: React.FC<AccessibleCalendarGridProps> = ({
  weekStartDate,
  tasks,
  workingHours,
  workingDays,
  onTaskDrop,
  onTaskSelect,
  onTimeSlotSelect,
}) => {
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  const { draggedItem, dropTarget, startDrag, endDrag, setDropTarget, announce } = useAccessibleDragDrop();
  const { announce: announceGeneral } = useScreenReaderAnnouncement();

  // Generate calendar cells
  const generateCalendarCells = useCallback((): CalendarCell[] => {
    const cells: CalendarCell[] = [];
    const startHour = parseInt(workingHours.start.split(':')[0]);
    const endHour = parseInt(workingHours.end.split(':')[0]);
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + dayOffset);
      const dayName = DAYS_OF_WEEK[date.getDay()];
      const isWorkingDay = workingDays.includes(dayName);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const cellId = `${date.toISOString().split('T')[0]}-${timeSlot}`;
        
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        const cellTasks = tasks.filter(task => {
          const taskStart = new Date(task.scheduledStart);
          const taskEnd = new Date(task.scheduledEnd);
          return taskStart < slotEnd && taskEnd > slotStart;
        });

        cells.push({
          date,
          timeSlot,
          tasks: cellTasks,
          isWorkingTime: isWorkingDay,
          cellId,
        });
      }
    }
    
    return cells;
  }, [weekStartDate, workingHours, workingDays, tasks]);

  const calendarCells = generateCalendarCells();
  const timeSlots = Array.from(new Set(calendarCells.map(cell => cell.timeSlot))).sort();
  const weekDates = Array.from(new Set(calendarCells.map(cell => cell.date.toDateString())))
    .map(dateStr => new Date(dateStr))
    .sort((a, b) => a.getTime() - b.getTime());

  // Keyboard navigation for grid
  const { elementRef: gridKeyboardRef } = useKeyboardNavigation({
    onArrowUp: () => navigateGrid('up'),
    onArrowDown: () => navigateGrid('down'),
    onArrowLeft: () => navigateGrid('left'),
    onArrowRight: () => navigateGrid('right'),
    onEnter: () => handleCellActivation(),
    onSpace: () => handleCellActivation(),
    onEscape: () => handleEscape(),
    onHome: () => navigateToFirstCell(),
    onEnd: () => navigateToLastCell(),
    preventDefault: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Home', 'End'],
  });

  const navigateGrid = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!focusedCell) {
      setFocusedCell(calendarCells[0]?.cellId || null);
      return;
    }

    const currentIndex = calendarCells.findIndex(cell => cell.cellId === focusedCell);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    const daysCount = 7;
    const hoursCount = timeSlots.length;

    switch (direction) {
      case 'up':
        newIndex = currentIndex - daysCount;
        if (newIndex < 0) newIndex = currentIndex + (hoursCount - 1) * daysCount;
        break;
      case 'down':
        newIndex = currentIndex + daysCount;
        if (newIndex >= calendarCells.length) newIndex = currentIndex - (hoursCount - 1) * daysCount;
        break;
      case 'left':
        newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = calendarCells.length - 1;
        break;
      case 'right':
        newIndex = currentIndex + 1;
        if (newIndex >= calendarCells.length) newIndex = 0;
        break;
    }

    const newCell = calendarCells[newIndex];
    if (newCell) {
      setFocusedCell(newCell.cellId);
      announceCell(newCell);
    }
  }, [focusedCell, calendarCells, timeSlots.length]);

  const navigateToFirstCell = useCallback(() => {
    const firstCell = calendarCells[0];
    if (firstCell) {
      setFocusedCell(firstCell.cellId);
      announceCell(firstCell);
    }
  }, [calendarCells]);

  const navigateToLastCell = useCallback(() => {
    const lastCell = calendarCells[calendarCells.length - 1];
    if (lastCell) {
      setFocusedCell(lastCell.cellId);
      announceCell(lastCell);
    }
  }, [calendarCells]);

  const announceCell = useCallback((cell: CalendarCell) => {
    const dayName = DAYS_OF_WEEK[cell.date.getDay()];
    const dateStr = cell.date.toLocaleDateString();
    const taskCount = cell.tasks.length;
    const workingStatus = cell.isWorkingTime ? 'working time' : 'non-working time';
    
    let announcement = `${dayName}, ${dateStr}, ${cell.timeSlot}, ${workingStatus}`;
    
    if (taskCount > 0) {
      announcement += `, ${taskCount} task${taskCount > 1 ? 's' : ''}`;
      if (taskCount === 1) {
        announcement += `: ${cell.tasks[0].title}`;
      }
    } else {
      announcement += ', empty';
    }

    if (draggedItem) {
      announcement += ', drop zone';
    }

    announceGeneral(announcement, 'polite');
  }, [draggedItem, announceGeneral]);

  const handleCellActivation = useCallback(() => {
    if (!focusedCell) return;

    const cell = calendarCells.find(c => c.cellId === focusedCell);
    if (!cell) return;

    if (draggedItem) {
      // Handle drop
      const task = tasks.find(t => t.id === draggedItem);
      if (task && onTaskDrop) {
        const newStart = new Date(cell.date);
        const [hours] = cell.timeSlot.split(':').map(Number);
        newStart.setHours(hours, 0, 0, 0);
        
        const newEnd = new Date(newStart);
        newEnd.setHours(newStart.getHours() + task.estimatedHours);
        
        onTaskDrop(task.id, newStart, newEnd);
        endDrag(true, task.title, `${DAYS_OF_WEEK[cell.date.getDay()]} ${cell.timeSlot}`);
      }
    } else if (cell.tasks.length > 0) {
      // Select first task in cell
      const task = cell.tasks[0];
      setSelectedTask(task.id);
      if (onTaskSelect) {
        onTaskSelect(task);
      }
      announceGeneral(`Selected task: ${task.title}`, 'assertive');
    } else {
      // Select empty time slot
      setSelectedCell(cell.cellId);
      if (onTimeSlotSelect) {
        onTimeSlotSelect(cell.date, cell.timeSlot);
      }
      announceGeneral(`Selected time slot: ${DAYS_OF_WEEK[cell.date.getDay()]} ${cell.timeSlot}`, 'assertive');
    }
  }, [focusedCell, calendarCells, draggedItem, tasks, onTaskDrop, onTaskSelect, onTimeSlotSelect, endDrag, announceGeneral]);

  const handleEscape = useCallback(() => {
    if (draggedItem) {
      const task = tasks.find(t => t.id === draggedItem);
      endDrag(false, task?.title || 'Task');
    } else {
      setSelectedCell(null);
      setSelectedTask(null);
      announceGeneral('Selection cleared', 'polite');
    }
  }, [draggedItem, tasks, endDrag, announceGeneral]);

  const handleTaskKeyDown = useCallback((event: React.KeyboardEvent, task: Task) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      startDrag(task.id, task.title);
    }
  }, [startDrag]);

  // Focus management
  useEffect(() => {
    if (focusedCell) {
      const cellElement = cellRefs.current.get(focusedCell);
      if (cellElement) {
        cellElement.focus();
      }
    }
  }, [focusedCell]);

  // Set initial focus
  useEffect(() => {
    if (calendarCells.length > 0 && !focusedCell) {
      setFocusedCell(calendarCells[0].cellId);
    }
  }, [calendarCells, focusedCell]);

  const formatCellLabel = (cell: CalendarCell) => {
    const dayName = DAYS_OF_WEEK[cell.date.getDay()];
    const dateStr = cell.date.toLocaleDateString();
    const taskCount = cell.tasks.length;
    const workingStatus = cell.isWorkingTime ? 'working time' : 'non-working time';
    
    let label = `${dayName}, ${dateStr}, ${cell.timeSlot}, ${workingStatus}`;
    
    if (taskCount > 0) {
      label += `, ${taskCount} task${taskCount > 1 ? 's' : ''}`;
    } else {
      label += ', empty';
    }

    return label;
  };

  return (
    <div
      ref={(el) => {
        gridRef.current = el;
        gridKeyboardRef.current = el;
      }}
      className={`${styles.calendarGrid} ${accessibilityStyles.accessibleCalendarGrid}`}
      role="grid"
      aria-label="Weekly calendar schedule"
      tabIndex={0}
    >
      {/* Header with days */}
      <div className={styles.header} role="row">
        <div className={styles.timeColumn} role="columnheader" aria-label="Time">
          Time
        </div>
        {weekDates.map((date, index) => (
          <div 
            key={index} 
            className={`${styles.dayHeader} ${!workingDays.includes(DAYS_OF_WEEK[date.getDay()]) ? styles.nonWorkingDay : ''}`}
            role="columnheader"
            aria-label={`${DAYS_OF_WEEK[date.getDay()]}, ${date.toLocaleDateString()}`}
          >
            <div className={styles.dayName}>
              {DAYS_OF_WEEK[date.getDay()].substring(0, 3)}
            </div>
            <div className={styles.dayDate}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots grid */}
      <div className={styles.gridBody}>
        {timeSlots.map((timeSlot) => (
          <div key={timeSlot} className={styles.timeRow} role="row">
            {/* Time label */}
            <div 
              className={styles.timeLabel}
              role="rowheader"
              aria-label={`${timeSlot}`}
            >
              {timeSlot}
            </div>
            
            {/* Time slots for each day */}
            {weekDates.map((date, dayIndex) => {
              const cellId = `${date.toISOString().split('T')[0]}-${timeSlot}`;
              const cell = calendarCells.find(c => c.cellId === cellId);
              
              if (!cell) return null;

              const isFocused = focusedCell === cellId;
              const isSelected = selectedCell === cellId;
              const isDropTarget = dropTarget === cellId;

              return (
                <div
                  key={cellId}
                  ref={(el) => {
                    if (el) {
                      cellRefs.current.set(cellId, el);
                    } else {
                      cellRefs.current.delete(cellId);
                    }
                  }}
                  className={`
                    ${styles.timeSlot}
                    ${accessibilityStyles.accessibleCalendarCell}
                    ${!cell.isWorkingTime ? styles.nonWorkingTime : ''}
                    ${cell.tasks.length > 1 ? styles.hasConflicts : ''}
                  `}
                  role="gridcell"
                  tabIndex={isFocused ? 0 : -1}
                  aria-label={formatCellLabel(cell)}
                  aria-selected={isSelected}
                  aria-busy={cell.tasks.length > 0}
                  aria-dropeffect={draggedItem ? (cell.isWorkingTime ? 'move' : 'none') : 'none'}
                  data-date={cell.date.toISOString()}
                  data-time-slot={timeSlot}
                  onFocus={() => setFocusedCell(cellId)}
                  onClick={() => {
                    setFocusedCell(cellId);
                    handleCellActivation();
                  }}
                  onMouseEnter={() => {
                    if (draggedItem) {
                      setDropTarget(cellId);
                    }
                  }}
                  onMouseLeave={() => {
                    if (draggedItem) {
                      setDropTarget(null);
                    }
                  }}
                >
                  {/* Tasks in this time slot */}
                  {cell.tasks.map((task, taskIndex) => (
                    <div
                      key={task.id}
                      className={`
                        ${styles.taskPreview}
                        ${accessibilityStyles.accessibleTouchTarget}
                      `}
                      style={{ '--task-color': '#6b7280' } as React.CSSProperties}
                      role="button"
                      tabIndex={0}
                      aria-label={`Task: ${task.title}, ${task.estimatedHours} hours, ${task.contentType}`}
                      aria-grabbed={draggedItem === task.id}
                      aria-describedby={`task-${task.id}-description`}
                      onKeyDown={(e) => handleTaskKeyDown(e, task)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTaskSelect) {
                          onTaskSelect(task);
                        }
                      }}
                    >
                      <div className={styles.taskTitle}>{task.title}</div>
                      <div className={styles.taskDuration}>
                        {task.estimatedHours < 1 
                          ? `${Math.round(task.estimatedHours * 60)}m`
                          : `${task.estimatedHours}h`
                        }
                      </div>
                      <div 
                        id={`task-${task.id}-description`}
                        className={accessibilityStyles.srOnly}
                      >
                        {task.contentType} content for channel. 
                        Status: {task.status}. 
                        Press Enter or Space to start dragging.
                      </div>
                    </div>
                  ))}

                  {/* Conflict indicator */}
                  {cell.tasks.length > 1 && (
                    <div 
                      className={styles.conflictIndicator}
                      aria-label={`${cell.tasks.length} overlapping tasks`}
                    >
                      <span className={styles.conflictCount}>
                        {cell.tasks.length}
                      </span>
                    </div>
                  )}

                  {/* Drop zone hint */}
                  {cell.tasks.length === 0 && (
                    <div className={styles.dropZone}>
                      <div className={styles.dropHint}>
                        {draggedItem ? 'Drop here' : 'Empty'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Instructions for screen readers */}
      <div className={accessibilityStyles.srOnly}>
        <p>
          Calendar grid navigation: Use arrow keys to move between time slots. 
          Press Enter or Space to select a time slot or task. 
          To drag a task, focus on it and press Enter or Space, then navigate to a drop zone and press Enter or Space again.
          Press Escape to cancel drag operation or clear selection.
          Press Home to go to first time slot, End to go to last time slot.
        </p>
      </div>
    </div>
  );
};

export default AccessibleCalendarGrid;