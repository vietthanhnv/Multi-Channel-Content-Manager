import React, { useState } from 'react';
import AccessibleCalendarGrid from './AccessibleCalendarGrid';
import AccessibleModal from './AccessibleModal';
import MobileDraggableTask from './MobileDraggableTask';
import { Task, Channel } from '../types';
import { useScreenReaderAnnouncement } from '../hooks/useKeyboardNavigation';
import styles from './AccessibilityDemo.module.css';
import accessibilityStyles from '../styles/accessibility.module.css';
import highContrastStyles from '../styles/high-contrast.module.css';
import touchStyles from '../styles/touch.module.css';

const AccessibilityDemo: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      channelId: 'channel1',
      title: 'Create YouTube Video',
      contentType: 'video',
      estimatedHours: 4,
      status: 'planned',
      scheduledStart: new Date(2024, 0, 15, 9, 0),
      scheduledEnd: new Date(2024, 0, 15, 13, 0),
    },
    {
      id: '2',
      channelId: 'channel1',
      title: 'Edit Short Video',
      contentType: 'short',
      estimatedHours: 2,
      status: 'in-progress',
      scheduledStart: new Date(2024, 0, 15, 14, 0),
      scheduledEnd: new Date(2024, 0, 15, 16, 0),
    },
    {
      id: '3',
      channelId: 'channel2',
      title: 'Write Blog Post',
      contentType: 'post',
      estimatedHours: 3,
      status: 'completed',
      scheduledStart: new Date(2024, 0, 16, 10, 0),
      scheduledEnd: new Date(2024, 0, 16, 13, 0),
    },
  ]);

  const { announce } = useScreenReaderAnnouncement();

  const weekStartDate = new Date(2024, 0, 14); // January 14, 2024 (Sunday)
  const workingHours = { start: '09:00', end: '17:00' };
  const workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const handleTaskDrop = (taskId: string, newStart: Date, newEnd: Date) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, scheduledStart: newStart, scheduledEnd: newEnd }
          : task
      )
    );
    announce('Task moved successfully', 'assertive');
  };

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    announce(`Selected task: ${task.title}`, 'polite');
  };

  const handleTimeSlotSelect = (date: Date, timeSlot: string) => {
    announce(`Selected time slot: ${date.toLocaleDateString()} at ${timeSlot}`, 'polite');
  };

  const handleModalOpen = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleTaskAction = (action: string, task: Task) => {
    announce(`${action} action performed on task: ${task.title}`, 'assertive');
  };

  return (
    <div className={`${styles.accessibilityDemo} ${accessibilityStyles.respectMotionPreference}`}>
      {/* Skip Links */}
      <div className={accessibilityStyles.skipLinks}>
        <a href="#main-content" className={accessibilityStyles.skipLink}>
          Skip to main content
        </a>
        <a href="#calendar" className={accessibilityStyles.skipLink}>
          Skip to calendar
        </a>
        <a href="#task-list" className={accessibilityStyles.skipLink}>
          Skip to task list
        </a>
      </div>

      {/* Page Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Accessibility Demo</h1>
        <p className={styles.description}>
          This demo showcases accessible drag-and-drop calendar functionality with full keyboard navigation,
          screen reader support, and high contrast mode compatibility.
        </p>
      </header>

      {/* Main Content */}
      <main id="main-content" className={styles.mainContent}>
        
        {/* Controls Section */}
        <section className={styles.controls} aria-labelledby="controls-heading">
          <h2 id="controls-heading" className={styles.sectionTitle}>Controls</h2>
          
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${accessibilityStyles.accessibleButton} ${touchStyles.touchButton} ${touchStyles.touchButtonPrimary}`}
              onClick={handleModalOpen}
              aria-describedby="modal-help"
            >
              Open Modal Demo
            </button>
            
            <button
              type="button"
              className={`${accessibilityStyles.accessibleButton} ${touchStyles.touchButton} ${touchStyles.touchButtonSecondary}`}
              onClick={() => announce('Accessibility features are working!', 'assertive')}
              aria-describedby="announce-help"
            >
              Test Screen Reader
            </button>
          </div>

          <div className={styles.helpText}>
            <p id="modal-help" className={accessibilityStyles.accessibleHelpText}>
              Opens a modal dialog with focus management and keyboard navigation.
            </p>
            <p id="announce-help" className={accessibilityStyles.accessibleHelpText}>
              Tests screen reader announcements.
            </p>
          </div>
        </section>

        {/* Task List Section */}
        <section id="task-list" className={styles.taskSection} aria-labelledby="tasks-heading">
          <h2 id="tasks-heading" className={styles.sectionTitle}>Draggable Tasks</h2>
          <p className={styles.instructions}>
            Use keyboard navigation to focus on tasks, then press Enter or Space to start dragging.
            Navigate to the calendar and press Enter or Space to drop.
          </p>
          
          <div className={styles.taskList} role="list" aria-label="Available tasks">
            {tasks.map(task => (
              <div key={task.id} role="listitem" className={styles.taskItem}>
                <MobileDraggableTask
                  task={task}
                  onTaskClick={(task) => handleTaskAction('Click', task)}
                  onTaskLongPress={(task) => handleTaskAction('Long press', task)}
                  className={accessibilityStyles.enhancedFocus}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Calendar Section */}
        <section id="calendar" className={styles.calendarSection} aria-labelledby="calendar-heading">
          <h2 id="calendar-heading" className={styles.sectionTitle}>Accessible Calendar</h2>
          <p className={styles.instructions}>
            Use arrow keys to navigate the calendar grid. Press Enter or Space to select time slots or tasks.
            Press Escape to cancel operations. Press Home/End to jump to first/last time slot.
          </p>
          
          <div className={`${styles.calendarContainer} ${highContrastStyles.enhancedFocus}`}>
            <AccessibleCalendarGrid
              weekStartDate={weekStartDate}
              tasks={tasks}
              workingHours={workingHours}
              workingDays={workingDays}
              onTaskDrop={handleTaskDrop}
              onTaskSelect={handleTaskSelect}
              onTimeSlotSelect={handleTimeSlotSelect}
            />
          </div>
        </section>

        {/* Status Section */}
        <section className={styles.statusSection} aria-labelledby="status-heading">
          <h2 id="status-heading" className={styles.sectionTitle}>Status Indicators</h2>
          
          <div className={styles.statusGrid}>
            <div 
              className={`${styles.statusCard} ${accessibilityStyles.accessibleStatus} ${highContrastStyles.statusSuccess}`}
              aria-label="Success status: All tasks completed"
            >
              <span className={styles.statusIcon} aria-hidden="true">✓</span>
              <span>Success</span>
            </div>
            
            <div 
              className={`${styles.statusCard} ${accessibilityStyles.accessibleStatus} ${highContrastStyles.statusWarning}`}
              aria-label="Warning status: Some tasks are overdue"
            >
              <span className={styles.statusIcon} aria-hidden="true">⚠</span>
              <span>Warning</span>
            </div>
            
            <div 
              className={`${styles.statusCard} ${accessibilityStyles.accessibleStatus} ${highContrastStyles.statusError}`}
              aria-label="Error status: Critical issues found"
            >
              <span className={styles.statusIcon} aria-hidden="true">✗</span>
              <span>Error</span>
            </div>
          </div>
        </section>

        {/* Progress Section */}
        <section className={styles.progressSection} aria-labelledby="progress-heading">
          <h2 id="progress-heading" className={styles.sectionTitle}>Progress Indicators</h2>
          
          <div className={styles.progressContainer}>
            <label htmlFor="progress-demo" className={accessibilityStyles.accessibleLabel}>
              Task Completion Progress
            </label>
            <div 
              id="progress-demo"
              className={`${accessibilityStyles.accessibleProgressBar} ${highContrastStyles.enhancedFocus}`}
              role="progressbar"
              aria-valuenow={75}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="75% complete"
              tabIndex={0}
            >
              <div 
                className={accessibilityStyles.accessibleProgressFill}
                style={{ width: '75%' }}
              />
            </div>
            <p className={styles.progressText}>75% of tasks completed</p>
          </div>
        </section>

        {/* Form Section */}
        <section className={styles.formSection} aria-labelledby="form-heading">
          <h2 id="form-heading" className={styles.sectionTitle}>Accessible Form Elements</h2>
          
          <form className={styles.demoForm}>
            <div className={accessibilityStyles.accessibleFormGroup}>
              <label htmlFor="task-name" className={`${accessibilityStyles.accessibleLabel} ${accessibilityStyles.required}`}>
                Task Name
              </label>
              <input
                type="text"
                id="task-name"
                className={`${accessibilityStyles.accessibleInput} ${touchStyles.touchInput}`}
                aria-describedby="task-name-help"
                required
              />
              <div id="task-name-help" className={accessibilityStyles.accessibleHelpText}>
                Enter a descriptive name for your task
              </div>
            </div>

            <div className={accessibilityStyles.accessibleFormGroup}>
              <label htmlFor="task-type" className={accessibilityStyles.accessibleLabel}>
                Content Type
              </label>
              <select
                id="task-type"
                className={`${accessibilityStyles.accessibleInput} ${touchStyles.touchSelect}`}
              >
                <option value="">Select content type</option>
                <option value="video">Video</option>
                <option value="short">Short</option>
                <option value="post">Post</option>
              </select>
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="submit"
                className={`${accessibilityStyles.accessibleButton} ${touchStyles.touchButton} ${touchStyles.touchButtonPrimary}`}
              >
                Save Task
              </button>
              <button
                type="button"
                className={`${accessibilityStyles.accessibleButton} ${touchStyles.touchButton} ${touchStyles.touchButtonSecondary}`}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Accessible Modal */}
      <AccessibleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Accessibility Features Demo"
        ariaDescribedBy="modal-description"
      >
        <div id="modal-description">
          <p>This modal demonstrates:</p>
          <ul>
            <li>Focus trapping - Tab navigation stays within the modal</li>
            <li>Escape key handling - Press Escape to close</li>
            <li>Focus restoration - Focus returns to the trigger button when closed</li>
            <li>Screen reader announcements - Modal opening/closing is announced</li>
            <li>High contrast mode support</li>
          </ul>
          
          <div className={styles.modalActions}>
            <button
              type="button"
              className={`${accessibilityStyles.accessibleButton} ${touchStyles.touchButton} ${touchStyles.touchButtonPrimary}`}
              onClick={() => announce('Modal action performed!', 'assertive')}
            >
              Test Action
            </button>
            <button
              type="button"
              className={`${accessibilityStyles.accessibleButton} ${touchStyles.touchButton} ${touchStyles.touchButtonSecondary}`}
              onClick={handleModalClose}
            >
              Close Modal
            </button>
          </div>
        </div>
      </AccessibleModal>

      {/* Live region for announcements */}
      <div 
        className={accessibilityStyles.liveRegion}
        aria-live="polite"
        aria-atomic="true"
        id="live-region"
      />

      {/* Instructions for screen readers */}
      <div className={accessibilityStyles.srOnly}>
        <h2>Accessibility Instructions</h2>
        <p>
          This application supports full keyboard navigation and screen reader access.
          Use Tab to navigate between interactive elements.
          Use arrow keys to navigate within grids and lists.
          Press Enter or Space to activate buttons and start drag operations.
          Press Escape to cancel operations or close dialogs.
        </p>
      </div>
    </div>
  );
};

export default AccessibilityDemo;