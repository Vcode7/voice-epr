import { useState, useEffect, useCallback } from 'react';
import { Transaction } from '../types';
import { transactionRepository } from '../repositories';

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactionRepository.getTransactions();
      setTransactions(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const created = await transactionRepository.createTransaction(data);
    await refreshTransactions();
    return created;
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updated = await transactionRepository.updateTransaction(id, updates);
    await refreshTransactions();
    return updated;
  };

  const deleteTransaction = async (id: string) => {
    const success = await transactionRepository.deleteTransaction(id);
    await refreshTransactions();
    return success;
  };

  return {
    transactions,
    loading,
    error,
    refreshTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
};
