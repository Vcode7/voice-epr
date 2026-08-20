import { useState, useEffect, useCallback } from 'react';
import { Debt } from '../types';
import { debtRepository } from '../repositories';

export const useDebts = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshDebts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await debtRepository.getDebts();
      setDebts(list);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDebts();
  }, [refreshDebts]);

  const addDebt = async (personName: string, amount: number, type: 'given' | 'borrowed', notes?: string) => {
    const d = await debtRepository.recordDebt(personName, amount, type, notes);
    await refreshDebts();
    return d;
  };

  const addRepayment = async (personName: string, amount: number) => {
    const updated = await debtRepository.recordRepayment(personName, amount);
    await refreshDebts();
    return updated;
  };

  const toggleSettled = async (id: string) => {
    const d = await debtRepository.toggleSettled(id);
    await refreshDebts();
    return d;
  };

  const removeDebt = async (id: string) => {
    const ok = await debtRepository.deleteDebt(id);
    await refreshDebts();
    return ok;
  };

  return {
    debts,
    loading,
    refreshDebts,
    addDebt,
    addRepayment,
    toggleSettled,
    removeDebt,
  };
};
