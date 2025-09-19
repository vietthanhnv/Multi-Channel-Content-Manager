import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ContentTemplate, ContentType } from '../types';
import styles from './TemplatePicker.module.css';

interface TemplatePickerProps {
  contentType?: ContentType;
  channelId?: string;
  onSelectTemplate: (template: ContentTemplate | null) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  contentType,
  channelId,
  onSelectTemplate,
  onClose,
  isOpen,
}) => {
  const { state } = useAppContext();
  const { templates, channels } = state;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Filter templates based on content type and channel assignment
  const filteredTemplates = templates.filter(template => {
    const matchesContentType = !contentType || template.contentType === contentType;
    const matchesChannel = !channelId || template.channelIds.length === 0 || template.channelIds.includes(channelId);
    return matchesContentType && matchesChannel;
  });

  const handleSelectTemplate = () => {
    const selectedTemplate = selectedTemplateId 
      ? templates.find(t => t.id === selectedTemplateId) || null
      : null;
    onSelectTemplate(selectedTemplate);
    onClose();
  };

  const handleUseNoTemplate = () => {
    onSelectTemplate(null);
    onClose();
  };

  const getChannelNames = (channelIds: string[]): string => {
    if (channelIds.length === 0) return 'All channels';
    const channelNames = channelIds
      .map(id => channels.find(channel => channel.id === id)?.name)
      .filter(Boolean);
    return channelNames.join(', ');
  };

  const getTotalHours = (estimatedHours: ContentTemplate['estimatedHours']): number => {
    return estimatedHours.planning + estimatedHours.production + estimatedHours.editing + estimatedHours.publishing;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Select Template</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {filteredTemplates.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No templates available for this content type.</p>
              <button 
                className={styles.noTemplateButton}
                onClick={handleUseNoTemplate}
              >
                Continue without template
              </button>
            </div>
          ) : (
            <>
              <div className={styles.templateList}>
                <div className={styles.templateOption}>
                  <label className={styles.templateRadio}>
                    <input
                      type="radio"
                      name="template"
                      value=""
                      checked={selectedTemplateId === null}
                      onChange={() => setSelectedTemplateId(null)}
                    />
                    <div className={styles.templateCard}>
                      <div className={styles.templateHeader}>
                        <h3>No Template</h3>
                        <span className={styles.customBadge}>Custom</span>
                      </div>
                      <p className={styles.templateDescription}>
                        Start from scratch without using a template
                      </p>
                    </div>
                  </label>
                </div>

                {filteredTemplates.map(template => (
                  <div key={template.id} className={styles.templateOption}>
                    <label className={styles.templateRadio}>
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={selectedTemplateId === template.id}
                        onChange={() => setSelectedTemplateId(template.id)}
                      />
                      <div className={styles.templateCard}>
                        <div className={styles.templateHeader}>
                          <h3>{template.name}</h3>
                          <span className={`${styles.contentTypeBadge} ${styles[template.contentType]}`}>
                            {template.contentType}
                          </span>
                        </div>
                        
                        <div className={styles.templateDetails}>
                          <div className={styles.timeEstimate}>
                            <strong>Estimated Time: {getTotalHours(template.estimatedHours)}h</strong>
                            <div className={styles.timeBreakdown}>
                              <span>Planning: {template.estimatedHours.planning}h</span>
                              <span>Production: {template.estimatedHours.production}h</span>
                              <span>Editing: {template.estimatedHours.editing}h</span>
                              <span>Publishing: {template.estimatedHours.publishing}h</span>
                            </div>
                          </div>

                          <div className={styles.workflowPreview}>
                            <strong>Workflow Steps:</strong>
                            <ul>
                              {template.workflowSteps.slice(0, 3).map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                              {template.workflowSteps.length > 3 && (
                                <li className={styles.moreSteps}>
                                  +{template.workflowSteps.length - 3} more steps
                                </li>
                              )}
                            </ul>
                          </div>

                          <div className={styles.assignedChannels}>
                            <strong>Available for:</strong>
                            <span>{getChannelNames(template.channelIds)}</span>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className={styles.modalActions}>
                <button 
                  className={styles.cancelButton}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button 
                  className={styles.selectButton}
                  onClick={handleSelectTemplate}
                >
                  {selectedTemplateId ? 'Use Template' : 'Continue without template'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};