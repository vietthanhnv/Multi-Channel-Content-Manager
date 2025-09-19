import React, { useState, useEffect } from 'react';
import { TaskTemplate, TaskCategory } from '../types';
import { useAppContext } from '../context/AppContext';
import { TASK_CATEGORIES } from '../utils/constants';
import styles from './TaskTemplateEditor.module.css';

interface TaskTemplateEditorProps {
  isOpen: boolean;
  template: TaskTemplate | null;
  onClose: () => void;
}

interface FormData {
  title: string;
  description: string;
  estimatedHours: number;
  category: TaskCategory;
  workflowSteps: string[];
}

interface FormErrors {
  title?: string;
  description?: string;
  estimatedHours?: string;
  category?: string;
  workflowSteps?: string;
  general?: string;
}

export const TaskTemplateEditor: React.FC<TaskTemplateEditorProps> = ({ isOpen, template, onClose }) => {
  const { dispatch } = useAppContext();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    estimatedHours: 1,
    category: 'content-creation',
    workflowSteps: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStepInput, setNewStepInput] = useState('');

  // Reset form when modal opens/closes or template changes
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setFormData({
          title: template.title,
          description: template.description,
          estimatedHours: template.estimatedHours,
          category: template.category,
          workflowSteps: [...template.workflowSteps],
        });
      } else {
        setFormData({
          title: '',
          description: '',
          estimatedHours: 1,
          category: 'content-creation',
          workflowSteps: [],
        });
      }
      setErrors({});
      setNewStepInput('');
    }
  }, [isOpen, template]);

  // Handle form field changes
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle workflow step addition
  const handleAddStep = () => {
    if (!newStepInput.trim()) return;
    
    if (formData.workflowSteps.includes(newStepInput.trim())) {
      setErrors(prev => ({ ...prev, workflowSteps: 'This step already exists' }));
      return;
    }

    handleInputChange('workflowSteps', [...formData.workflowSteps, newStepInput.trim()]);
    setNewStepInput('');
    setErrors(prev => ({ ...prev, workflowSteps: undefined }));
  };

  // Handle workflow step removal
  const handleRemoveStep = (stepToRemove: string) => {
    handleInputChange('workflowSteps', formData.workflowSteps.filter(step => step !== stepToRemove));
  };

  // Handle workflow step reordering
  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...formData.workflowSteps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    handleInputChange('workflowSteps', newSteps);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Task title must be 100 characters or less';
    }

    // Validate description
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    // Validate estimated hours
    if (formData.estimatedHours <= 0) {
      newErrors.estimatedHours = 'Estimated hours must be greater than 0';
    } else if (formData.estimatedHours > 168) {
      newErrors.estimatedHours = 'Estimated hours cannot exceed 168 hours (1 week)';
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
      if (template) {
        // Update existing template
        const updatedTemplate: Partial<TaskTemplate> = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          estimatedHours: formData.estimatedHours,
          category: formData.category,
          workflowSteps: formData.workflowSteps,
        };

        dispatch({ 
          type: 'UPDATE_TASK_TEMPLATE', 
          payload: { 
            id: template.id, 
            updates: updatedTemplate 
          } 
        });
      } else {
        // Create new template
        const newTemplate: TaskTemplate = {
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: formData.title.trim(),
          description: formData.description.trim(),
          estimatedHours: formData.estimatedHours,
          category: formData.category,
          workflowSteps: formData.workflowSteps,
          createdAt: new Date(),
        };

        dispatch({ type: 'ADD_TASK_TEMPLATE', payload: newTemplate });
      }

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error saving task template:', error);
      setErrors({ general: 'Failed to save task template. Please try again.' });
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
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isSubmitting]);

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
          <h2 id="modal-title" className={styles.modalTitle}>
            {template ? 'Edit Task Template' : 'Create Task Template'}
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
              placeholder="e.g., Music Creation, Image Creation, Video Editing"
              disabled={isSubmitting}
              maxLength={100}
            />
            {errors.title && (
              <span className={styles.fieldError} role="alert">
                {errors.title}
              </span>
            )}
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
              placeholder="e.g., Create 50 songs for background music, Design 20 thumbnail images"
              disabled={isSubmitting}
              maxLength={500}
              rows={3}
            />
            {errors.description && (
              <span className={styles.fieldError} role="alert">
                {errors.description}
              </span>
            )}
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
              max="168"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
              className={`${styles.input} ${errors.estimatedHours ? styles.inputError : ''}`}
              disabled={isSubmitting}
            />
            {errors.estimatedHours && (
              <span className={styles.fieldError} role="alert">
                {errors.estimatedHours}
              </span>
            )}
          </div>

          {/* Category */}
          <div className={styles.formGroup}>
            <label htmlFor="category" className={styles.label}>
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value as TaskCategory)}
              className={`${styles.select} ${errors.category ? styles.inputError : ''}`}
              disabled={isSubmitting}
            >
              {TASK_CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <span className={styles.fieldError} role="alert">
                {errors.category}
              </span>
            )}
          </div>

          {/* Workflow Steps */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Workflow Steps (Optional)
            </label>
            <div className={styles.stepInputGroup}>
              <input
                type="text"
                value={newStepInput}
                onChange={(e) => setNewStepInput(e.target.value)}
                className={styles.stepInput}
                placeholder="Add a workflow step"
                disabled={isSubmitting}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddStep())}
              />
              <button
                type="button"
                onClick={handleAddStep}
                className={styles.addStepButton}
                disabled={isSubmitting || !newStepInput.trim()}
              >
                Add
              </button>
            </div>
            
            {formData.workflowSteps.length > 0 && (
              <div className={styles.stepList}>
                {formData.workflowSteps.map((step, index) => (
                  <div key={index} className={styles.stepItem}>
                    <span className={styles.stepNumber}>{index + 1}.</span>
                    <span className={styles.stepText}>{step}</span>
                    <div className={styles.stepActions}>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, 'up')}
                        className={styles.moveButton}
                        disabled={isSubmitting || index === 0}
                        aria-label="Move step up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStep(index, 'down')}
                        className={styles.moveButton}
                        disabled={isSubmitting || index === formData.workflowSteps.length - 1}
                        aria-label="Move step down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(step)}
                        className={styles.removeStepButton}
                        disabled={isSubmitting}
                        aria-label={`Remove step: ${step}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {errors.workflowSteps && (
              <span className={styles.fieldError} role="alert">
                {errors.workflowSteps}
              </span>
            )}
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
              {isSubmitting ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};