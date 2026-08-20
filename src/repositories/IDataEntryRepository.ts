import { DataEntryRecord } from '../types';

export interface IDataEntryRepository {
  getDataEntries(): Promise<DataEntryRecord[]>;
  getDataEntryById(id: string): Promise<DataEntryRecord | null>;
  createDataEntry(data: Omit<DataEntryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataEntryRecord>;
  updateDataEntry(id: string, updates: Partial<DataEntryRecord>): Promise<DataEntryRecord | null>;
  deleteDataEntry(id: string): Promise<boolean>;
  getDataEntriesByTemplate(templateId: string): Promise<DataEntryRecord[]>;
  clearAllDataEntries(): Promise<void>;
  saveMultipleDataEntries(entries: DataEntryRecord[]): Promise<void>;
}
