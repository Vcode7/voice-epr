'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Trash2,
  Edit2,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction, DataEntryRecord, DataTemplate } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import {
  formatDateDisplay,
  getTodayString,
  getYesterdayString,
  isThisWeek,
} from '@/lib/utils/dateUtils';
import { TransactionConfirmModal } from '@/components/modals/TransactionConfirmModal';
import { BatchDataEntryViewModal } from '@/components/modals/BatchDataEntryViewModal';
import { UserSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';

export default function HistoryPage() {
  const [tab, setTab] = useState<'transactions' | 'data'>('transactions');
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Data Entries State
  const [entries, setEntries] = useState<DataEntryRecord[]>([]);
  const [templates, setTemplates] = useState<DataTemplate[]>([]);
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState('All');
  const [dataSearch, setDataSearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<DataEntryRecord | null>(null);

  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, entryRes, tmplRes, setRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/data-entries'),
        fetch('/api/templates'),
        fetch('/api/settings'),
      ]);
      const txs = await txRes.json();
      const entrs = await entryRes.json();
      const tmpls = await tmplRes.json();
      const sets = await setRes.json();

      if (Array.isArray(txs)) setTransactions(txs);
      if (Array.isArray(entrs)) setEntries(entrs);
      if (Array.isArray(tmpls)) setTemplates(tmpls);
      if (sets && !sets.error) setSettings(sets);
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDeleteTx = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    fetchHistory();
  };

  const handleDeleteEntry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this EPR data entry record?')) return;
    await fetch(`/api/data-entries/${id}`, { method: 'DELETE' });
    fetchHistory();
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      (t.merchant || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.transcript || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || (t.category || '').toLowerCase() === selectedCategory.toLowerCase();

    const matchesType =
      selectedType === 'All' || t.transactionType === selectedType.toLowerCase();

    return matchesSearch && matchesCategory && matchesType;
  });

  // Filter data entries
  const filteredEntries = entries.filter((e) => {
    if (selectedTemplateFilter === 'flexible') {
      if (!e.isFlexible && e.templateId !== 'flexible' && !e.flexibleFields) return false;
    } else if (selectedTemplateFilter !== 'All') {
      const matches = e.templateId === selectedTemplateFilter || e.templateName === selectedTemplateFilter;
      if (!matches) return false;
    }

    if (!dataSearch.trim()) return true;

    const query = dataSearch.toLowerCase();
    const matchesName = (e.title || e.templateName || '').toLowerCase().includes(query);
    const matchesTranscript = (e.rawTranscript || '').toLowerCase().includes(query);
    const matchesDate = e.date.toLowerCase().includes(query);
    const matchesFieldValues = Object.values(e.fieldValues || {}).some((v) =>
      String(v).toLowerCase().includes(query)
    );
    const matchesFlexFields = (e.flexibleFields || []).some(
      (f) => f.name.toLowerCase().includes(query) || String(f.value).toLowerCase().includes(query)
    );

    return matchesName || matchesTranscript || matchesDate || matchesFieldValues || matchesFlexFields;
  });

  // Date groups
  const today = getTodayString();
  const yesterday = getYesterdayString();

  const txGroups = [
    { title: 'Today', items: filteredTransactions.filter((t) => t.date === today) },
    { title: 'Yesterday', items: filteredTransactions.filter((t) => t.date === yesterday) },
    { title: 'This Week', items: filteredTransactions.filter((t) => t.date !== today && t.date !== yesterday && isThisWeek(t.date)) },
    { title: 'Earlier', items: filteredTransactions.filter((t) => t.date !== today && t.date !== yesterday && !isThisWeek(t.date)) },
  ].filter((g) => g.items.length > 0);

  const entryGroups = [
    { title: 'Today', items: filteredEntries.filter((e) => e.date === today) },
    { title: 'Yesterday', items: filteredEntries.filter((e) => e.date === yesterday) },
    { title: 'This Week', items: filteredEntries.filter((e) => e.date !== today && e.date !== yesterday && isThisWeek(e.date)) },
    { title: 'Earlier', items: filteredEntries.filter((e) => e.date !== today && e.date !== yesterday && !isThisWeek(e.date)) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight">History & Activity Logs</h1>
          <p className="text-xs text-textMuted mt-0.5">
            Search, filter, and manage your past records.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-card p-1 rounded-xl border border-cardBorder self-stretch sm:self-auto">
          <button
            onClick={() => setTab('transactions')}
            className={`flex-1 sm:flex-initial px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              tab === 'transactions'
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'text-textMuted hover:text-text'
            }`}
          >
            💰 Transactions ({filteredTransactions.length})
          </button>

          <button
            onClick={() => setTab('data')}
            className={`flex-1 sm:flex-initial px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
              tab === 'data'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                : 'text-textMuted hover:text-text'
            }`}
          >
            📋 Voice EPR ({filteredEntries.length})
          </button>
        </div>
      </div>

      {tab === 'transactions' ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Controls / Filter Bar */}
          <div className="bg-card border border-cardBorder rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-textSubtle absolute left-3.5 top-2.5 sm:top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search merchant, category, or note..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            {/* Type & Categories */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="flex items-center space-x-1 bg-background p-0.5 rounded-lg border border-cardBorder">
                {['All', 'Expense', 'Income'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      selectedType === t
                        ? 'bg-primary text-white'
                        : 'text-textSubtle hover:text-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto py-1 max-w-full scrollbar-none">
                {['All', ...DEFAULT_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-medium transition shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-secondary/20 text-secondary border border-secondary/40 font-semibold'
                        : 'bg-background text-textSubtle hover:text-text border border-cardBorder'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Grouped List */}
          {txGroups.length === 0 ? (
            <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6">
              No transactions match your search filter.
            </div>
          ) : (
            txGroups.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase text-textSubtle tracking-wider px-1">
                  {group.title}
                </h3>

                <div className="grid grid-cols-1 gap-2">
                  {group.items.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => setEditingTx(tx)}
                      className="p-3 sm:p-4 rounded-xl bg-card border border-cardBorder hover:border-slate-600 transition flex items-center justify-between cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.transactionType === 'income'
                              ? 'bg-secondary/15 text-secondary'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {tx.transactionType === 'income' ? (
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-text truncate max-w-[140px] sm:max-w-none">
                              {tx.merchant || tx.category || 'Transaction'}
                            </h4>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-textMuted border border-cardBorder">
                              {tx.category || 'Other'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-textMuted mt-0.5 truncate">
                            {tx.paymentMethod && (
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3 text-textSubtle" />
                                {tx.paymentMethod}
                              </span>
                            )}
                            {tx.description && (
                              <>
                                <span>•</span>
                                <span className="text-textSubtle truncate">{tx.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-xs sm:text-sm font-bold ${
                              tx.transactionType === 'income' ? 'text-secondary' : 'text-text'
                            }`}
                          >
                            {tx.transactionType === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </div>
                          <div className="text-[10px] text-textSubtle mt-0.5">
                            {formatDateDisplay(tx.date)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTx(tx);
                            }}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-textSubtle hover:text-text transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTx(tx.id, e)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-danger/20 hover:text-danger text-textSubtle transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Data Entries View */
        <div className="space-y-4 sm:space-y-6">
          {/* Controls / Filter Bar */}
          <div className="bg-card border border-cardBorder rounded-2xl p-3 sm:p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-textSubtle absolute left-3.5 top-2.5 sm:top-3" />
              <input
                type="text"
                value={dataSearch}
                onChange={(e) => setDataSearch(e.target.value)}
                placeholder="Search EPR logs..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Template Filter Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none">
              <button
                onClick={() => setSelectedTemplateFilter('All')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition shrink-0 cursor-pointer ${
                  selectedTemplateFilter === 'All'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                    : 'bg-background text-textSubtle hover:text-text border border-cardBorder'
                }`}
              >
                All
              </button>

              <button
                onClick={() => setSelectedTemplateFilter('flexible')}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition shrink-0 cursor-pointer ${
                  selectedTemplateFilter === 'flexible'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                    : 'bg-background text-textSubtle hover:text-text border border-cardBorder'
                }`}
              >
                ✨ Flexible
              </button>

              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateFilter(tmpl.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition shrink-0 cursor-pointer ${
                    selectedTemplateFilter === tmpl.id
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-semibold'
                      : 'bg-background text-textSubtle hover:text-text border border-cardBorder'
                  }`}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped Data Entries List */}
          {entryGroups.length === 0 ? (
            <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6">
              No Voice EPR records match your filter.
            </div>
          ) : (
            entryGroups.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase text-textSubtle tracking-wider px-1">
                  {group.title}
                </h3>

                <div className="grid grid-cols-1 gap-2">
                  {group.items.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => setEditingEntry(entry)}
                      className="p-3 sm:p-4 rounded-xl bg-card border border-cardBorder hover:border-slate-600 transition flex items-center justify-between cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-text truncate max-w-[140px] sm:max-w-none">
                              {entry.title || entry.templateName || 'EPR Record'}
                            </h4>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/30">
                              {entry.isFlexible ? 'Flexible' : entry.templateName}
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                              {entry.totalEntries || entry.entries?.length || 1} {(entry.totalEntries || entry.entries?.length || 1) === 1 ? 'Entry' : 'Entries'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-textMuted mt-0.5">
                            <span>
                              {entry.entries?.length ? `${entry.entries.length} child entries` : entry.isFlexible
                                ? `${entry.flexibleFields?.length || 0} fields`
                                : `${Object.keys(entry.fieldValues || {}).length} fields`}
                            </span>
                            <span>•</span>
                            <span>
                              {entry.tableRows?.length
                                ? `${entry.tableRows.length} rows`
                                : 'No rows'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] sm:text-xs font-semibold text-text">
                            {formatDateDisplay(entry.date)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEntry(entry);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-text transition cursor-pointer"
                            title="View Parent Record & Child Entries"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteEntry(entry.id, e)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-danger/20 hover:text-danger text-textSubtle transition cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Editing Modals */}
      {editingTx && (
        <TransactionConfirmModal
          extractedData={{
            intent: editingTx.transactionType,
            amount: editingTx.amount,
            merchant: editingTx.merchant,
            category: editingTx.category,
            payment_method: editingTx.paymentMethod,
            transaction_type: editingTx.transactionType,
            description: editingTx.description,
            date: editingTx.date,
            raw_transcript: editingTx.transcript || undefined,
          }}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setEditingTx(null);
            fetchHistory();
          }}
        />
      )}

      {editingEntry && (
        <BatchDataEntryViewModal
          record={editingEntry}
          settings={settings}
          onClose={() => setEditingEntry(null)}
          onDeleted={() => {
            setEditingEntry(null);
            fetchHistory();
          }}
        />
      )}
    </div>
  );
}
