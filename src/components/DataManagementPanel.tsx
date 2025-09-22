import React, { useState, useRef } from 'react';
import { enhancedPersistenceService } from '../services/enhancedPersistence';
import styles from './DataManagementPanel.module.css';

interface DataManagementPanelProps {
  className?: string;
}

const DataManagementPanel: React.FC<DataManagementPanelProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [backups, setBackups] = useState(enhancedPersistenceService.getAvailableBackups());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateBackup = async () => {
    try {
      setIsLoading(true);
      const backupId = await enhancedPersistenceService.createBackup('Manual backup');
      setBackups(enhancedPersistenceService.getAvailableBackups());
      showMessage('success', `Backup created successfully: ${backupId}`);
    } catch (error) {
      showMessage('error', `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite your current data.')) {
      return;
    }

    try {
      setIsLoading(true);
      await enhancedPersistenceService.restoreFromBackup(backupId);
      showMessage('success', 'Backup restored successfully. Please refresh the page to see changes.');
    } catch (error) {
      showMessage('error', `Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    try {
      enhancedPersistenceService.exportData();
      showMessage('success', 'Data exported successfully');
    } catch (error) {
      showMessage('error', `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure you want to import this data? This will overwrite your current data.')) {
      return;
    }

    try {
      setIsLoading(true);
      await enhancedPersistenceService.importData(file);
      setBackups(enhancedPersistenceService.getAvailableBackups());
      showMessage('success', 'Data imported successfully. Please refresh the page to see changes.');
    } catch (error) {
      showMessage('error', `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCleanupStorage = async () => {
    if (!confirm('Are you sure you want to cleanup old data? This will remove old schedules and backups.')) {
      return;
    }

    try {
      setIsLoading(true);
      await enhancedPersistenceService.cleanupStorage();
      setBackups(enhancedPersistenceService.getAvailableBackups());
      showMessage('success', 'Storage cleanup completed successfully');
    } catch (error) {
      showMessage('error', `Failed to cleanup storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storageInfo = enhancedPersistenceService.getStorageInfo();

  return (
    <div className={`${styles.dataManagementPanel} ${className}`}>
      <div className={styles.header}>
        <h3>Data Management</h3>
        <p>Manage your data backups, exports, and storage</p>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Storage Information */}
      <div className={styles.section}>
        <h4>Storage Information</h4>
        <div className={styles.storageInfo}>
          <div className={styles.storageItem}>
            <span>Used Space:</span>
            <span>{formatSize(storageInfo.usedSpace)}</span>
          </div>
          <div className={styles.storageItem}>
            <span>Available:</span>
            <span>{storageInfo.available ? '✅ Yes' : '❌ Limited'}</span>
          </div>
          <div className={styles.storageBar}>
            <div 
              className={styles.storageUsed}
              style={{ width: `${Math.min((storageInfo.usedSpace / storageInfo.totalSpace) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Backup Management */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Backup Management</h4>
          <button 
            className={styles.primaryButton}
            onClick={handleCreateBackup}
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Backup'}
          </button>
        </div>

        <div className={styles.backupList}>
          {backups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No backups available</p>
              <p>Create your first backup to secure your data</p>
            </div>
          ) : (
            backups.map(backup => (
              <div key={backup.id} className={styles.backupItem}>
                <div className={styles.backupInfo}>
                  <div className={styles.backupId}>{backup.id}</div>
                  <div className={styles.backupMeta}>
                    <span>{formatDate(backup.timestamp)}</span>
                    <span>{formatSize(backup.size)}</span>
                    {backup.description && <span>{backup.description}</span>}
                  </div>
                </div>
                <button 
                  className={styles.secondaryButton}
                  onClick={() => handleRestoreBackup(backup.id)}
                  disabled={isLoading}
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Data Import/Export */}
      <div className={styles.section}>
        <h4>Data Import/Export</h4>
        <div className={styles.actionGrid}>
          <button 
            className={styles.secondaryButton}
            onClick={handleExportData}
            disabled={isLoading || backups.length === 0}
          >
            📤 Export Data
          </button>
          
          <label className={styles.fileInputLabel}>
            📥 Import Data
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportData}
              disabled={isLoading}
              className={styles.fileInput}
            />
          </label>
        </div>
      </div>

      {/* Storage Cleanup */}
      <div className={styles.section}>
        <h4>Storage Cleanup</h4>
        <p className={styles.sectionDescription}>
          Remove old schedules and excess backups to free up storage space
        </p>
        <button 
          className={styles.warningButton}
          onClick={handleCleanupStorage}
          disabled={isLoading}
        >
          🧹 Cleanup Storage
        </button>
      </div>

      {/* Auto-Save Status */}
      <div className={styles.section}>
        <h4>Auto-Save Status</h4>
        <div className={styles.statusGrid}>
          <div className={styles.statusItem}>
            <span>✅ Auto-save enabled</span>
            <small>Your data is automatically saved every few seconds</small>
          </div>
          <div className={styles.statusItem}>
            <span>🔄 Auto-backup enabled</span>
            <small>Automatic backups are created every 5 minutes</small>
          </div>
          <div className={styles.statusItem}>
            <span>💾 Local storage</span>
            <small>All data is stored locally in your browser</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementPanel;