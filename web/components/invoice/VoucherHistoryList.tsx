'use client';

import React from 'react';
import {
  Printer,
  Trash2,
  Edit2,
  Search,
  Receipt,
  FileText,
  Calendar,
  Building2,
  Users,
  Truck,
  Filter,
} from 'lucide-react';
import { Voucher, VoucherType, Company, Customer, Supplier } from '@/types';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import { formatDateDisplay } from '@/lib/utils/dateUtils';

interface VoucherHistoryListProps {
  vouchers: Voucher[];
  companies: Company[];
  customers: Customer[];
  suppliers: Supplier[];
  search: string;
  onSearchChange: (search: string) => void;
  filterType: VoucherType | 'all';
  onFilterTypeChange: (type: VoucherType | 'all') => void;
  filterCompanyId: string;
  onFilterCompanyChange: (id: string) => void;
  onEditVoucher: (voucher: Voucher) => void;
  onPrintVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
}

export function VoucherHistoryList({
  vouchers,
  companies,
  customers,
  suppliers,
  search,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterCompanyId,
  onFilterCompanyChange,
  onEditVoucher,
  onPrintVoucher,
  onDeleteVoucher,
}: VoucherHistoryListProps) {
  const getBadgeStyle = (type: VoucherType) => {
    switch (type) {
      case 'sales':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'purchase':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'receipt':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'payment':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-surface text-textMuted border-cardBorder';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="bg-card border border-cardBorder rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h3 className="text-sm sm:text-base font-bold text-text">
              Saved Vouchers History ({vouchers.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Voucher Type Filter */}
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-bold uppercase"
            >
              <option value="all">All Types</option>
              <option value="sales">Sales Invoices</option>
              <option value="purchase">Purchase Bills</option>
              <option value="receipt">Receipts</option>
              <option value="payment">Payments</option>
            </select>

            {/* Company Filter */}
            <select
              value={filterCompanyId}
              onChange={(e) => onFilterCompanyChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-textSubtle absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by voucher number, customer, supplier, reference, or item..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Vouchers Grid */}
      {vouchers.length === 0 ? (
        <div className="py-10 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6 space-y-1">
          <FileText className="w-7 h-7 text-textSubtle mx-auto" />
          <p className="font-semibold text-text">No saved vouchers found</p>
          <p>Dictate a voucher above or adjust search/filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {vouchers.map((v) => {
            const isSales = v.voucherType === 'sales';
            const isPurchase = v.voucherType === 'purchase';
            const isReceipt = v.voucherType === 'receipt';
            const isPayment = v.voucherType === 'payment';

            const partyName =
              isSales || isReceipt
                ? v.customerSnapshot?.name || 'Customer'
                : v.supplierSnapshot?.name || 'Supplier';

            return (
              <div
                key={v.id}
                className="bg-card border border-cardBorder hover:border-primary/40 rounded-2xl p-4 shadow-sm space-y-3 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-cardBorder/60">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs sm:text-sm text-text">
                          {v.voucherNumber}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border ${getBadgeStyle(
                            v.voucherType
                          )}`}
                        >
                          {v.voucherType}
                        </span>
                        <span className="text-[10px] text-textSubtle font-mono">
                          {formatDateDisplay(v.date)}
                        </span>
                      </div>

                      <p className="text-xs text-textMuted mt-1">
                        <span className="text-textSubtle font-medium">
                          {isSales ? 'Billed To: ' : isReceipt ? 'From: ' : isPurchase ? 'From: ' : 'Paid To: '}
                        </span>
                        <span className="font-semibold text-text">{partyName}</span>
                      </p>

                      <p className="text-[10px] text-textSubtle mt-0.5">
                        Company: <span className="font-medium">{v.companySnapshot?.name || 'Registered Company'}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black text-text font-mono">
                        {formatCurrency(v.grandTotal || v.amount || 0)}
                      </div>
                      {(isSales || isPurchase) && (v.taxTotal || 0) > 0 && (
                        <div className="text-[10px] text-textSubtle">
                          Tax: {formatCurrency(v.taxTotal || 0)}
                        </div>
                      )}
                      {(isReceipt || isPayment) && v.paymentMode && (
                        <div className="text-[10px] font-semibold text-primary">
                          via {v.paymentMode}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items summary or Narration */}
                  {(isSales || isPurchase) && v.items && v.items.length > 0 && (
                    <div className="pt-2 space-y-1 text-xs text-textMuted">
                      {v.items.slice(0, 2).map((it, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate max-w-[200px]">
                            {it.quantity} {it.unit} × {it.itemName}
                          </span>
                          <span className="font-mono text-text">{formatCurrency(it.total)}</span>
                        </div>
                      ))}
                      {v.items.length > 2 && (
                        <span className="text-[10px] text-textSubtle italic">
                          +{v.items.length - 2} more item(s)...
                        </span>
                      )}
                    </div>
                  )}

                  {(isReceipt || isPayment) && v.narration && (
                    <div className="pt-2 text-xs text-textMuted italic line-clamp-2">
                      "{v.narration}"
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-2.5 border-t border-cardBorder flex items-center justify-between">
                  <span className="text-[10px] text-textSubtle">
                    {v.rawTranscript ? '🎙️ Created via Voice' : 'Created Manually'}
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onPrintVoucher(v)}
                      className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-xs font-semibold text-text flex items-center gap-1 transition cursor-pointer"
                      title="Print GST Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>

                    <button
                      onClick={() => onEditVoucher(v)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-primary transition cursor-pointer"
                      title="Load into Editor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteVoucher(v.id)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                      title="Delete Voucher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
