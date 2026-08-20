'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Calendar,
  FileSpreadsheet,
  Layers,
  Sparkles,
} from 'lucide-react';
import { VoiceRecordingStudio } from '@/components/voice/VoiceRecordingStudio';
import { Transaction, DataEntryRecord, DataTemplate } from '@/types';
import { DEFAULT_MONITORING_DETAILS_TEMPLATE } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import { formatDateDisplay } from '@/lib/utils/dateUtils';
import { TransactionConfirmModal } from '@/components/modals/TransactionConfirmModal';
import { DataEntryEditModal } from '@/components/modals/DataEntryEditModal';

export default function HomePage() {
  const [activeTemplate, setActiveTemplate] = useState<DataTemplate>(DEFAULT_MONITORING_DETAILS_TEMPLATE);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentEntries, setRecentEntries] = useState<DataEntryRecord[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<DataEntryRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, entryRes, tmplRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/data-entries'),
        fetch('/api/templates'),
      ]);

      const txs = await txRes.json();
      const entries = await entryRes.json();
      const tmpls = await tmplRes.json();

      if (Array.isArray(txs)) setRecentTransactions(txs.slice(0, 5));
      if (Array.isArray(entries)) setRecentEntries(entries.slice(0, 5));
      if (Array.isArray(tmpls) && tmpls.length > 0) {
        setActiveTemplate(tmpls[0]);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl font-bold text-text tracking-tight flex items-center gap-2">
          <span>Voice Studio & Dashboard</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30">
            Atlas Synced
          </span>
        </h1>
        <p className="text-xs text-textMuted mt-1">
          Speak your expenses, invoices, and industrial machine logs in natural voice.
        </p>
      </div>

      {/* Main Voice Recording Studio */}
      <VoiceRecordingStudio
        activeTemplate={activeTemplate}
        onSelectActiveTemplate={setActiveTemplate}
        onRefreshData={fetchData}
      />

      {/* Recents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-card border border-cardBorder rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Recent Voice Transactions
            </h2>
            <Link
              href="/history"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-textSubtle">
                No transactions recorded yet. Tap the microphone above to speak an expense or income!
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-cardBorder hover:border-slate-600 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        tx.transactionType === 'income'
                          ? 'bg-secondary/15 text-secondary'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {tx.transactionType === 'income' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text">
                        {tx.merchant || tx.category || 'Expense'}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-textMuted mt-0.5">
                        <span>{tx.category || 'Other'}</span>
                        {tx.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-textSubtle" />
                              {tx.paymentMethod}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-bold ${
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
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Voice EPR Data Entries */}
        <div className="bg-card border border-cardBorder rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-dataColor" />
              Recent Voice-to-Data EPR Logs
            </h2>
            <Link
              href="/history"
              className="text-xs font-semibold text-dataColor hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-textSubtle">
                No voice EPR logs recorded yet. Switch mode to "Voice-to-Data" and dictate your machine or shift details!
              </div>
            ) : (
              recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-cardBorder hover:border-slate-600 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text">
                        {entry.title || entry.templateName || 'Data Record'}
                      </h3>
                      <p className="text-[11px] text-textMuted mt-0.5">
                        {entry.isFlexible
                          ? `Flexible (${entry.flexibleFields?.length || Object.keys(entry.fieldValues || {}).length} fields)`
                          : `Template: ${entry.templateName}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/30">
                      {entry.tableRows?.length ? `${entry.tableRows.length} rows` : 'Fields only'}
                    </span>
                    <div className="text-[10px] text-textSubtle mt-1">
                      {formatDateDisplay(entry.date)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals for Detail / Editing from Dashboard */}
      {selectedTx && (
        <TransactionConfirmModal
          extractedData={{
            intent: selectedTx.transactionType,
            amount: selectedTx.amount,
            merchant: selectedTx.merchant,
            category: selectedTx.category,
            payment_method: selectedTx.paymentMethod,
            transaction_type: selectedTx.transactionType,
            description: selectedTx.description,
            date: selectedTx.date,
            raw_transcript: selectedTx.transcript || undefined,
          }}
          onClose={() => setSelectedTx(null)}
          onSaved={() => {
            setSelectedTx(null);
            fetchData();
          }}
        />
      )}

      {selectedEntry && (
        <DataEntryEditModal
          existingRecord={selectedEntry}
          template={activeTemplate}
          onClose={() => setSelectedEntry(null)}
          onSaved={() => {
            setSelectedEntry(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
