import React, { useState, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { AppProviderWithPersistence } from './context/AppProviderWithPersistence';
import { useAppContext } from './context/AppContext';
import { ChannelGrid } from './components/ChannelGrid';
import { TaskTemplateLibrary } from './components/TaskTemplateLibrary';
import { TaskTemplateEditor } from './components/TaskTemplateEditor';
import CalendarGrid from './components/CalendarGrid';
import ChannelTaskCalendar from './components/ChannelTaskCalendar';
import { AddTaskModal } from './components/AddTaskModal';
import { ProgressTrackingDemo } from './components/ProgressTrackingDemo';
import { UserSettings } from './components/UserSettings';
import NotificationProvider, { NotificationSystem } from './components/NotificationSystem';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/LoadingSpinner';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { TaskTemplate } from './types';
import './styles/App.css';

// Detect touch device for drag-and-drop backend
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

interface AppContentProps {}

const AppContent: React.FC<AppContentProps> = React.memo(() => {
  const { state, dispatch } = useAppContext();
  const [activeView, setActiveView] = useState<'dashboard' | 'templates' | 'calendar' | 'analytics' | 'settings'>('dashboard');
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // Performance monitoring
  const { metrics } = usePerformanceMonitor('AppContent', { 
    logToConsole: import.meta.env.DEV,
    threshold: 16 
  });

  // Navigation handlers
  const handleNavigate = useCallback((view: typeof activeView) => {
    setActiveView(view);
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, [dispatch]);

  // Template management handlers
  const handleEditTemplate = useCallback((template: TaskTemplate) => {
    setEditingTemplate(template);
    setIsTemplateEditorOpen(true);
  }, []);

  const handleCreateTemplate = useCallback(() => {
    setEditingTemplate(null);
    setIsTemplateEditorOpen(true);
  }, []);

  const handleCloseTemplateEditor = useCallback(() => {
    setIsTemplateEditorOpen(false);
    setEditingTemplate(null);
  }, []);

  // Task management handlers
  const handleCreateTask = useCallback(() => {
    setIsAddTaskModalOpen(true);
  }, []);

  const handleCloseAddTaskModal = useCallback(() => {
    setIsAddTaskModalOpen(false);
  }, []);

  // Calendar task drop handler
  const handleTaskDrop = useCallback((taskId: string, newStart: Date, newEnd: Date) => {
    // Determine time slot based on the start time
    const hour = newStart.getHours();
    let timeSlot: 'morning' | 'afternoon' | 'evening' = 'morning';
    
    if (hour >= 17) {
      timeSlot = 'evening';
    } else if (hour >= 12) {
      timeSlot = 'afternoon';
    } else {
      timeSlot = 'morning';
    }

    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: taskId,
        updates: {
          scheduledStart: newStart,
          scheduledEnd: newEnd,
          timeSlot,
        },
      },
    });
  }, [dispatch]);

  // Memoized current week start date
  const currentWeekStart = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(now.setDate(diff));
  }, []);

  // Render active view content
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="view-content">
            <div className="view-header">
              <h2>Channel Portfolio</h2>
              <p>Manage your channels and get an overview of your content strategy</p>
            </div>
            <ChannelGrid />
          </div>
        );

      case 'templates':
        return (
          <div className="view-content">
            <div className="view-header">
              <h2>Task Templates</h2>
              <p>Define reusable work components for your YouTube channel workflow</p>
            </div>
            <TaskTemplateLibrary
              onEditTemplate={handleEditTemplate}
              onCreateTemplate={handleCreateTemplate}
            />
          </div>
        );

      case 'calendar':
        return (
          <div className="view-content">
            <div className="view-header">
              <div className="view-header-content">
                <div>
                  <h2>Weekly Calendar</h2>
                  <p>Drag and drop tasks to schedule your content creation workflow</p>
                </div>
                <button 
                  className="add-task-button"
                  onClick={handleCreateTask}
                  disabled={state.channels.length === 0}
                  title={state.channels.length === 0 ? "Create a channel first to add tasks" : "Add a new task"}
                >
                  + Add Task
                </button>
              </div>
            </div>
            
            {state.channels.length === 0 ? (
              <div className="calendar-empty-state">
                <div className="empty-state-content">
                  <div className="empty-state-icon">📅</div>
                  <h3>No Channels Yet</h3>
                  <p>Create your first channel in the Dashboard to start scheduling tasks.</p>
                  <button 
                    className="navigate-button"
                    onClick={() => handleNavigate('dashboard')}
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <ChannelTaskCalendar
                weekStartDate={currentWeekStart}
                workingHours={state.userSettings.workingHours}
                workingDays={state.userSettings.workingDays}
                onTaskDrop={handleTaskDrop}
              />
            )}
          </div>
        );

      case 'analytics':
        return (
          <div className="view-content">
            <div className="view-header">
              <h2>Progress & Analytics</h2>
              <p>Track your progress and analyze workload distribution</p>
            </div>
            <ProgressTrackingDemo />
          </div>
        );

      case 'settings':
        return (
          <div className="view-content">
            <div className="view-header">
              <h2>User Settings</h2>
              <p>Configure your working hours, capacity, and preferences</p>
            </div>
            <UserSettings />
          </div>
        );

      default:
        return null;
    }
  };

  if (state.ui.isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner size="large" />
        <p>Loading your content management workspace...</p>
      </div>
    );
  }

  return (
    <div className="app-content">
      {/* Navigation */}
      <nav className="app-navigation">
        <div className="nav-brand">
          <h1>Multi-Channel Content Manager</h1>
          <span className="nav-subtitle">Streamline your content workflow</span>
        </div>
        
        <div className="nav-menu">
          <button
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavigate('dashboard')}
          >
            <span className="nav-icon">📺</span>
            Dashboard
          </button>
          
          <button
            className={`nav-item ${activeView === 'templates' ? 'active' : ''}`}
            onClick={() => handleNavigate('templates')}
          >
            <span className="nav-icon">📋</span>
            Task Templates
          </button>
          
          <button
            className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => handleNavigate('calendar')}
          >
            <span className="nav-icon">📅</span>
            Calendar
          </button>
          
          <button
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => handleNavigate('analytics')}
          >
            <span className="nav-icon">📊</span>
            Analytics
          </button>
          
          <button
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => handleNavigate('settings')}
          >
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </div>

        {/* Performance indicator (development only) */}
        {import.meta.env.DEV && (
          <div className="nav-performance">
            <small>Renders: {metrics.componentRenderCount}</small>
          </div>
        )}
      </nav>

      {/* Main content area */}
      <main className="app-main">
        {renderActiveView()}
      </main>

      {/* Task Template Editor Modal */}
      {isTemplateEditorOpen && (
        <TaskTemplateEditor
          isOpen={isTemplateEditorOpen}
          template={editingTemplate}
          onClose={handleCloseTemplateEditor}
        />
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={handleCloseAddTaskModal}
      />

      {/* Notification System */}
      <NotificationSystem />
    </div>
  );
});

function App() {
  // Choose backend based on device capabilities
  const dndBackend = isTouchDevice ? TouchBackend : HTML5Backend;
  const backendOptions = isTouchDevice ? { enableMouseEvents: true } : {};

  return (
    <ErrorBoundary>
      <AppProviderWithPersistence>
        <NotificationProvider>
          <DndProvider backend={dndBackend} options={backendOptions}>
            <div className="app">
              <AppContent />
            </div>
          </DndProvider>
        </NotificationProvider>
      </AppProviderWithPersistence>
    </ErrorBoundary>
  );
}

export default App;