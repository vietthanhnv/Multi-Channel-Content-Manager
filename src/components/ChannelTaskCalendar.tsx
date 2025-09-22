import React, { useMemo, useCallback, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Task, Channel, TimeSlot as TimeSlotType } from '../types';
import { useAppContext } from '../context/AppContext';
import { DAYS_OF_WEEK, TIME_SLOTS } from '../utils/constants';
import styles from './ChannelTaskCalendar.module.css';

interface ChannelTaskCalendarProps {
  weekStartDate: Date;
  workingHours: { start: string; end: string };
  workingDays: string[];
  onTaskDrop?: (taskId: string, newStart: Date, newEnd: Date) => void;
}

interface DragItem {
  type: string;
  id: string;
  task: Task;
}

interface TaskBlockProps {
  task: Task;
  channel: Channel;
  isDragging?: boolean;
}

const TaskBlock: React.FC<TaskBlockProps> = ({ task, channel, isDragging = false }) => {
  const [{ isDragging: dragState }, drag] = useDrag({
    type: 'task',
    item: { type: 'task', id: task.id, task },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const actualIsDragging = isDragging || dragState;

  return (
    <div
      ref={drag}
      className={`${styles.taskBlock} ${actualIsDragging ? styles.dragging : ''}`}
      style={{
        backgroundColor: channel.color,
        opacity: actualIsDragging ? 0.5 : 1,
      }}
      data-task-id={task.id}
    >
      <div className={styles.taskTitle}>{task.title}</div>
      <div className={styles.taskDuration}>{task.estimatedHours}h</div>
      <div className={styles.taskPriority}>
        <span className={`${styles.priorityDot} ${styles[task.priority]}`} />
        {task.priority}
      </div>
    </div>
  );
};

interface ChannelSectionProps {
  channel: Channel;
  tasks: Task[];
}

const ChannelSection: React.FC<ChannelSectionProps> = ({ channel, tasks }) => {
  const unscheduledTasks = tasks.filter(task => !task.scheduledStart || task.status === 'planned');

  return (
    <div className={styles.channelSection}>
      <div className={styles.channelHeader} style={{ borderLeftColor: channel.color }}>
        <div className={styles.channelName}>{channel.name}</div>
        <div className={styles.channelMeta}>
          <span className={styles.taskCount}>{unscheduledTasks.length} tasks</span>
          <span className={styles.totalHours}>
            {unscheduledTasks.reduce((sum, task) => sum + task.estimatedHours, 0)}h total
          </span>
        </div>
      </div>
      <div className={styles.taskList}>
        {unscheduledTasks.map(task => (
          <TaskBlock key={task.id} task={task} channel={channel} />
        ))}
        {unscheduledTasks.length === 0 && (
          <div className={styles.emptyState}>
            <span>No unscheduled tasks</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface TimeSlotDropZoneProps {
  date: Date;
  timeSlot: TimeSlotType;
  tasks: Task[];
  isWorkingTime: boolean;
  onTaskDrop?: (taskId: string, newStart: Date, newEnd: Date) => void;
}

const TimeSlotDropZone: React.FC<TimeSlotDropZoneProps> = ({
  date,
  timeSlot,
  tasks,
  isWorkingTime,
  onTaskDrop,
}) => {
  const { state } = useAppContext();

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'task',
    drop: (item: DragItem) => {
      if (onTaskDrop) {
        const { slotStart, slotEnd } = getSlotTimes();
        onTaskDrop(item.id, slotStart, slotEnd);
      }
    },
    canDrop: () => isWorkingTime,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const getSlotTimes = () => {
    const slotStart = new Date(date);
    const slotEnd = new Date(date);
    
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
    }
    
    return { slotStart, slotEnd };
  };

  const scheduledTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduledStart);
    const isSameDay = taskDate.toDateString() === date.toDateString();
    const isSameTimeSlot = task.timeSlot === timeSlot;
    return isSameDay && isSameTimeSlot;
  });

  const getChannelForTask = (task: Task) => {
    return state.channels.find(channel => channel.id === task.channelId);
  };

  return (
    <div
      ref={drop}
      className={`${styles.timeSlotDropZone} ${!isWorkingTime ? styles.nonWorkingTime : ''} ${
        isOver && canDrop ? styles.dropActive : ''
      } ${scheduledTasks.length > 1 ? styles.hasConflicts : ''}`}
      data-testid={`time-slot-${date.toISOString().split('T')[0]}-${timeSlot}`}
    >
      {scheduledTasks.map(task => {
        const channel = getChannelForTask(task);
        return channel ? (
          <TaskBlock key={task.id} task={task} channel={channel} />
        ) : null;
      })}
      
      {scheduledTasks.length === 0 && isWorkingTime && (
        <div className={`${styles.dropHint} ${isOver && canDrop ? styles.active : ''}`}>
          Drop task here
        </div>
      )}
      
      {scheduledTasks.length > 1 && (
        <div className={styles.conflictIndicator}>
          {scheduledTasks.length} tasks scheduled
        </div>
      )}
    </div>
  );
};

const ChannelTaskCalendar: React.FC<ChannelTaskCalendarProps> = ({
  weekStartDate,
  workingHours,
  workingDays,
  onTaskDrop,
}) => {
  const { state } = useAppContext();

  // Generate week dates
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

  // Check if a day is a working day
  const isWorkingDay = useCallback((date: Date) => {
    const dayName = DAYS_OF_WEEK[date.getDay()];
    return workingDays.includes(dayName);
  }, [workingDays]);

  // Group tasks by channel
  const tasksByChannel = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    
    state.channels.forEach(channel => {
      const channelTasks = state.currentWeek.tasks.filter(task => task.channelId === channel.id);
      grouped.set(channel.id, channelTasks);
    });
    
    return grouped;
  }, [state.channels, state.currentWeek.tasks]);

  return (
    <div className={styles.channelTaskCalendar}>
      <div className={styles.calendarLayout}>
        {/* Left sidebar with channel tasks */}
        <div className={styles.channelSidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Task Library</h3>
            <p>Drag tasks to schedule them</p>
          </div>
          <div className={styles.channelList}>
            {state.channels.map(channel => (
              <ChannelSection
                key={channel.id}
                channel={channel}
                tasks={tasksByChannel.get(channel.id) || []}
              />
            ))}
            {state.channels.length === 0 && (
              <div className={styles.emptyChannels}>
                <p>No channels created yet</p>
                <p>Create a channel to start adding tasks</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side with calendar grid */}
        <div className={styles.calendarGrid}>
          {/* Header with days */}
          <div className={styles.calendarHeader}>
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
            {TIME_SLOTS.map((timeSlot) => (
              <div key={timeSlot.value} className={styles.timeRow}>
                {/* Time label */}
                <div className={styles.timeLabel}>
                  {timeSlot.label}
                </div>
                
                {/* Time slots for each day */}
                {weekDates.map((date, dayIndex) => {
                  const isWorking = isWorkingDay(date);
                  
                  return (
                    <TimeSlotDropZone
                      key={`${dayIndex}-${timeSlot.value}`}
                      date={date}
                      timeSlot={timeSlot.value as TimeSlotType}
                      tasks={state.currentWeek.tasks}
                      isWorkingTime={isWorking}
                      onTaskDrop={onTaskDrop}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelTaskCalendar;