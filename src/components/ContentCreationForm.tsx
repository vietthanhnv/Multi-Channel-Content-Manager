import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useUserSettings } from '../hooks/useUserSettings';
import { TemplatePicker } from './TemplatePicker';
import { ContentTemplate, ContentType, Task } from '../types';
import { generateId } from '../utils/helpers';
import { UserSettingsIntegrationService } from '../services/userSettingsIntegration';
import styles from './ContentCreationForm.module.css';

interface ContentCreationFormProps {
  channelId: string;
  onSave?: (task: Task) => void;
  onCancel?: () => void;
}

export const ContentCreationForm: React.FC<ContentCreationFormProps> = ({
  channelId,
  onSave,
  onCancel,
}) => {
  const { state, dispatch } = useAppContext();
  const { channels } = state;
  const { userSettings } = useUserSettings();

  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    contentType: 'video' as ContentType,
    estimatedHours: 0,
    workflowSteps: [] as string[],
    notes: '',
    scheduledStart: '',
    scheduledEnd: '',
  });

  const channel = channels.find(c => c.id === channelId);

  // Generate default scheduling times based on user settings
  const getDefaultSchedulingTimes = () => {
    const defaultDuration = selectedTemplate 
      ? Object.values(selectedTemplate.estimatedHours).reduce((sum, hours) => sum + hours, 0)
      : 2;
    
    return UserSettingsIntegrationService.getDefaultSchedulingTime(
      userSettings,
      undefined,
      defaultDuration
    );
  };

  // Apply template data when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      const totalHours = Object.values(selectedTemplate.estimatedHours).reduce((sum, hours) => sum + hours, 0);
      const defaultTimes = getDefaultSchedulingTimes();
      
      setFormData(prev => ({
        ...prev,
        contentType: selectedTemplate.contentType,
        estimatedHours: totalHours,
        workflowSteps: [...selectedTemplate.workflowSteps],
        scheduledStart: prev.scheduledStart || defaultTimes.start,
        scheduledEnd: prev.scheduledEnd || defaultTimes.end,
      }));
    }
  }, [selectedTemplate, userSettings]);

  // Set default scheduling times when component mounts
  useEffect(() => {
    if (!formData.scheduledStart && !formData.scheduledEnd) {
      const defaultTimes = getDefaultSchedulingTimes();
      setFormData(prev => ({
        ...prev,
        scheduledStart: defaultTimes.start,
        scheduledEnd: defaultTimes.end,
      }));
    }
  }, [userSettings]);

  const handleTemplateSelect = (template: ContentTemplate | null) => {
    setSelectedTemplate(template);
    if (!template) {
      // Reset to default values when no template is selected
      setFormData(prev => ({
        ...prev,
        estimatedHours: 0,
        workflowSteps: [],
      }));
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWorkflowStepChange = (index: number, value: string) => {
    const newSteps = [...formData.workflowSteps];
    newSteps[index] = value;
    setFormData(prev => ({ ...prev, workflowSteps: newSteps }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a title for the content');
      return;
    }

    if (!formData.scheduledStart || !formData.scheduledEnd) {
      alert('Please set start and end times');
      return;
    }

    const task: Task = {
      id: generateId(),
      channelId,
      templateId: selectedTemplate?.id,
      title: formData.title,
      contentType: formData.contentType,
      estimatedHours: formData.estimatedHours,
      status: 'planned',
      scheduledStart: new Date(formData.scheduledStart),
      scheduledEnd: new Date(formData.scheduledEnd),
      notes: formData.notes || undefined,
    };

    dispatch({ type: 'ADD_TASK', payload: task });
    onSave?.(task);
  };

  const getTemplateInfo = () => {
    if (!selectedTemplate) return null;
    
    const totalHours = Object.values(selectedTemplate.estimatedHours).reduce((sum, hours) => sum + hours, 0);
    return {
      name: selectedTemplate.name,
      totalHours,
      breakdown: selectedTemplate.estimatedHours,
    };
  };

  return (
    <div className={styles.contentCreationForm}>
      <div className={styles.header}>
        <h2>Create Content</h2>
        {channel && (
          <div className={styles.channelInfo}>
            <span className={styles.channelName}>{channel.name}</span>
            <span className={styles.channelType}>({channel.contentType})</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.templateSection}>
          <div className={styles.templateHeader}>
            <h3>Template</h3>
            <button
              type="button"
              className={styles.selectTemplateButton}
              onClick={() => setIsTemplatePickerOpen(true)}
            >
              {selectedTemplate ? 'Change Template' : 'Select Template'}
            </button>
          </div>

          {selectedTemplate ? (
            <div className={styles.selectedTemplate}>
              <div className={styles.templateInfo}>
                <h4>{selectedTemplate.name}</h4>
                <span className={`${styles.contentTypeBadge} ${styles[selectedTemplate.contentType]}`}>
                  {selectedTemplate.contentType}
                </span>
              </div>
              <div className={styles.templateDetails}>
                <div className={styles.timeEstimate}>
                  <strong>Estimated Time: {getTemplateInfo()?.totalHours}h</strong>
                  <div className={styles.timeBreakdown}>
                    <span>Planning: {selectedTemplate.estimatedHours.planning}h</span>
                    <span>Production: {selectedTemplate.estimatedHours.production}h</span>
                    <span>Editing: {selectedTemplate.estimatedHours.editing}h</span>
                    <span>Publishing: {selectedTemplate.estimatedHours.publishing}h</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.noTemplate}>
              <p>No template selected. You can create content from scratch or select a template to pre-populate fields.</p>
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="title">Content Title *</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter content title"
            required
          />
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
          <label htmlFor="estimatedHours">Estimated Hours</label>
          <input
            id="estimatedHours"
            type="number"
            min="0"
            step="0.5"
            value={formData.estimatedHours}
            onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Workflow Steps</label>
          {formData.workflowSteps.length === 0 ? (
            <div className={styles.noWorkflowSteps}>
              <p>No workflow steps defined.</p>
              <button
                type="button"
                onClick={addWorkflowStep}
                className={styles.addStepButton}
              >
                Add First Step
              </button>
            </div>
          ) : (
            <>
              {formData.workflowSteps.map((step, index) => (
                <div key={index} className={styles.workflowStep}>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleWorkflowStepChange(index, e.target.value)}
                    placeholder={`Step ${index + 1}`}
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
            </>
          )}
        </div>

        <div className={styles.scheduleGroup}>
          <div className={styles.formGroup}>
            <label htmlFor="scheduledStart">Start Time *</label>
            <input
              id="scheduledStart"
              type="datetime-local"
              value={formData.scheduledStart}
              onChange={(e) => handleInputChange('scheduledStart', e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="scheduledEnd">End Time *</label>
            <input
              id="scheduledEnd"
              type="datetime-local"
              value={formData.scheduledEnd}
              onChange={(e) => handleInputChange('scheduledEnd', e.target.value)}
              required
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes or requirements"
            rows={3}
          />
        </div>

        <div className={styles.formActions}>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <button type="submit" className={styles.saveButton}>
            Create Content
          </button>
        </div>
      </form>

      <TemplatePicker
        contentType={formData.contentType}
        channelId={channelId}
        onSelectTemplate={handleTemplateSelect}
        onClose={() => setIsTemplatePickerOpen(false)}
        isOpen={isTemplatePickerOpen}
      />
    </div>
  );
};