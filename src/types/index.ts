// Core data models for the Multi-Channel Content Manager

export interface Channel {
  id: string;
  name: string;
  contentType: 'gaming' | 'educational' | 'entertainment' | 'lifestyle' | 'other';
  postingSchedule: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    preferredDays: string[];
    preferredTimes: string[];
  };
  color: string; // For visual identification
  createdAt: Date;
  isActive: boolean;
}

export interface ContentTemplate {
  id: string;
  name: string;
  contentType: 'video' | 'short' | 'post';
  estimatedHours: {
    planning: number;
    production: number;
    editing: number;
    publishing: number;
  };
  workflowSteps: string[];
  channelIds: string[]; // Associated channels
}

export interface Task {
  id: string;
  channelId: string;
  templateId?: string;
  title: string;
  contentType: 'video' | 'short' | 'post';
  estimatedHours: number;
  status: 'planned' | 'in-progress' | 'completed' | 'overdue';
  scheduledStart: Date;
  scheduledEnd: Date;
  actualHours?: number;
  notes?: string;
}

export interface WeeklySchedule {
  weekStartDate: Date;
  tasks: Task[];
  totalScheduledHours: number;
  userCapacityHours: number;
  isOverloaded: boolean;
}

// Application state interface
export interface AppState {
  channels: Channel[];
  templates: ContentTemplate[];
  currentWeek: WeeklySchedule;
  selectedChannelId?: string;
  userSettings: {
    weeklyCapacityHours: number;
    workingDays: string[];
    workingHours: { start: string; end: string };
  };
  ui: {
    activeView: 'dashboard' | 'templates' | 'calendar' | 'analytics';
    isLoading: boolean;
    errors: string[];
  };
}

// Action types for state management
export type AppAction =
  | { type: 'ADD_CHANNEL'; payload: Channel }
  | { type: 'UPDATE_CHANNEL'; payload: { id: string; updates: Partial<Channel> } }
  | { type: 'DELETE_CHANNEL'; payload: string }
  | { type: 'ADD_TEMPLATE'; payload: ContentTemplate }
  | { type: 'UPDATE_TEMPLATE'; payload: { id: string; updates: Partial<ContentTemplate> } }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_CURRENT_WEEK'; payload: WeeklySchedule }
  | { type: 'SET_SELECTED_CHANNEL'; payload: string | undefined }
  | { type: 'UPDATE_USER_SETTINGS'; payload: Partial<AppState['userSettings']> }
  | { type: 'SET_ACTIVE_VIEW'; payload: AppState['ui']['activeView'] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' };

// Utility types
export type ContentType = 'video' | 'short' | 'post';
export type TaskStatus = 'planned' | 'in-progress' | 'completed' | 'overdue';
export type ChannelContentType = 'gaming' | 'educational' | 'entertainment' | 'lifestyle' | 'other';
export type PostingFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type AppView = 'dashboard' | 'templates' | 'calendar' | 'analytics';