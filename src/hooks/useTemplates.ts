import { useState, useEffect, useCallback } from 'react';
import { DataTemplate } from '../types';
import { templateRepository } from '../repositories';
import { DEFAULT_MONITORING_DETAILS_TEMPLATE } from '../constants';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<DataTemplate[]>([DEFAULT_MONITORING_DETAILS_TEMPLATE]);
  const [activeTemplateId, setActiveTemplateIdState] = useState<string>(DEFAULT_MONITORING_DETAILS_TEMPLATE.id);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await templateRepository.getTemplates();
      const currentActiveId = await templateRepository.getActiveTemplateId();
      setTemplates(list);
      setActiveTemplateIdState(currentActiveId);
    } catch (e: any) {
      setError(e?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  const selectActiveTemplate = async (id: string) => {
    await templateRepository.setActiveTemplateId(id);
    setActiveTemplateIdState(id);
  };

  const saveTemplate = async (template: DataTemplate): Promise<DataTemplate> => {
    const saved = await templateRepository.saveTemplate(template);
    await refreshTemplates();
    return saved;
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    const success = await templateRepository.deleteTemplate(id);
    await refreshTemplates();
    return success;
  };

  const resetTemplates = async () => {
    const defaults = await templateRepository.resetToDefaults();
    setTemplates(defaults);
    setActiveTemplateIdState(DEFAULT_MONITORING_DETAILS_TEMPLATE.id);
  };

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0] || DEFAULT_MONITORING_DETAILS_TEMPLATE;

  return {
    templates,
    activeTemplate,
    activeTemplateId,
    loading,
    error,
    refreshTemplates,
    selectActiveTemplate,
    saveTemplate,
    deleteTemplate,
    resetTemplates,
  };
};
