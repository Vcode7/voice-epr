import { useState, useEffect, useCallback } from 'react';
import { Receipt } from '../types';
import { receiptRepository } from '../repositories';

export const useReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await receiptRepository.getReceipts();
      setReceipts(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshReceipts();
  }, [refreshReceipts]);

  const addReceipt = async (data: Omit<Receipt, 'id' | 'createdAt' | 'receiptNumber'> & { receiptNumber?: string }) => {
    const receiptNumber = data.receiptNumber || (await receiptRepository.getNextReceiptNumber());
    const created = await receiptRepository.createReceipt({
      ...data,
      receiptNumber,
    });
    await refreshReceipts();
    return created;
  };

  const updateReceipt = async (id: string, updates: Partial<Receipt>) => {
    const updated = await receiptRepository.updateReceipt(id, updates);
    await refreshReceipts();
    return updated;
  };

  const deleteReceipt = async (id: string) => {
    const success = await receiptRepository.deleteReceipt(id);
    await refreshReceipts();
    return success;
  };

  return {
    receipts,
    loading,
    error,
    refreshReceipts,
    addReceipt,
    updateReceipt,
    deleteReceipt,
  };
};
