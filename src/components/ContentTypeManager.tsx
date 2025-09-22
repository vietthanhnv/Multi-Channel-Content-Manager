import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import styles from './ContentTypeManager.module.css';

interface ContentTypeManagerProps {
  selectedContentType: string;
  onContentTypeChange: (contentType: string) => void;
  disabled?: boolean;
}

export const ContentTypeManager: React.FC<ContentTypeManagerProps> = ({
  selectedContentType,
  onContentTypeChange,
  disabled = false
}) => {
  const { state, dispatch } = useAppContext();
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTypeName, setCustomTypeName] = useState('');
  const [error, setError] = useState('');

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('ContentTypeManager - Custom content types:', state.userSettings.customContentTypes);
  }

  // Get all content types (only custom types now)
  const customTypes = (state.userSettings.customContentTypes || []).map(type => ({
    value: type,
    label: type,
    isCustom: true
  }));

  const allContentTypes = customTypes;

  const handleAddCustomType = () => {
    const trimmedName = customTypeName.trim();
    
    // Validation
    if (!trimmedName) {
      setError('Content type name is required');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Content type name must be 50 characters or less');
      return;
    }

    // Check if already exists (case insensitive)
    const existingTypes = customTypes.map(t => t.label.toLowerCase());
    if (existingTypes.includes(trimmedName.toLowerCase())) {
      setError('This content type already exists');
      return;
    }

    // Add to user settings
    const updatedCustomTypes = [...(state.userSettings.customContentTypes || []), trimmedName];
    dispatch({
      type: 'UPDATE_USER_SETTINGS',
      payload: { customContentTypes: updatedCustomTypes }
    });

    // Select the new content type
    onContentTypeChange(trimmedName);

    // Reset form
    setCustomTypeName('');
    setIsAddingCustom(false);
    setError('');
  };

  const handleDeleteCustomType = (typeToDelete: string) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete the content type "${typeToDelete}"?`)) {
      return;
    }

    // Remove from user settings
    const updatedCustomTypes = (state.userSettings.customContentTypes || []).filter(
      type => type !== typeToDelete
    );
    dispatch({
      type: 'UPDATE_USER_SETTINGS',
      payload: { customContentTypes: updatedCustomTypes }
    });

    // If the deleted type was selected, switch to first available type or empty
    if (selectedContentType === typeToDelete) {
      const remainingTypes = updatedCustomTypes;
      if (remainingTypes.length > 0) {
        onContentTypeChange(remainingTypes[0]);
      } else {
        onContentTypeChange('');
      }
    }
  };

  const handleCancelAdd = () => {
    setIsAddingCustom(false);
    setCustomTypeName('');
    setError('');
  };

  return (
    <div className={styles.contentTypeManager}>
      <label htmlFor="contentType" className={styles.label}>
        Content Type *
      </label>
      
      <div className={styles.contentTypeSelector}>
        <select
          id="contentType"
          value={selectedContentType}
          onChange={(e) => onContentTypeChange(e.target.value)}
          className={styles.select}
          disabled={disabled}
        >
          {allContentTypes.length === 0 ? (
            <option value="">No content types - add one below</option>
          ) : (
            allContentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))
          )}
        </select>

        <button
          type="button"
          onClick={() => setIsAddingCustom(true)}
          className={styles.addButton}
          disabled={disabled || isAddingCustom}
          title="Add content type"
        >
          +
        </button>
      </div>

      {/* Add Custom Type Form */}
      {isAddingCustom && (
        <div className={styles.addCustomForm}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={customTypeName}
              onChange={(e) => {
                setCustomTypeName(e.target.value);
                setError('');
              }}
              placeholder="Enter custom content type"
              className={`${styles.customInput} ${error ? styles.inputError : ''}`}
              maxLength={50}
              disabled={disabled}
              autoFocus
            />
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={handleAddCustomType}
                className={styles.saveButton}
                disabled={disabled || !customTypeName.trim()}
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelAdd}
                className={styles.cancelButton}
                disabled={disabled}
              >
                Cancel
              </button>
            </div>
          </div>
          {error && (
            <span className={styles.error} role="alert">
              {error}
            </span>
          )}
        </div>
      )}

      {/* Content Types Management */}
      {customTypes.length > 0 ? (
        <div className={styles.customTypesList}>
          <h4 className={styles.customTypesTitle}>
            Your Content Types
          </h4>
          <div className={styles.customTypesGrid}>
            {customTypes.map(type => (
              <div key={type.value} className={styles.customTypeItem}>
                <span className={styles.customTypeName}>{type.label}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomType(type.value)}
                  className={styles.deleteButton}
                  disabled={disabled}
                  title={`Delete content type: ${type.label}`}
                  aria-label={`Delete content type ${type.label}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            No content types yet. Click the "+" button above to add your first content type.
          </p>
        </div>
      )}
    </div>
  );
};