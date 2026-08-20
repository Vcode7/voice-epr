'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { Transaction, Budget, Debt } from '@/types';
import { AnalyticsEngine } from '@/lib/analytics/analyticsEngine';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<'this_month' | 'this_week' | 'all'>('this_month');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Budget Modal State
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudCat, setNewBudCat] = useState('Groceries');
  const [newBudAmt, setNewBudAmt] = useState('');

  // Debt Modal State
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [newDebtName, setNewDebtName] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtType, setNewDebtType] = useState<'given' | 'borrowed'>('given');
  const [newDebtNotes, setNewDebtNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, budRes, debtRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/budgets'),
        fetch('/api/debts'),
      ]);
      const txs = await txRes.json();
      const buds = await budRes.json();
      const dbts = await debtRes.json();

      if (Array.isArray(txs)) setTransactions(txs);
      if (Array.isArray(buds)) setBudgets(buds);
      if (Array.isArray(dbts)) setDebts(dbts);
    } catch (e) {
      console.error('Failed to fetch analytics data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const overview = AnalyticsEngine.calculateOverview(transactions, period);
  const insights = AnalyticsEngine.generateInsights(transactions, budgets);
  const budgetStatuses = AnalyticsEngine.calculateBudgetStatuses(transactions, budgets);

  const handleCreateBudget = async () => {
    const amt = parseFloat(newBudAmt);
    if (isNaN(amt) || amt <= 0) return;
    await fetch('/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newBudCat, amount: amt }),
    });
    setNewBudAmt('');
    setShowAddBudget(false);
    fetchData();
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Delete this budget limit?')) return;
    await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleCreateDebt = async () => {
    const amt = parseFloat(newDebtAmount);
    if (!newDebtName.trim() || isNaN(amt) || amt <= 0) return;
    await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personName: newDebtName.trim(),
        amount: amt,
        type: newDebtType,
        notes: newDebtNotes.trim() || null,
      }),
    });
    setNewDebtName('');
    setNewDebtAmount('');
    setNewDebtNotes('');
    setShowAddDebt(false);
    fetchData();
  };

  const handleToggleSettled = async (id: string) => {
    await fetch(`/api/debts/${id}/toggle`, { method: 'POST' });
    fetchData();
  };

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Delete this debt record?')) return;
    await fetch(`/api/debts/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header with Period Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Financial Intelligence & Analytics</h1>
          <p className="text-xs text-textMuted mt-1">
            Real-time cash flow overview, AI spending insights, category budgets, and debt ledger.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex bg-card p-1 rounded-xl border border-cardBorder">
          {[
            { key: 'this_month', label: 'This Month' },
            { key: 'this_week', label: 'This Week' },
            { key: 'all', label: 'All Time' },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                period === p.key
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'text-textMuted hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-2xl bg-card border border-cardBorder shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-textSubtle">Total Income</span>
            <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-secondary mt-2">
            {formatCurrency(overview.totalIncome)}
          </div>
          <div className="text-xs text-textMuted mt-1">
            {period === 'this_month' ? 'Earned this month' : 'Inflow balance'}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-cardBorder shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-textSubtle">Total Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2">
            {formatCurrency(overview.totalExpense)}
          </div>
          <div className="text-xs text-textMuted mt-1">
            Across {overview.transactionCount} transaction{overview.transactionCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-cardBorder shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-textSubtle">Net Balance</span>
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold mt-2 ${
              overview.netBalance >= 0 ? 'text-primary' : 'text-danger'
            }`}
          >
            {formatCurrency(overview.netBalance)}
          </div>
          <div className="text-xs text-textMuted mt-1">
            {overview.netBalance >= 0 ? 'Surplus savings' : 'Deficit spending'}
          </div>
        </div>
      </div>

      {/* AI Financial Insights */}
      <div className="bg-card border border-cardBorder rounded-2xl p-6 shadow-md space-y-3 relative overflow-hidden">
        <div className="flex items-center space-x-2 text-accent font-bold text-sm">
          <Sparkles className="w-4 h-4" />
          <span>AI Financial Insights</span>
        </div>

        <div className="space-y-2 pt-1">
          {insights.map((insight, idx) => (
            <div key={idx} className="flex items-start space-x-2.5 text-xs text-text leading-relaxed">
              <span className="text-accent font-bold text-base leading-none">•</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown Section */}
      <div className="bg-card border border-cardBorder rounded-2xl p-6 shadow-md space-y-6">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider">
          Category Spending Breakdown
        </h2>

        {overview.categoryBreakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-textSubtle">
            No expenses found for this period.
          </div>
        ) : (
          <div className="space-y-4">
            {overview.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-text">{cat.category}</span>
                  <span className="text-textMuted">
                    {formatCurrency(cat.total)} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cardBorder">
                  <div
                    className="h-full bg-gradient-to-r from-primaryDark to-primary rounded-full transition-all"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budgets & Debts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Budgets */}
        <div className="bg-card border border-cardBorder rounded-2xl p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">
              Category Budgets ({budgets.length})
            </h2>
            <button
              onClick={() => setShowAddBudget(!showAddBudget)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddBudget ? 'Cancel' : 'Set Budget'}
            </button>
          </div>

          {showAddBudget && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-cardBorder space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-textSubtle block mb-1">
                    Category
                  </label>
                  <select
                    value={newBudCat}
                    onChange={(e) => setNewBudCat(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-textSubtle block mb-1">
                    Monthly Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={newBudAmt}
                    onChange={(e) => setNewBudAmt(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateBudget}
                className="w-full py-2 rounded-lg bg-primary hover:bg-primaryDark text-white text-xs font-bold transition cursor-pointer"
              >
                Save Budget
              </button>
            </div>
          )}

          <div className="space-y-3.5">
            {budgetStatuses.length === 0 ? (
              <div className="py-6 text-center text-xs text-textSubtle">
                No budgets set. Click "+ Set Budget" to establish spending caps!
              </div>
            ) : (
              budgetStatuses.map((bs) => (
                <div
                  key={bs.budget.id}
                  className="p-3.5 rounded-xl bg-slate-900/50 border border-cardBorder space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text">{bs.budget.category}</span>
                      {bs.isOverBudget && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/20 text-danger border border-danger/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Over Budget
                        </span>
                      )}
                      {bs.isNearLimit && !bs.isOverBudget && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {bs.percentage}% spent
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-textMuted">
                        {formatCurrency(bs.spent)} / {formatCurrency(bs.budget.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteBudget(bs.budget.id)}
                        className="text-textSubtle hover:text-danger p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-cardBorder/50">
                    <div
                      className={`h-full rounded-full transition-all ${
                        bs.isOverBudget ? 'bg-danger' : bs.isNearLimit ? 'bg-amber-400' : 'bg-secondary'
                      }`}
                      style={{ width: `${Math.min(100, bs.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Debt Ledger (Lent vs Borrowed) */}
        <div className="bg-card border border-cardBorder rounded-2xl p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Debt Ledger ({debts.length})
            </h2>
            <button
              onClick={() => setShowAddDebt(!showAddDebt)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddDebt ? 'Cancel' : 'Add Debt'}
            </button>
          </div>

          {showAddDebt && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-cardBorder space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-semibold text-textSubtle block mb-1">
                    Person Name
                  </label>
                  <input
                    type="text"
                    value={newDebtName}
                    onChange={(e) => setNewDebtName(e.target.value)}
                    placeholder="e.g. Rohan"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-semibold text-textSubtle block mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newDebtAmount}
                    onChange={(e) => setNewDebtAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewDebtType('given')}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                    newDebtType === 'given'
                      ? 'bg-secondary/20 text-secondary border-secondary/40'
                      : 'bg-background text-textMuted border-cardBorder'
                  }`}
                >
                  I Lent (They Owe Me)
                </button>
                <button
                  type="button"
                  onClick={() => setNewDebtType('borrowed')}
                  className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                    newDebtType === 'borrowed'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : 'bg-background text-textMuted border-cardBorder'
                  }`}
                >
                  I Borrowed (I Owe Them)
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={newDebtNotes}
                  onChange={(e) => setNewDebtNotes(e.target.value)}
                  placeholder="Notes (e.g. Dinner split)..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none"
                />
              </div>

              <button
                onClick={handleCreateDebt}
                className="w-full py-2 rounded-lg bg-primary hover:bg-primaryDark text-white text-xs font-bold transition cursor-pointer"
              >
                Record Debt
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {debts.length === 0 ? (
              <div className="py-6 text-center text-xs text-textSubtle">
                No outstanding or settled debts recorded.
              </div>
            ) : (
              debts.map((d) => (
                <div
                  key={d.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                    d.settled
                      ? 'bg-slate-900/30 border-cardBorder/40 opacity-60'
                      : 'bg-slate-900/60 border-cardBorder'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleToggleSettled(d.id)}
                      className={`p-1 rounded-lg transition ${
                        d.settled
                          ? 'text-secondary bg-secondary/15'
                          : 'text-textSubtle hover:text-secondary hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <div>
                      <h4 className="text-xs font-bold text-text">{d.personName}</h4>
                      <p className="text-[11px] text-textSubtle">
                        {d.type === 'given' ? 'Lent (Owed to me)' : 'Borrowed (I owe)'}
                        {d.notes ? ` • ${d.notes}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs font-bold ${
                        d.type === 'given' ? 'text-secondary' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(d.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteDebt(d.id)}
                      className="text-textSubtle hover:text-danger p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
