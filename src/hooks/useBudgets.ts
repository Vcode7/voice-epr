import { useState, useEffect, useCallback } from 'react';
import { Budget } from '../types';
import { budgetRepository } from '../repositories';

export const useBudgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const list = await budgetRepository.getBudgets();
      setBudgets(list);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBudgets();
  }, [refreshBudgets]);

  const saveBudget = async (category: string, amount: number, period: 'monthly' | 'weekly' | 'yearly' = 'monthly') => {
    const saved = await budgetRepository.setBudget(category, amount, period);
    await refreshBudgets();
    return saved;
  };

  const removeBudget = async (id: string) => {
    const ok = await budgetRepository.deleteBudget(id);
    await refreshBudgets();
    return ok;
  };

  return {
    budgets,
    loading,
    refreshBudgets,
    saveBudget,
    removeBudget,
  };
};
