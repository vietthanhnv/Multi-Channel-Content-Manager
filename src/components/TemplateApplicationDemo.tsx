import React, { useState } from 'react';
import { AppProviderWithPersistence } from '../context/AppProviderWithPersistence';
import { ContentCreationForm } from './ContentCreationForm';
import { TemplateLibrary } from './TemplateLibrary';
import { TemplateEditor } from './TemplateEditor';
import { ContentTemplate, Task } from '../types';

export const TemplateApplicationDemo: React.FC = () => {
  const [activeView, setActiveView] = useState<'library' | 'create'>('library');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | undefined>();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined);
    setIsEditorOpen(true);
  };

  const handleEditTemplate = (template: ContentTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingTemplate(undefined);
  };

  const handleCreateContent = (channelId: string) => {
    setSelectedChannelId(channelId);
    setActiveView('create');
  };

  const handleContentSaved = (task: Task) => {
    console.log('Content created:', task);
    setActiveView('library');
  };

  const handleCancelContent = () => {
    setActiveView('library');
  };

  return (
    <AppProvider>
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <nav style={{ 
          background: '#343a40', 
          color: 'white', 
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Template Application Demo</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setActiveView('library')}
              style={{
                background: activeView === 'library' ? '#007bff' : 'transparent',
                color: 'white',
                border: '1px solid #007bff',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Template Library
            </button>
            <button
              onClick={() => handleCreateContent('demo-channel-1')}
              style={{
                background: activeView === 'create' ? '#28a745' : 'transparent',
                color: 'white',
                border: '1px solid #28a745',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Create Content
            </button>
          </div>
        </nav>

        {activeView === 'library' && (
          <TemplateLibrary
            onCreateTemplate={handleCreateTemplate}
            onEditTemplate={handleEditTemplate}
          />
        )}

        {activeView === 'create' && selectedChannelId && (
          <div style={{ padding: '2rem' }}>
            <ContentCreationForm
              channelId={selectedChannelId}
              onSave={handleContentSaved}
              onCancel={handleCancelContent}
            />
          </div>
        )}
        
        <TemplateEditor
          template={editingTemplate}
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
        />
      </div>
    </AppProvider>
  );
};