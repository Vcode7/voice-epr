'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Calendar,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
  Truck,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';
import {
  AccountTransaction,
  LedgerSummary,
  Company,
  Customer,
  Supplier,
  VoucherType,
} from '@/types';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import { formatDateDisplay } from '@/lib/utils/dateUtils';

interface AccountLedgerTabProps {
  companies: Company[];
  customers: Customer[];
  suppliers: Supplier[];
}

export function AccountLedgerTab({
  companies,
  customers,
  suppliers,
}: AccountLedgerTabProps) {
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDebit: 0,
    totalCredit: 0,
    closingBalance: 0,
    balanceType: 'Dr',
    transactionsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterVoucherType, setFilterVoucherType] = useState<VoucherType | 'all'>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCompany !== 'all') params.append('companyId', filterCompany);
      if (filterCustomer !== 'all') params.append('customerId', filterCustomer);
      if (filterSupplier !== 'all') params.append('supplierId', filterSupplier);
      if (filterVoucherType !== 'all') params.append('voucherType', filterVoucherType);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await fetch(`/api/invoice/account?${params.toString()}`);
      const data = await res.json();
      if (data && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
        setSummary(data.summary);
      }
    } catch (e: any) {
      console.error('Failed to fetch ledger:', e);
    } finally {
      setLoading(false);
    }
  }, [filterCompany, filterCustomer, filterSupplier, filterVoucherType, fromDate, toDate]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleResetFilters = () => {
    setFilterCompany('all');
    setFilterCustomer('all');
    setFilterSupplier('all');
    setFilterVoucherType('all');
    setFromDate('');
    setToDate('');
  };

  const getVoucherTypeBadge = (type: VoucherType) => {
    switch (type) {
      case 'sales':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'purchase':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'receipt':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'payment':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-cardBorder p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            General &amp; Party Accounting Ledger
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Automatic double-entry transaction posting derived strictly from saved Sales, Purchase, Receipt, and Payment vouchers.
          </p>
        </div>
      </div>

      {/* Metrics Row (Summary Totals) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Debit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-cardBorder shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-textSubtle tracking-wider">
              Total Debit (Dr)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(summary.totalDebit)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-textMuted">
            Receivables &amp; Supplier Payments
          </div>
        </div>

        {/* Total Credit */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-cardBorder shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-textSubtle tracking-wider">
              Total Credit (Cr)
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-primary font-mono">
            {formatCurrency(summary.totalCredit)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-textMuted">
            Customer Receipts &amp; Payables
          </div>
        </div>

        {/* Closing Balance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-cardBorder shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-textSubtle tracking-wider">
              Net Closing Balance
            </span>
            <div className="px-2 py-0.5 rounded-lg bg-surface border border-cardBorder text-xs font-bold text-text">
              {summary.balanceType}
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-text font-mono flex items-baseline gap-1.5">
            <span>{formatCurrency(summary.closingBalance)}</span>
            <span className="text-xs font-bold text-textMuted">({summary.balanceType})</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-textMuted">
            Across {summary.transactionsCount} transactions
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-card border border-cardBorder rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text">
            <Filter className="w-4 h-4 text-primary" />
            <span>Filter Ledger Transactions</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Company */}
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Company</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Voucher Type */}
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Voucher Type</label>
            <select
              value={filterVoucherType}
              onChange={(e) => setFilterVoucherType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium uppercase"
            >
              <option value="all">All Types</option>
              <option value="sales">Sales</option>
              <option value="purchase">Purchase</option>
              <option value="receipt">Receipt</option>
              <option value="payment">Payment</option>
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Customer</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
            >
              <option value="all">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Supplier</label>
            <select
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card border border-cardBorder rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-textMuted">Loading ledger transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-textMuted p-6 space-y-1">
            <Landmark className="w-8 h-8 text-textSubtle mx-auto mb-2" />
            <p className="font-semibold text-text">No transactions recorded</p>
            <p>Save vouchers in the Voucher tab to populate double-entry ledger entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface/80 border-b border-cardBorder text-textSubtle uppercase font-bold text-[10px] tracking-wider">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Voucher No</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Party</th>
                  <th className="p-3.5">Description / Narration</th>
                  <th className="p-3.5 text-right">Debit (Dr)</th>
                  <th className="p-3.5 text-right">Credit (Cr)</th>
                  <th className="p-3.5 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface/50 transition">
                    <td className="p-3.5 font-mono text-textMuted whitespace-nowrap">
                      {formatDateDisplay(tx.date)}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-text whitespace-nowrap">
                      {tx.voucherNumber}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${getVoucherTypeBadge(
                          tx.voucherType
                        )}`}
                      >
                        {tx.voucherType}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-text whitespace-nowrap">
                      {tx.partyName}
                    </td>
                    <td className="p-3.5 text-textMuted max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-primary whitespace-nowrap">
                      {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                    </td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-text whitespace-nowrap">
                      {formatCurrency(Math.abs(tx.balance))}{' '}
                      <span className="text-[10px] text-textMuted font-bold">
                        {tx.balance >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
