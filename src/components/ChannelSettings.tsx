import React, { useState, useEffect } from 'react';
import { Channel, ChannelContentType, PostingFrequency, ChannelTaskAssignment, TaskPriority } from '../types';
import { useAppContext } from '../context/AppContext';
import { ChannelValidator } from '../services/validation';
import { POSTING_FREQUENCIES, DAYS_OF_WEEK, CHANNEL_COLORS, TASK_PRIORITIES } from '../utils/constants';
import { ContentTypeManager } from './ContentTypeManager';
import styles from './ChannelSettings.module.css';

interface ChannelSettingsProps {
  isOpen: boolean;
  channel: Channel | null;
  onClose: () => void;
}

interface FormData {
  name: string;
  contentType: ChannelContentType;
  frequency: PostingFrequency;
  preferredDays: string[];
  preferredTimes: string[];
  color: string;
  isActive: boolean;
  assignedTasks: ChannelTaskAssignment[];
}

interface FormErrors {
  name?: string;
  contentType?: string;
  frequency?: string;
  preferredDays?: string;
  preferredTimes?: string;
  assignedTasks?: string;
  general?: string;
}

export const ChannelSettings: React.FC<ChannelSettingsProps> = ({ isOpen, channel, onClose }) => {
  const { state, dispatch } = useAppContext();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    contentType: 'other',
    frequency: 'weekly',
    preferredDays: [],
    preferredTimes: [],
    color: CHANNEL_COLORS[0],
    isActive: true,
    assignedTasks: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTimeInput, setNewTimeInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when modal opens/closes or channel changes
  useEffect(() => {
    if (isOpen && channel) {
      setFormData({
        name: channel.name,
        contentType: channel.contentType,
        frequency: channel.postingSchedule.frequency,
        preferredDays: [...channel.postingSchedule.preferredDays],
        preferredTimes: [...channel.postingSchedule.preferredTimes],
        color: channel.color,
        isActive: channel.isActive,
        assignedTasks: channel.assignedTasks ? [...channel.assignedTasks] : [],
      });
      setErrors({});
      setNewTimeInput('');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, channel]);

  // Handle form field changes
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle day selection
  const handleDayToggle = (day: string) => {
    const updatedDays = formData.preferredDays.includes(day)
      ? formData.preferredDays.filter(d => d !== day)
      : [...formData.preferredDays, day];
    
    handleInputChange('preferredDays', updatedDays);
  };

  // Handle time addition
  const handleAddTime = () => {
    if (!newTimeInput.trim()) return;
    
    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTimeInput)) {
      setErrors(prev => ({ ...prev, preferredTimes: 'Please enter time in HH:MM format (e.g., 14:30)' }));
      return;
    }

    // Check for duplicates
    if (formData.preferredTimes.includes(newTimeInput)) {
      setErrors(prev => ({ ...prev, preferredTimes: 'This time is already added' }));
      return;
    }

    handleInputChange('preferredTimes', [...formData.preferredTimes, newTimeInput]);
    setNewTimeInput('');
  };

  // Handle time removal
  const handleRemoveTime = (timeToRemove: string) => {
    handleInputChange('preferredTimes', formData.preferredTimes.filter(t => t !== timeToRemove));
  };

  // Handle task assignment
  const handleAddTaskAssignment = (templateId: string) => {
    const existingAssignment = formData.assignedTasks.find(task => task.templateId === templateId);
    if (existingAssignment) {
      // Increase quantity if already assigned
      handleInputChange('assignedTasks', formData.assignedTasks.map(task =>
        task.templateId === templateId
          ? { ...task, quantity: task.quantity + 1 }
          : task
      ));
    } else {
      // Add new assignment
      const newAssignment: ChannelTaskAssignment = {
        templateId,
        quantity: 1,
        priority: 'medium',
      };
      handleInputChange('assignedTasks', [...formData.assignedTasks, newAssignment]);
    }
  };

  // Handle task assignment removal
  const handleRemoveTaskAssignment = (templateId: string) => {
    handleInputChange('assignedTasks', formData.assignedTasks.filter(task => task.templateId !== templateId));
  };

  // Handle task assignment update
  const handleUpdateTaskAssignment = (templateId: string, updates: Partial<ChannelTaskAssignment>) => {
    handleInputChange('assignedTasks', formData.assignedTasks.map(task =>
      task.templateId === templateId
        ? { ...task, ...updates }
        : task
    ));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Channel name is required';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Channel name must be 100 characters or less';
    } else if (state.channels.some(c => c.id !== channel?.id && c.name.toLowerCase() === formData.name.trim().toLowerCase())) {
      newErrors.name = 'A channel with this name already exists';
    }

    // Validate preferred days (at least one required for non-daily frequency)
    if (formData.frequency !== 'daily' && formData.preferredDays.length === 0) {
      newErrors.preferredDays = 'Please select at least one preferred day';
    }

    // Validate preferred times (at least one required)
    if (formData.preferredTimes.length === 0) {
      newErrors.preferredTimes = 'Please add at least one preferred posting time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channel || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Create updated channel object
      const updatedChannel: Partial<Channel> = {
        name: formData.name.trim(),
        contentType: formData.contentType,
        postingSchedule: {
          frequency: formData.frequency,
          preferredDays: formData.preferredDays,
          preferredTimes: formData.preferredTimes,
        },
        color: formData.color,
        isActive: formData.isActive,
        assignedTasks: formData.assignedTasks,
      };

      // Validate the complete channel object
      const fullChannel = { ...channel, ...updatedChannel };
      const validation = ChannelValidator.validate(fullChannel);
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => e.message).join(', ');
        setErrors({ general: `Validation failed: ${errorMessage}` });
        return;
      }

      // Update channel in state
      dispatch({ 
        type: 'UPDATE_CHANNEL', 
        payload: { 
          id: channel.id, 
          updates: updatedChannel 
        } 
      });

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error updating channel:', error);
      setErrors({ general: 'Failed to update channel. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle channel deletion
  const handleDelete = () => {
    if (!channel) return;
    
    if (showDeleteConfirm) {
      // Actually delete the channel
      dispatch({ type: 'DELETE_CHANNEL', payload: channel.id });
      onClose();
    } else {
      // Show confirmation
      setShowDeleteConfirm(true);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isSubmitting]);

  if (!isOpen || !channel) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>
            Channel Settings
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* General Error */}
          {errors.general && (
            <div className={styles.errorMessage} role="alert">
              {errors.general}
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className={styles.deleteConfirmation} role="alert">
              <div className={styles.deleteWarning}>
                <strong>⚠️ Delete Channel</strong>
                <p>Are you sure you want to delete "{channel.name}"? This action cannot be undone and will remove all associated tasks.</p>
                <div className={styles.deleteActions}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className={styles.cancelDeleteButton}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className={styles.confirmDeleteButton}
                    disabled={isSubmitting}
                  >
                    Delete Channel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Channel Status Toggle */}
          <div className={styles.formGroup}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className={styles.toggleInput}
                disabled={isSubmitting}
              />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleText}>
                Channel is {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </label>
          </div>

          {/* Channel Name */}
          <div className={styles.formGroup}>
            <label htmlFor="channelName" className={styles.label}>
              Channel Name *
            </label>
            <input
              id="channelName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
              placeholder="Enter channel name"
              disabled={isSubmitting}
              maxLength={100}
            />
            {errors.name && (
              <span className={styles.fieldError} role="alert">
                {errors.name}
              </span>
            )}
          </div>

          {/* Content Type */}
          <div className={styles.formGroup}>
            <ContentTypeManager
              selectedContentType={formData.contentType}
              onContentTypeChange={(contentType) => handleInputChange('contentType', contentType)}
              disabled={isSubmitting}
            />
            {errors.contentType && (
              <span className={styles.fieldError} role="alert">
                {errors.contentType}
              </span>
            )}
          </div>

          {/* Posting Frequency */}
          <div className={styles.formGroup}>
            <label htmlFor="frequency" className={styles.label}>
              Posting Frequency *
            </label>
            <select
              id="frequency"
              value={formData.frequency}
              onChange={(e) => handleInputChange('frequency', e.target.value as PostingFrequency)}
              className={`${styles.select} ${errors.frequency ? styles.inputError : ''}`}
              disabled={isSubmitting}
            >
              {POSTING_FREQUENCIES.map(freq => (
                <option key={freq.value} value={freq.value}>
                  {freq.label}
                </option>
              ))}
            </select>
            {errors.frequency && (
              <span className={styles.fieldError} role="alert">
                {errors.frequency}
              </span>
            )}
          </div>

          {/* Preferred Days */}
          {formData.frequency !== 'daily' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Preferred Days *
              </label>
              <div className={`${styles.daySelector} ${errors.preferredDays ? styles.inputError : ''}`}>
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    className={`${styles.dayButton} ${
                      formData.preferredDays.includes(day) ? styles.dayButtonActive : ''
                    }`}
                    disabled={isSubmitting}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
              {errors.preferredDays && (
                <span className={styles.fieldError} role="alert">
                  {errors.preferredDays}
                </span>
              )}
            </div>
          )}

          {/* Preferred Times */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Preferred Posting Times *
            </label>
            <div className={styles.timeInputGroup}>
              <input
                type="time"
                value={newTimeInput}
                onChange={(e) => setNewTimeInput(e.target.value)}
                className={styles.timeInput}
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={handleAddTime}
                className={styles.addTimeButton}
                disabled={isSubmitting || !newTimeInput}
              >
                Add
              </button>
            </div>
            
            {formData.preferredTimes.length > 0 && (
              <div className={styles.timeList}>
                {formData.preferredTimes.map(time => (
                  <div key={time} className={styles.timeTag}>
                    <span>{time}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(time)}
                      className={styles.removeTimeButton}
                      disabled={isSubmitting}
                      aria-label={`Remove ${time}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {errors.preferredTimes && (
              <span className={styles.fieldError} role="alert">
                {errors.preferredTimes}
              </span>
            )}
          </div>

          {/* Channel Color */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Channel Color
            </label>
            <div className={styles.colorSelector}>
              {CHANNEL_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleInputChange('color', color)}
                  className={`${styles.colorButton} ${
                    formData.color === color ? styles.colorButtonActive : ''
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={isSubmitting}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Task Templates Assignment */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Assigned Task Templates
            </label>
            <p className={styles.helpText}>
              Select task templates to assign to this channel. These will be used to generate tasks on the calendar.
            </p>
            
            {/* Available Templates */}
            <div className={styles.templateSelector}>
              <h4 className={styles.sectionTitle}>Available Templates</h4>
              {state.taskTemplates.length === 0 ? (
                <div className={styles.noTemplates}>
                  <p>No task templates available. Create some templates first in the Templates tab.</p>
                </div>
              ) : (
                <div className={styles.availableTemplates}>
                  {state.taskTemplates
                    .filter(template => !formData.assignedTasks.some(assigned => assigned.templateId === template.id))
                    .map(template => (
                      <div key={template.id} className={styles.templateItem}>
                        <div className={styles.templateInfo}>
                          <strong>{template.title}</strong>
                          <span className={styles.templateHours}>{template.estimatedHours}h</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddTaskAssignment(template.id)}
                          className={styles.addTemplateButton}
                          disabled={isSubmitting}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Assigned Templates */}
            {formData.assignedTasks.length > 0 && (
              <div className={styles.assignedTemplates}>
                <h4 className={styles.sectionTitle}>Assigned Templates</h4>
                {formData.assignedTasks.map(assignment => {
                  const template = state.taskTemplates.find(t => t.id === assignment.templateId);
                  if (!template) return null;
                  
                  return (
                    <div key={assignment.templateId} className={styles.assignedTemplateItem}>
                      <div className={styles.assignedTemplateInfo}>
                        <strong>{template.title}</strong>
                        <span className={styles.templateHours}>{template.estimatedHours}h each</span>
                      </div>
                      
                      <div className={styles.assignmentControls}>
                        <div className={styles.quantityControl}>
                          <label htmlFor={`quantity-${assignment.templateId}`} className={styles.quantityLabel}>
                            Quantity:
                          </label>
                          <input
                            id={`quantity-${assignment.templateId}`}
                            type="number"
                            min="1"
                            max="10"
                            value={assignment.quantity}
                            onChange={(e) => handleUpdateTaskAssignment(assignment.templateId, {
                              quantity: parseInt(e.target.value) || 1
                            })}
                            className={styles.quantityInput}
                            disabled={isSubmitting}
                          />
                        </div>
                        
                        <div className={styles.priorityControl}>
                          <label htmlFor={`priority-${assignment.templateId}`} className={styles.priorityLabel}>
                            Priority:
                          </label>
                          <select
                            id={`priority-${assignment.templateId}`}
                            value={assignment.priority}
                            onChange={(e) => handleUpdateTaskAssignment(assignment.templateId, {
                              priority: e.target.value as TaskPriority
                            })}
                            className={styles.prioritySelect}
                            disabled={isSubmitting}
                          >
                            {TASK_PRIORITIES.map(priority => (
                              <option key={priority.value} value={priority.value}>
                                {priority.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskAssignment(assignment.templateId)}
                          className={styles.removeTemplateButton}
                          disabled={isSubmitting}
                          aria-label={`Remove ${template.title}`}
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className={styles.totalHours}>
                        Total: {template.estimatedHours * assignment.quantity}h
                      </div>
                    </div>
                  );
                })}
                
                <div className={styles.assignmentSummary}>
                  <strong>
                    Total Estimated Hours: {formData.assignedTasks.reduce((total, assignment) => {
                      const template = state.taskTemplates.find(t => t.id === assignment.templateId);
                      return total + (template ? template.estimatedHours * assignment.quantity : 0);
                    }, 0)}h
                  </strong>
                </div>
              </div>
            )}
            
            {errors.assignedTasks && (
              <span className={styles.fieldError} role="alert">
                {errors.assignedTasks}
              </span>
            )}
          </div>

          {/* Generate Tasks Section */}
          {formData.assignedTasks.length > 0 && (
            <div className={styles.generateTasksSection}>
              <h4 className={styles.sectionTitle}>Generate Calendar Tasks</h4>
              <p className={styles.helpText}>
                Generate tasks on the calendar based on your assigned templates. This will create individual task cards that you can drag and arrange on the weekly calendar.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (channel) {
                    dispatch({ type: 'GENERATE_TASKS_FROM_TEMPLATES', payload: { channelId: channel.id } });
                  }
                }}
                className={styles.generateTasksButton}
                disabled={isSubmitting}
              >
                Generate Tasks for Calendar
              </button>
            </div>
          )}

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteButton}
              disabled={isSubmitting}
            >
              {showDeleteConfirm ? 'Confirm Delete' : 'Delete Channel'}
            </button>
            <div className={styles.rightActions}>
              <button
                type="button"
                onClick={handleClose}
                className={styles.cancelButton}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting || showDeleteConfirm}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};