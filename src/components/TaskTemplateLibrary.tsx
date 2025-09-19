import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { TaskTemplate } from '../types';
import { VirtualScrollList } from './VirtualScrollList';
import { TASK_CATEGORIES } from '../utils/constants';
import styles from './TaskTemplateLibrary.module.css';

interface TaskTemplateLibraryProps {
  onEditTemplate?: (template: TaskTemplate) => void;
  onCreateTemplate?: () => void;
}

export const TaskTemplateLibrary: React.FC<TaskTemplateLibraryProps> = React.memo(({
  onEditTemplate,
  onCreateTemplate,
}) => {
  const { state, dispatch } = useAppContext();
  const { taskTemplates } = state;
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'content-creation' | 'production' | 'marketing' | 'admin' | 'other'>('all');

  // Memoized filtered templates
  const filteredTemplates = useMemo(() => {
    return taskTemplates.filter(template => 
      selectedCategory === 'all' || template.category === selectedCategory
    );
  }, [taskTemplates, selectedCategory]);

  // Memoized handlers
  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (window.confirm('Are you sure you want to delete this task template?')) {
      dispatch({ type: 'DELETE_TASK_TEMPLATE', payload: templateId });
    }
  }, [dispatch]);

  // Template card renderer for virtual scrolling
  const renderTemplateCard = useCallback((template: TaskTemplate, index: number) => (
    <div key={template.id} className={styles.templateCard}>
      <div className={styles.templateHeader}>
        <h3 className={styles.templateTitle}>{template.title}</h3>
        <span className={`${styles.categoryBadge} ${styles[template.category]}`}>
          {TASK_CATEGORIES.find(cat => cat.value === template.category)?.label}
        </span>
      </div>

      <div className={styles.templateDetails}>
        <div className={styles.description}>
          <p>{template.description}</p>
        </div>

        <div className={styles.timeEstimate}>
          <strong>Estimated Time: {template.estimatedHours}h</strong>
        </div>

        {template.workflowSteps.length > 0 && (
          <div className={styles.workflowSteps}>
            <strong>Workflow Steps:</strong>
            <ul>
              {template.workflowSteps.map((step, stepIndex) => (
                <li key={stepIndex}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.templateMeta}>
          <small>Created: {new Date(template.createdAt).toLocaleDateString()}</small>
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
  ), [onEditTemplate, handleDeleteTemplate]);

  return (
    <div className={styles.taskTemplateLibrary}>
      <div className={styles.header}>
        <h2>Task Templates</h2>
        <button 
          className={styles.createButton}
          onClick={onCreateTemplate}
        >
          Create Task Template
        </button>
      </div>

      <div className={styles.filters}>
        <label htmlFor="categoryFilter">Filter by category:</label>
        <select
          id="categoryFilter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)}
          className={styles.filterSelect}
        >
          <option value="all">All Categories</option>
          {TASK_CATEGORIES.map(category => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📋</div>
          <h3>No Task Templates Yet</h3>
          <p>Create your first task template to define reusable work components for your YouTube channel workflow.</p>
          <button 
            className={styles.createFirstButton}
            onClick={onCreateTemplate}
          >
            Create Your First Task Template
          </button>
        </div>
      ) : filteredTemplates.length > 20 ? (
        // Use virtual scrolling for large lists
        <VirtualScrollList
          items={filteredTemplates}
          itemHeight={320} // Approximate height of template card
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