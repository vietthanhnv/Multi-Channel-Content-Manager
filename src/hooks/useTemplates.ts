import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { ContentTemplate, ContentType } from '../types';

export const useTemplates = () => {
  const { state, dispatch } = useAppContext();

  const addTemplate = useCallback((template: ContentTemplate) => {
    dispatch({ type: 'ADD_TEMPLATE', payload: template });
  }, [dispatch]);

  const updateTemplate = useCallback((id: string, updates: Partial<ContentTemplate>) => {
    dispatch({ type: 'UPDATE_TEMPLATE', payload: { id, updates } });
  }, [dispatch]);

  const deleteTemplate = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TEMPLATE', payload: id });
  }, [dispatch]);

  const getTemplateById = useCallback((id: string) => {
    return state.templates.find(template => template.id === id);
  }, [state.templates]);

  const getTemplatesByContentType = useCallback((contentType: ContentType) => {
    return state.templates.filter(template => template.contentType === contentType);
  }, [state.templates]);

  const getTemplatesByChannel = useCallback((channelId: string) => {
    return state.templates.filter(template => 
      template.channelIds.includes(channelId)
    );
  }, [state.templates]);

  const getTotalEstimatedHours = useCallback((template: ContentTemplate) => {
    const { planning, production, editing, publishing } = template.estimatedHours;
    return planning + production + editing + publishing;
  }, []);

  return {
    templates: state.templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    getTemplatesByContentType,
    getTemplatesByChannel,
    getTotalEstimatedHours,
  };
};