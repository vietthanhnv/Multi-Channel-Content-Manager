import React from 'react';
import { useUserSettings } from '../hooks/useUserSettings';
import { useAppContext } from '../context/AppContext';
import CalendarGrid from './CalendarGrid';
import { Task } from '../types';

interface CalendarWithSettingsProps {
  weekStartDate: Date;
  onTaskDrop?: (taskId: string, newStart: Date, newEnd: Date) => void;
  className?: string;
}

export const CalendarWithSettings: React.FC<CalendarWithSettingsProps> = ({
  weekStartDate,
  onTaskDrop,
  className,
}) => {
  const { state } = useAppContext();
  const { userSettings } = useUserSettings();

  return (
    <div className={className}>
      <CalendarGrid
        weekStartDate={weekStartDate}
        tasks={state.currentWeek.tasks}
        workingHours={userSettings.workingHours}
        workingDays={userSettings.workingDays}
        onTaskDrop={onTaskDrop}
      />
    </div>
  );
};