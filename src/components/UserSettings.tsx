import React, { useState, useEffect } from 'react';
import { useUserSettings } from '../hooks/useUserSettings';
import styles from './UserSettings.module.css';

interface UserSettingsProps {
  onClose?: () => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday', 
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export const UserSettings: React.FC<UserSettingsProps> = ({ onClose }) => {
  const { userSettings, updateUserSettings } = useUserSettings();
  
  const [formData, setFormData] = useState({
    weeklyCapacityHours: userSettings.weeklyCapacityHours,
    workingDays: [...userSettings.workingDays],
    workingHours: {
      start: userSettings.workingHours.start,
      end: userSettings.workingHours.end
    }
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const hasFormChanges = 
      formData.weeklyCapacityHours !== userSettings.weeklyCapacityHours ||
      JSON.stringify(formData.workingDays.sort()) !== JSON.stringify(userSettings.workingDays.sort()) ||
      formData.workingHours.start !== userSettings.workingHours.start ||
      formData.workingHours.end !== userSettings.workingHours.end;
    
    setHasChanges(hasFormChanges);
  }, [formData, userSettings]);

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(0, Math.min(168, parseInt(e.target.value) || 0)); // Max 168 hours per week
    setFormData(prev => ({ ...prev, weeklyCapacityHours: value }));
  };

  const handleWorkingDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const handleWorkingHoursChange = (field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    updateUserSettings(formData);
    setHasChanges(false);
    if (onClose) {
      onClose();
    }
  };

  const handleReset = () => {
    setFormData({
      weeklyCapacityHours: userSettings.weeklyCapacityHours,
      workingDays: [...userSettings.workingDays],
      workingHours: {
        start: userSettings.workingHours.start,
        end: userSettings.workingHours.end
      }
    });
    setHasChanges(false);
  };

  const calculateDailyHours = () => {
    if (formData.workingDays.length === 0) return 0;
    return Math.round((formData.weeklyCapacityHours / formData.workingDays.length) * 10) / 10;
  };

  const validateWorkingHours = () => {
    const start = new Date(`2000-01-01T${formData.workingHours.start}:00`);
    const end = new Date(`2000-01-01T${formData.workingHours.end}:00`);
    return end > start;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>User Settings</h2>
        {onClose && (
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h3>Weekly Capacity</h3>
          <div className={styles.inputGroup}>
            <label htmlFor="weeklyCapacity">
              Total hours per week:
            </label>
            <input
              id="weeklyCapacity"
              type="number"
              min="0"
              max="168"
              value={formData.weeklyCapacityHours}
              onChange={handleCapacityChange}
              className={styles.numberInput}
            />
            <span className={styles.hint}>
              Maximum 168 hours per week
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <h3>Working Days</h3>
          <div className={styles.checkboxGroup}>
            {DAYS_OF_WEEK.map(day => (
              <label key={day} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.workingDays.includes(day)}
                  onChange={() => handleWorkingDayToggle(day)}
                  className={styles.checkbox}
                />
                {day}
              </label>
            ))}
          </div>
          {formData.workingDays.length > 0 && (
            <div className={styles.calculation}>
              Average hours per working day: {calculateDailyHours()}
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h3>Working Hours</h3>
          <div className={styles.timeInputGroup}>
            <div className={styles.timeInput}>
              <label htmlFor="startTime">Start time:</label>
              <select
                id="startTime"
                value={formData.workingHours.start}
                onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                className={styles.timeSelect}
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
            <div className={styles.timeInput}>
              <label htmlFor="endTime">End time:</label>
              <select
                id="endTime"
                value={formData.workingHours.end}
                onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                className={styles.timeSelect}
              >
                {TIME_OPTIONS.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>
          {!validateWorkingHours() && (
            <div className={styles.error}>
              End time must be after start time
            </div>
          )}
        </section>
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className={styles.resetButton}
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || !validateWorkingHours() || formData.workingDays.length === 0}
          className={styles.saveButton}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};