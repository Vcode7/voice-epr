import { DataTemplate } from '../types';

export interface ITemplateRepository {
  getTemplates(): Promise<DataTemplate[]>;
  getTemplateById(id: string): Promise<DataTemplate | null>;
  saveTemplate(template: DataTemplate): Promise<DataTemplate>;
  deleteTemplate(id: string): Promise<boolean>;
  getActiveTemplateId(): Promise<string>;
  setActiveTemplateId(id: string): Promise<void>;
  resetToDefaults(): Promise<DataTemplate[]>;
}
