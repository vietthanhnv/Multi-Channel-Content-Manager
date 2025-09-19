import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ContentTemplate, ContentType } from '../types';
import { generateId } from '../utils/helpers';
import styles from './TemplateEditor.module.css';

interface TemplateEditorProps {
  template?: ContentTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (template: ContentTemplate) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  isOpen,
  onClose,
  onSave,
}) => {
  const { state, dispatch } = useAppContext();
  const { channels } = state;

  const [formData, setFormData] = useState<Omit<ContentTemplate, 'id'>>({
    name: '',
    contentType: 'video',
    estimatedHours: {
      planning: 0,
      production: 0,
      editing: 0,
      publishing: 0,
    },
    workflowSteps: [''],
    channelIds: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        contentType: template.contentType,
        estimatedHours: { ...template.estimatedHours },
        workflowSteps: [...template.workflowSteps],
        channelIds: [...template.channelIds],
      });
    } else {
      setFormData({
        name: '',
        contentType: 'video',
        estimatedHours: {
          planning: 0,
          production: 0,
          editing: 0,
          publishing: 0,
        },
        workflowSteps: [''],
        channelIds: [],
      });
    }
    setErrors({});
  }, [template, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (formData.workflowSteps.filter(step => step.trim()).length === 0) {
      newErrors.workflowSteps = 'At least one workflow step is required';
    }

    const totalHours = Object.values(formData.estimatedHours).reduce((sum, hours) => sum + hours, 0);
    if (totalHours <= 0) {
      newErrors.estimatedHours = 'Total estimated hours must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const templateData: ContentTemplate = {
      id: template?.id || generateId(),
      ...formData,
      workflowSteps: formData.workflowSteps.filter(step => step.trim()),
    };

    if (template) {
      dispatch({ type: 'UPDATE_TEMPLATE', payload: { id: template.id, updates: templateData } });
    } else {
      dispatch({ type: 'ADD_TEMPLATE', payload: templateData });
    }

    onSave?.(templateData);
    onClose();
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEstimatedHoursChange = (phase: keyof ContentTemplate['estimatedHours'], value: number) => {
    setFormData(prev => ({
      ...prev,
      estimatedHours: {
        ...prev.estimatedHours,
        [phase]: Math.max(0, value),
      },
    }));
    if (errors.estimatedHours) {
      setErrors(prev => ({ ...prev, estimatedHours: '' }));
    }
  };

  const handleWorkflowStepChange = (index: number, value: string) => {
    const newSteps = [...formData.workflowSteps];
    newSteps[index] = value;
    setFormData(prev => ({ ...prev, workflowSteps: newSteps }));
    if (errors.workflowSteps) {
      setErrors(prev => ({ ...prev, workflowSteps: '' }));
    }
  };

  const addWorkflowStep = () => {
    setFormData(prev => ({
      ...prev,
      workflowSteps: [...prev.workflowSteps, ''],
    }));
  };

  const removeWorkflowStep = (index: number) => {
    if (formData.workflowSteps.length > 1) {
      const newSteps = formData.workflowSteps.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, workflowSteps: newSteps }));
    }
  };

  const handleChannelSelection = (channelId: string, isSelected: boolean) => {
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        channelIds: [...prev.channelIds, channelId],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        channelIds: prev.channelIds.filter(id => id !== channelId),
      }));
    }
  };

  const getTotalHours = (): number => {
    return Object.values(formData.estimatedHours).reduce((sum, hours) => sum + hours, 0);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{template ? 'Edit Template' : 'Create New Template'}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="templateName">Template Name *</label>
            <input
              id="templateName"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? styles.inputError : ''}
              placeholder="e.g., Gaming Video Template"
            />
            {errors.name && <span className={styles.errorText}>{errors.name}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="contentType">Content Type *</label>
            <select
              id="contentType"
              value={formData.contentType}
              onChange={(e) => handleInputChange('contentType', e.target.value as ContentType)}
            >
              <option value="video">Video</option>
              <option value="short">Short</option>
              <option value="post">Post</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>Time Estimates (hours) *</label>
            <div className={styles.timeEstimates}>
              <div className={styles.timeInput}>
                <label htmlFor="planning">Planning</label>
                <input
                  id="planning"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours.planning}
                  onChange={(e) => handleEstimatedHoursChange('planning', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className={styles.timeInput}>
                <label htmlFor="production">Production</label>
                <input
                  id="production"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours.production}
                  onChange={(e) => handleEstimatedHoursChange('production', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className={styles.timeInput}>
                <label htmlFor="editing">Editing</label>
                <input
                  id="editing"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours.editing}
                  onChange={(e) => handleEstimatedHoursChange('editing', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className={styles.timeInput}>
                <label htmlFor="publishing">Publishing</label>
                <input
                  id="publishing"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours.publishing}
                  onChange={(e) => handleEstimatedHoursChange('publishing', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className={styles.totalHours}>
              Total: {getTotalHours()} hours
            </div>
            {errors.estimatedHours && <span className={styles.errorText}>{errors.estimatedHours}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Workflow Steps *</label>
            {formData.workflowSteps.map((step, index) => (
              <div key={index} className={styles.workflowStep}>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => handleWorkflowStepChange(index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                  className={errors.workflowSteps ? styles.inputError : ''}
                />
                {formData.workflowSteps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWorkflowStep(index)}
                    className={styles.removeStepButton}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addWorkflowStep}
              className={styles.addStepButton}
            >
              Add Step
            </button>
            {errors.workflowSteps && <span className={styles.errorText}>{errors.workflowSteps}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Assign to Channels</label>
            <div className={styles.channelSelection}>
              {channels.length === 0 ? (
                <p className={styles.noChannels}>No channels available. Create channels first.</p>
              ) : (
                channels.map(channel => (
                  <label key={channel.id} className={styles.channelCheckbox}>
                    <input
                      type="checkbox"
                      checked={formData.channelIds.includes(channel.id)}
                      onChange={(e) => handleChannelSelection(channel.id, e.target.checked)}
                    />
                    <span className={styles.channelName}>{channel.name}</span>
                    <span className={styles.channelType}>({channel.contentType})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              {template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};