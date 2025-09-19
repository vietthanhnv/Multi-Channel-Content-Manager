import React, { useMemo, useCallback } from 'react';
import { Task } from '../types';
import { DAYS_OF_WEEK } from '../utils/constants';
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
  // Memoized time slots generation
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startHour = parseInt(workingHours.start.split(':')[0]);
    const endHour = parseInt(workingHours.end.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    return slots;
  }, [workingHours.start, workingHours.end]);

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
        const slotKey = `${dayIndex}-${timeSlot}`;
        const slotStart = new Date(date);
        const [hours, minutes] = timeSlot.split(':').map(Number);
        slotStart.setHours(hours, minutes, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hours + 1, 0, 0, 0);

        const slotTasks = tasks.filter(task => {
          const taskStart = new Date(task.scheduledStart);
          const taskEnd = new Date(task.scheduledEnd);
          
          // Check if task overlaps with this time slot
          return taskStart < slotEnd && taskEnd > slotStart;
        });
        
        taskMap.set(slotKey, slotTasks);
      });
    });
    
    return taskMap;
  }, [weekDates, timeSlots, tasks]);

  // Optimized task getter
  const getTasksForSlot = useCallback((dayIndex: number, timeSlot: string) => {
    const slotKey = `${dayIndex}-${timeSlot}`;
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
          <div key={timeSlot} className={styles.timeRow}>
            {/* Time label */}
            <div className={styles.timeLabel}>
              {timeSlot}
            </div>
            
            {/* Time slots for each day */}
            {weekDates.map((date, dayIndex) => {
              const slotTasks = getTasksForSlot(dayIndex, timeSlot);
              const isWorking = isWorkingDay(date);
              
              return (
                <TimeSlot
                  key={`${dayIndex}-${timeSlot}`}
                  date={date}
                  timeSlot={timeSlot}
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