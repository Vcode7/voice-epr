import { useState, useEffect, useCallback } from 'react';
import { DataEntryRecord } from '../types';
import { dataEntryRepository } from '../repositories';

export const useDataEntries = (filterTemplateId?: string) => {
  const [dataEntries, setDataEntries] = useState<DataEntryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDataEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let list: DataEntryRecord[];
      if (filterTemplateId && filterTemplateId !== 'All') {
        list = await dataEntryRepository.getDataEntriesByTemplate(filterTemplateId);
      } else {
        list = await dataEntryRepository.getDataEntries();
      }
      setDataEntries(list);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data entries');
    } finally {
      setLoading(false);
    }
  }, [filterTemplateId]);

  useEffect(() => {
    refreshDataEntries();
  }, [refreshDataEntries]);

  const addDataEntry = async (data: Omit<DataEntryRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataEntryRecord> => {
    const created = await dataEntryRepository.createDataEntry(data);
    await refreshDataEntries();
    return created;
  };

  const updateDataEntry = async (id: string, updates: Partial<DataEntryRecord>): Promise<DataEntryRecord | null> => {
    const updated = await dataEntryRepository.updateDataEntry(id, updates);
    await refreshDataEntries();
    return updated;
  };

  const deleteDataEntry = async (id: string): Promise<boolean> => {
    const success = await dataEntryRepository.deleteDataEntry(id);
    await refreshDataEntries();
    return success;
  };

  return {
    dataEntries,
    loading,
    error,
    refreshDataEntries,
    addDataEntry,
    updateDataEntry,
    deleteDataEntry,
  };
};
