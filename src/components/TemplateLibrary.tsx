import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { ContentTemplate } from '../types';
import { VirtualScrollList } from './VirtualScrollList';
import styles from './TemplateLibrary.module.css';

interface TemplateLibraryProps {
  onEditTemplate?: (template: ContentTemplate) => void;
  onCreateTemplate?: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = React.memo(({
  onEditTemplate,
  onCreateTemplate,
}) => {
  const { state, dispatch } = useAppContext();
  const { templates, channels } = state;
  const [selectedContentType, setSelectedContentType] = useState<'all' | 'video' | 'short' | 'post'>('all');

  // Memoized filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => 
      selectedContentType === 'all' || template.contentType === selectedContentType
    );
  }, [templates, selectedContentType]);

  // Memoized channel lookup map for performance
  const channelMap = useMemo(() => {
    return new Map(channels.map(channel => [channel.id, channel.name]));
  }, [channels]);

  // Memoized handlers
  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      dispatch({ type: 'DELETE_TEMPLATE', payload: templateId });
    }
  }, [dispatch]);

  const getChannelNames = useCallback((channelIds: string[]): string => {
    const channelNames = channelIds
      .map(id => channelMap.get(id))
      .filter(Boolean);
    return channelNames.length > 0 ? channelNames.join(', ') : 'No channels assigned';
  }, [channelMap]);

  const getTotalHours = useCallback((estimatedHours: ContentTemplate['estimatedHours']): number => {
    return estimatedHours.planning + estimatedHours.production + estimatedHours.editing + estimatedHours.publishing;
  }, []);

  // Template card renderer for virtual scrolling
  const renderTemplateCard = useCallback((template: ContentTemplate, index: number) => (
    <div key={template.id} className={styles.templateCard}>
      <div className={styles.templateHeader}>
        <h3 className={styles.templateName}>{template.name}</h3>
        <span className={`${styles.contentTypeBadge} ${styles[template.contentType]}`}>
          {template.contentType}
        </span>
      </div>

      <div className={styles.templateDetails}>
        <div className={styles.timeEstimate}>
          <strong>Total Time: {getTotalHours(template.estimatedHours)}h</strong>
          <div className={styles.timeBreakdown}>
            <span>Planning: {template.estimatedHours.planning}h</span>
            <span>Production: {template.estimatedHours.production}h</span>
            <span>Editing: {template.estimatedHours.editing}h</span>
            <span>Publishing: {template.estimatedHours.publishing}h</span>
          </div>
        </div>

        <div className={styles.workflowSteps}>
          <strong>Workflow Steps:</strong>
          <ul>
            {template.workflowSteps.map((step, stepIndex) => (
              <li key={stepIndex}>{step}</li>
            ))}
          </ul>
        </div>

        <div className={styles.assignedChannels}>
          <strong>Assigned Channels:</strong>
          <p>{getChannelNames(template.channelIds)}</p>
        </div>
      </div>

      <div className={styles.templateActions}>
        <button 
          className={styles.editButton}
          onClick={() => onEditTemplate?.(template)}
        >
          Edit
        </button>
        <button 
          className={styles.deleteButton}
          onClick={() => handleDeleteTemplate(template.id)}
        >
          Delete
        </button>
      </div>
    </div>
  ), [getTotalHours, getChannelNames, onEditTemplate, handleDeleteTemplate]);

  return (
    <div className={styles.templateLibrary}>
      <div className={styles.header}>
        <h2>Content Templates</h2>
        <button 
          className={styles.createButton}
          onClick={onCreateTemplate}
        >
          Create Template
        </button>
      </div>

      <div className={styles.filters}>
        <label htmlFor="contentTypeFilter">Filter by content type:</label>
        <select
          id="contentTypeFilter"
          value={selectedContentType}
          onChange={(e) => setSelectedContentType(e.target.value as typeof selectedContentType)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="video">Videos</option>
          <option value="short">Shorts</option>
          <option value="post">Posts</option>
        </select>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No templates found.</p>
          <button 
            className={styles.createFirstButton}
            onClick={onCreateTemplate}
          >
            Create your first template
          </button>
        </div>
      ) : filteredTemplates.length > 20 ? (
        // Use virtual scrolling for large lists
        <VirtualScrollList
          items={filteredTemplates}
          itemHeight={280} // Approximate height of template card
          containerHeight={600} // Fixed container height
          renderItem={renderTemplateCard}
          className={styles.virtualTemplateList}
        />
      ) : (
        // Use regular grid for smaller lists
        <div className={styles.templateGrid}>
          {filteredTemplates.map(template => renderTemplateCard(template, 0))}
        </div>
      )}
    </div>
  );
});