// Application constants

// localStorage keys
export const STORAGE_KEYS = {
  CHANNELS: 'mcm_channels',
  TEMPLATES: 'mcm_templates',
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
};

// Content type options
export const CONTENT_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'short', label: 'Short' },
  { value: 'post', label: 'Post' },
] as const;

// Channel content type options
export const CHANNEL_CONTENT_TYPES = [
  { value: 'gaming', label: 'Gaming' },
  { value: 'educational', label: 'Educational' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'other', label: 'Other' },
] as const;

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