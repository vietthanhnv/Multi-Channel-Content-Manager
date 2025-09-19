import React, { useMemo, useCallback } from 'react';
import { Task, TimeSlot as TimeSlotType } from '../types';
import { DAYS_OF_WEEK, TIME_SLOTS } from '../utils/constants';
import TimeSlot from './TimeSlot';
import styles from './CalendarGrid.module.css';

interface CalendarGridProps {
  weekStartDate: Date;
  tasks: Task[];
  workingHours: { start: string; end: string };
  workingDays: string[];
  onTaskDrop?: (taskId: string, newStart: Date, newEnd: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = React.memo(({
  weekStartDate,
  tasks,
  workingHours,
  workingDays,
  onTaskDrop,
}) => {
  // Use predefined time slots (morning, afternoon, evening)
  const timeSlots = useMemo(() => {
    return TIME_SLOTS.map(slot => ({
      value: slot.value as TimeSlotType,
      label: slot.label,
    }));
  }, []);

  // Memoized week dates generation
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const startDate = new Date(weekStartDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  }, [weekStartDate]);

  // Memoized working day checker
  const isWorkingDay = useCallback((date: Date) => {
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return workingDays.includes(dayName);
  }, [workingDays]);

  // Memoized task lookup for performance
  const tasksBySlot = useMemo(() => {
    const taskMap = new Map<string, Task[]>();
    
    weekDates.forEach((date, dayIndex) => {
      timeSlots.forEach(timeSlot => {
        const slotKey = `${dayIndex}-${timeSlot.value}`;
        
        const slotTasks = tasks.filter(task => {
          const taskDate = new Date(task.scheduledStart);
          const isSameDay = taskDate.toDateString() === date.toDateString();
          const isSameTimeSlot = task.timeSlot === timeSlot.value;
          
          return isSameDay && isSameTimeSlot;
        });
        
        taskMap.set(slotKey, slotTasks);
      });
    });
    
    return taskMap;
  }, [weekDates, timeSlots, tasks]);

  // Optimized task getter
  const getTasksForSlot = useCallback((dayIndex: number, timeSlotValue: TimeSlotType) => {
    const slotKey = `${dayIndex}-${timeSlotValue}`;
    return tasksBySlot.get(slotKey) || [];
  }, [tasksBySlot]);

  return (
    <div className={styles.calendarGrid}>
      {/* Header with days */}
      <div className={styles.header}>
        <div className={styles.timeColumn}></div>
        {weekDates.map((date, index) => (
          <div 
            key={index} 
            className={`${styles.dayHeader} ${!isWorkingDay(date) ? styles.nonWorkingDay : ''}`}
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
          <div key={timeSlot.value} className={styles.timeRow}>
            {/* Time label */}
            <div className={styles.timeLabel}>
              {timeSlot.label}
            </div>
            
            {/* Time slots for each day */}
            {weekDates.map((date, dayIndex) => {
              const slotTasks = getTasksForSlot(dayIndex, timeSlot.value);
              const isWorking = isWorkingDay(date);
              
              return (
                <TimeSlot
                  key={`${dayIndex}-${timeSlot.value}`}
                  date={date}
                  timeSlot={timeSlot.value}
                  tasks={slotTasks}
                  isWorkingTime={isWorking}
                  onTaskDrop={onTaskDrop}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

export default CalendarGrid;