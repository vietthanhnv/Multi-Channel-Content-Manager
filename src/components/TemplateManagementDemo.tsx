import React, { useState } from 'react';
import { AppProviderWithPersistence } from '../context/AppProviderWithPersistence';
import { TemplateLibrary } from './TemplateLibrary';
import { TemplateEditor } from './TemplateEditor';
import { ContentTemplate } from '../types';

export const TemplateManagementDemo: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContentTemplate | undefined>();

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

  return (
    <AppProvider>
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <TemplateLibrary
          onCreateTemplate={handleCreateTemplate}
          onEditTemplate={handleEditTemplate}
        />
        
        <TemplateEditor
          template={editingTemplate}
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
        />
      </div>
    </AppProvider>
  );
};