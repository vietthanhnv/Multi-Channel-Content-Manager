// Application constants

// localStorage keys
export const STORAGE_KEYS = {
  CHANNELS: 'mcm_channels',
  TASK_TEMPLATES: 'mcm_task_templates',
  SCHEDULES: 'mcm_schedules',
  USER_SETTINGS: 'mcm_user_settings',
  APP_VERSION: 'mcm_app_version',
} as const;

// Application version for data migration
export const APP_VERSION = '1.0.0';

// Default user settings
export const DEFAULT_USER_SETTINGS = {
  weeklyCapacityHours: 40,
  workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  workingHours: { start: '09:00', end: '17:00' },
  customContentTypes: ['General'], // Start with one default type that users can modify
};

// Task category options
export const TASK_CATEGORIES = [
  { value: 'content-creation', label: 'Content Creation' },
  { value: 'production', label: 'Production' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'admin', label: 'Administration' },
  { value: 'other', label: 'Other' },
] as const;

// Task priority options
export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#6b7280' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
] as const;

// Time slot options
export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (9AM - 12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM - 5PM)' },
  { value: 'evening', label: 'Evening (5PM - 9PM)' },
] as const;

// Channel content type options (now fully custom - no predefined types)
// Content types are managed through user settings customContentTypes array

// Posting frequency options
export const POSTING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

// Task status options
export const TASK_STATUSES = [
  { value: 'planned', label: 'Planned', color: '#6b7280' },
  { value: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'completed', label: 'Completed', color: '#10b981' },
  { value: 'overdue', label: 'Overdue', color: '#ef4444' },
] as const;

// Days of the week
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// Default channel colors
export const CHANNEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#84cc16', // lime
] as const;