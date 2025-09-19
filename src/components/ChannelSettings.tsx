import React, { useState, useEffect } from 'react';
import { Channel, ChannelContentType, PostingFrequency } from '../types';
import { useAppContext } from '../context/AppContext';
import { ChannelValidator } from '../services/validation';
import { CHANNEL_CONTENT_TYPES, POSTING_FREQUENCIES, DAYS_OF_WEEK, CHANNEL_COLORS } from '../utils/constants';
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
}

interface FormErrors {
  name?: string;
  contentType?: string;
  frequency?: string;
  preferredDays?: string;
  preferredTimes?: string;
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
            <label htmlFor="contentType" className={styles.label}>
              Content Type *
            </label>
            <select
              id="contentType"
              value={formData.contentType}
              onChange={(e) => handleInputChange('contentType', e.target.value as ChannelContentType)}
              className={`${styles.select} ${errors.contentType ? styles.inputError : ''}`}
              disabled={isSubmitting}
            >
              {CHANNEL_CONTENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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