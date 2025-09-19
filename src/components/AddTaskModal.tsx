import React, { useState, useEffect } from 'react';
import { Task, Channel } from '../types';
import { useAppContext } from '../context/AppContext';
import { useSchedule } from '../hooks/useSchedule';
import { generateId } from '../utils/helpers';
import styles from './AddTaskModal.module.css';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialTimeSlot?: string;
}

interface FormData {
  title: string;
  channelId: string;
  contentType: 'video' | 'short' | 'post';
  estimatedHours: number;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
}

const initialFormData: FormData = {
  title: '',
  channelId: '',
  contentType: 'video',
  estimatedHours: 2,
  scheduledDate: '',
  scheduledTime: '09:00',
  notes: '',
};

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  isOpen, 
  onClose, 
  initialDate,
  initialTimeSlot 
}) => {
  const { state } = useAppContext();
  const { addTask } = useSchedule();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultDate = initialDate || new Date();
      const defaultTime = initialTimeSlot || '09:00';
      
      setFormData({
        ...initialFormData,
        scheduledDate: defaultDate.toISOString().split('T')[0],
        scheduledTime: defaultTime,
        channelId: state.channels.length > 0 ? state.channels[0].id : '',
      });
      setErrors({});
    }
  }, [isOpen, initialDate, initialTimeSlot, state.channels]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    if (!formData.channelId) {
      newErrors.channelId = 'Please select a channel';
    }

    if (formData.estimatedHours <= 0) {
      newErrors.estimatedHours = 'Estimated hours must be greater than 0';
    }

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduledStart = new Date(`${formData.scheduledDate}T${formData.scheduledTime}:00`);
      const scheduledEnd = new Date(scheduledStart);
      scheduledEnd.setHours(scheduledEnd.getHours() + formData.estimatedHours);

      const newTask: Task = {
        id: generateId(),
        channelId: formData.channelId,
        title: formData.title.trim(),
        contentType: formData.contentType,
        estimatedHours: formData.estimatedHours,
        status: 'planned',
        scheduledStart,
        scheduledEnd,
        notes: formData.notes.trim() || undefined,
      };

      addTask(newTask);
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
      setErrors({ general: 'Failed to create task. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

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
          <h2 id="modal-title" className={styles.modalTitle}>Add New Task</h2>
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
          {errors.general && (
            <div className={styles.errorMessage} role="alert">
              {errors.general}
            </div>
          )}

          {/* Task Title */}
          <div className={styles.formGroup}>
            <label htmlFor="taskTitle" className={styles.label}>
              Task Title *
            </label>
            <input
              id="taskTitle"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder="Enter task title"
              disabled={isSubmitting}
            />
            {errors.title && (
              <span className={styles.fieldError} role="alert">
                {errors.title}
              </span>
            )}
          </div>

          {/* Channel Selection */}
          <div className={styles.formGroup}>
            <label htmlFor="channelId" className={styles.label}>
              Channel *
            </label>
            <select
              id="channelId"
              value={formData.channelId}
              onChange={(e) => handleInputChange('channelId', e.target.value)}
              className={`${styles.select} ${errors.channelId ? styles.inputError : ''}`}
              disabled={isSubmitting}
            >
              <option value="">Select a channel</option>
              {state.channels.map(channel => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
            {errors.channelId && (
              <span className={styles.fieldError} role="alert">
                {errors.channelId}
              </span>
            )}
          </div>

          {/* Content Type */}
          <div className={styles.formGroup}>
            <label htmlFor="contentType" className={styles.label}>
              Content Type *
            </label>
            <select
              id="contentType"
              value={formData.contentType}
              onChange={(e) => handleInputChange('contentType', e.target.value as 'video' | 'short' | 'post')}
              className={styles.select}
              disabled={isSubmitting}
            >
              <option value="video">Video</option>
              <option value="short">Short</option>
              <option value="post">Post</option>
            </select>
          </div>

          {/* Estimated Hours */}
          <div className={styles.formGroup}>
            <label htmlFor="estimatedHours" className={styles.label}>
              Estimated Hours *
            </label>
            <input
              id="estimatedHours"
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value))}
              className={`${styles.input} ${errors.estimatedHours ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.estimatedHours && (
              <span className={styles.fieldError} role="alert">
                {errors.estimatedHours}
              </span>
            )}
          </div>

          {/* Scheduled Date */}
          <div className={styles.formGroup}>
            <label htmlFor="scheduledDate" className={styles.label}>
              Scheduled Date *
            </label>
            <input
              id="scheduledDate"
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
              className={`${styles.input} ${errors.scheduledDate ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.scheduledDate && (
              <span className={styles.fieldError} role="alert">
                {errors.scheduledDate}
              </span>
            )}
          </div>

          {/* Scheduled Time */}
          <div className={styles.formGroup}>
            <label htmlFor="scheduledTime" className={styles.label}>
              Scheduled Time *
            </label>
            <input
              id="scheduledTime"
              type="time"
              value={formData.scheduledTime}
              onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
              className={`${styles.input} ${errors.scheduledTime ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.scheduledTime && (
              <span className={styles.fieldError} role="alert">
                {errors.scheduledTime}
              </span>
            )}
          </div>

          {/* Notes */}
          <div className={styles.formGroup}>
            <label htmlFor="notes" className={styles.label}>
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className={styles.textarea}
              placeholder="Add any additional notes..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};