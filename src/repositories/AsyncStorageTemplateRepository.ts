import { ITemplateRepository } from './ITemplateRepository';
import { DataTemplate } from '../types';
import { storageWrapper } from '../storage/asyncStorageWrapper';
import { STORAGE_KEYS, DEFAULT_MONITORING_DETAILS_TEMPLATE, SYSTEM_DEFAULT_TEMPLATES } from '../constants';
import { ApiClient } from '../services/api/apiClient';

export class AsyncStorageTemplateRepository implements ITemplateRepository {
  private async loadLocal(): Promise<DataTemplate[]> {
    const json = await storageWrapper.getItem(STORAGE_KEYS.TEMPLATES);
    if (!json) {
      const initial = SYSTEM_DEFAULT_TEMPLATES;
      await this.saveLocal(initial);
      return initial;
    }
    try {
      const parsed: DataTemplate[] = JSON.parse(json);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const initial = SYSTEM_DEFAULT_TEMPLATES;
        await this.saveLocal(initial);
        return initial;
      }
      return parsed;
    } catch {
      const initial = SYSTEM_DEFAULT_TEMPLATES;
      await this.saveLocal(initial);
      return initial;
    }
  }

  private async saveLocal(templates: DataTemplate[]): Promise<void> {
    await storageWrapper.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  }

  async getTemplates(): Promise<DataTemplate[]> {
    try {
      const remote = await ApiClient.getTemplates();
      if (Array.isArray(remote) && remote.length > 0) {
        await this.saveLocal(remote);
        return remote;
      }
    } catch (e) {
      console.warn('⚠️ API getTemplates failed, using local cache:', e);
    }
    return this.loadLocal();
  }

  async getTemplateById(id: string): Promise<DataTemplate | null> {
    const list = await this.getTemplates();
    return list.find((t) => t.id === id) || null;
  }

  async saveTemplate(template: DataTemplate): Promise<DataTemplate> {
    try {
      const remote = await ApiClient.saveTemplate(template);
      const list = await this.loadLocal();
      const idx = list.findIndex((t) => t.id === remote.id);
      if (idx !== -1) list[idx] = remote;
      else list.push(remote);
      await this.saveLocal(list);
      return remote;
    } catch (e) {
      console.warn('⚠️ API saveTemplate failed, saving locally:', e);
      const list = await this.loadLocal();
      const now = new Date().toISOString();
      const existingIndex = list.findIndex((t) => t.id === template.id);

      let saved: DataTemplate;
      if (existingIndex !== -1) {
        saved = {
          ...template,
          updatedAt: now,
        };
        list[existingIndex] = saved;
      } else {
        saved = {
          ...template,
          id: template.id || `template_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          createdAt: template.createdAt || now,
          updatedAt: now,
        };
        list.push(saved);
      }

      await this.saveLocal(list);
      return saved;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (id === DEFAULT_MONITORING_DETAILS_TEMPLATE.id) {
      return false;
    }
    try {
      await ApiClient.deleteTemplate(id);
    } catch (e) {
      console.warn('⚠️ API deleteTemplate failed:', e);
    }
    const list = await this.loadLocal();
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;

    await this.saveLocal(filtered);

    const activeId = await this.getActiveTemplateId();
    if (activeId === id) {
      await this.setActiveTemplateId(DEFAULT_MONITORING_DETAILS_TEMPLATE.id);
    }

    return true;
  }

  async getActiveTemplateId(): Promise<string> {
    const id = await storageWrapper.getItem(STORAGE_KEYS.ACTIVE_TEMPLATE_ID);
    if (id && id.trim() !== '') {
      return id;
    }
    return DEFAULT_MONITORING_DETAILS_TEMPLATE.id;
  }

  async setActiveTemplateId(id: string): Promise<void> {
    await storageWrapper.setItem(STORAGE_KEYS.ACTIVE_TEMPLATE_ID, id);
  }

  async resetToDefaults(): Promise<DataTemplate[]> {
    try {
      const remote = await ApiClient.resetTemplates();
      if (Array.isArray(remote)) {
        await this.saveLocal(remote);
        await this.setActiveTemplateId(DEFAULT_MONITORING_DETAILS_TEMPLATE.id);
        return remote;
      }
    } catch {}
    const initial = [DEFAULT_MONITORING_DETAILS_TEMPLATE];
    await this.saveLocal(initial);
    await this.setActiveTemplateId(DEFAULT_MONITORING_DETAILS_TEMPLATE.id);
    return initial;
  }
}
