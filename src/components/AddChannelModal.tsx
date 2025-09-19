import React, { useState, useEffect } from 'react';
import { Channel, ChannelContentType, PostingFrequency } from '../types';
import { useAppContext } from '../context/AppContext';
import { useUserSettings } from '../hooks/useUserSettings';
import { ChannelValidator } from '../services/validation';
import { UserSettingsIntegrationService } from '../services/userSettingsIntegration';
import { CHANNEL_CONTENT_TYPES, POSTING_FREQUENCIES, DAYS_OF_WEEK, CHANNEL_COLORS } from '../utils/constants';
import { generateId } from '../utils/helpers';
import styles from './AddChannelModal.module.css';

interface AddChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  contentType: ChannelContentType;
  frequency: PostingFrequency;
  preferredDays: string[];
  preferredTimes: string[];
  color: string;
}

interface FormErrors {
  name?: string;
  contentType?: string;
  frequency?: string;
  preferredDays?: string;
  preferredTimes?: string;
  general?: string;
}

const initialFormData: FormData = {
  name: '',
  contentType: 'other',
  frequency: 'weekly',
  preferredDays: [],
  preferredTimes: [],
  color: CHANNEL_COLORS[0],
};

export const AddChannelModal: React.FC<AddChannelModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useAppContext();
  const { userSettings } = useUserSettings();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTimeInput, setNewTimeInput] = useState('');

  // Get default values based on user settings
  const getDefaultFormData = (): FormData => {
    const defaultDays = UserSettingsIntegrationService.getDefaultPreferredDays(
      userSettings,
      'weekly'
    );
    
    const defaultTime = UserSettingsIntegrationService.getDefaultPostingTime(userSettings);
    
    return {
      ...initialFormData,
      preferredDays: defaultDays,
      preferredTimes: [defaultTime],
      color: getNextAvailableColor(),
    };
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData(getDefaultFormData());
      setErrors({});
      setNewTimeInput('');
    }
  }, [isOpen, state.channels, userSettings]);

  // Get next available color that's not already used
  const getNextAvailableColor = (): string => {
    const usedColors = new Set(state.channels.map(c => c.color));
    const availableColor = CHANNEL_COLORS.find(color => !usedColors.has(color));
    return availableColor || CHANNEL_COLORS[state.channels.length % CHANNEL_COLORS.length];
  };

  // Handle form field changes
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-adjust preferred days when frequency changes
      if (field === 'frequency') {
        const suggestedDays = UserSettingsIntegrationService.getDefaultPreferredDays(
          userSettings,
          value as PostingFrequency
        );
        newData.preferredDays = suggestedDays;
      }
      
      return newData;
    });
    
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
    } else if (state.channels.some(c => c.name.toLowerCase() === formData.name.trim().toLowerCase())) {
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
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Create channel object
      const newChannel: Channel = {
        id: generateId(),
        name: formData.name.trim(),
        contentType: formData.contentType,
        postingSchedule: {
          frequency: formData.frequency,
          preferredDays: formData.preferredDays,
          preferredTimes: formData.preferredTimes,
        },
        color: formData.color,
        createdAt: new Date(),
        isActive: true,
      };

      // Validate the complete channel object
      const validation = ChannelValidator.validate(newChannel);
      if (!validation.isValid) {
        const errorMessage = validation.errors.map(e => e.message).join(', ');
        setErrors({ general: `Validation failed: ${errorMessage}` });
        return;
      }

      // Add channel to state
      dispatch({ type: 'ADD_CHANNEL', payload: newChannel });

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error creating channel:', error);
      setErrors({ general: 'Failed to create channel. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isSubmitting, onClose]);

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
          <h2 id="modal-title" className={styles.modalTitle}>Add New Channel</h2>
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
              {isSubmitting ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};