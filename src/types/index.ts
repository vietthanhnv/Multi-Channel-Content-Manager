// Core data models for the Multi-Channel Content Manager

export interface Channel {
  id: string;
  name: string;
  contentType: string; // Can be predefined or custom content type
  postingSchedule: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    preferredDays: string[];
    preferredTimes: string[];
  };
  color: string; // For visual identification
  createdAt: Date;
  isActive: boolean;
  assignedTasks: ChannelTaskAssignment[]; // Task templates assigned to this channel
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
  category: 'content-creation' | 'production' | 'marketing' | 'admin' | 'other';
  workflowSteps: string[];
  createdAt: Date;
}

export interface ChannelTaskAssignment {
  templateId: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high';
}

export interface Task {
  id: string;
  channelId: string;
  templateId?: string;
  title: string;
  description?: string;
  estimatedHours: number;
  status: 'planned' | 'in-progress' | 'completed' | 'overdue';
  scheduledStart: Date;
  scheduledEnd: Date;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  actualHours?: number;
  notes?: string;
  priority: 'low' | 'medium' | 'high';
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
  taskTemplates: TaskTemplate[];
  currentWeek: WeeklySchedule;
  selectedChannelId?: string;
  userSettings: {
    weeklyCapacityHours: number;
    workingDays: string[];
    workingHours: { start: string; end: string };
    customContentTypes?: string[];
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
  | { type: 'ADD_TASK_TEMPLATE'; payload: TaskTemplate }
  | { type: 'UPDATE_TASK_TEMPLATE'; payload: { id: string; updates: Partial<TaskTemplate> } }
  | { type: 'DELETE_TASK_TEMPLATE'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'GENERATE_TASKS_FROM_TEMPLATES'; payload: { channelId: string } }
  | { type: 'SET_CURRENT_WEEK'; payload: WeeklySchedule }
  | { type: 'SET_SELECTED_CHANNEL'; payload: string | undefined }
  | { type: 'UPDATE_USER_SETTINGS'; payload: Partial<AppState['userSettings']> }
  | { type: 'SET_ACTIVE_VIEW'; payload: AppState['ui']['activeView'] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' };

// Utility types
export type TaskStatus = 'planned' | 'in-progress' | 'completed' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'content-creation' | 'production' | 'marketing' | 'admin' | 'other';
export type TimeSlot = 'morning' | 'afternoon' | 'evening';
export type ChannelContentType = string; // Can be predefined or custom content type
export type PostingFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type AppView = 'dashboard' | 'templates' | 'calendar' | 'analytics';