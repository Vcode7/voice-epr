'use client';

import React from 'react';
import {
  Save,
  Printer,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Building2,
  Users,
  Truck,
  RotateCcw,
  FileText,
  Calendar,
  CreditCard,
  Hash,
} from 'lucide-react';
import {
  Voucher,
  VoucherType,
  VoucherItem,
  Company,
  Customer,
  Supplier,
  Item,
  VoiceVoucherValidationIssue,
} from '@/types';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import { calculateItemTaxes, calculateVoucherTotals, isInterstateSupply } from '@/lib/utils/gstCalculator';

interface VoucherLeftPanelProps {
  voucherType: VoucherType;
  voucherData: Partial<Voucher>;
  onUpdateVoucherData: (updater: (prev: Partial<Voucher>) => Partial<Voucher>) => void;
  companies: Company[];
  customers: Customer[];
  suppliers: Supplier[];
  items: Item[];
  validationIssues: VoiceVoucherValidationIssue[];
  onDismissIssue: (index: number) => void;
  isSaving: boolean;
  onSaveVoucher: () => void;
  onPrintVoucher: () => void;
  onClearVoucher: () => void;
}

export function VoucherLeftPanel({
  voucherType,
  voucherData,
  onUpdateVoucherData,
  companies,
  customers,
  suppliers,
  items,
  validationIssues,
  onDismissIssue,
  isSaving,
  onSaveVoucher,
  onPrintVoucher,
  onClearVoucher,
}: VoucherLeftPanelProps) {
  const isSales = voucherType === 'sales';
  const isPurchase = voucherType === 'purchase';
  const isReceipt = voucherType === 'receipt';
  const isPayment = voucherType === 'payment';

  const selectedCompany = companies.find((c) => c.id === voucherData.companyId) || companies[0];
  const selectedCustomer = customers.find((c) => c.id === voucherData.customerId);
  const selectedSupplier = suppliers.find((s) => s.id === voucherData.supplierId);

  const rawItems = voucherData.items || [];

  // Automatically recalculate totals whenever items, company, or party changes
  const isInterstate = isInterstateSupply(
    selectedCompany?.stateCode,
    isSales ? selectedCustomer?.stateCode : selectedSupplier?.stateCode,
    voucherData.placeOfSupply
  );

  const handleCompanyChange = (companyId: string) => {
    onUpdateVoucherData((prev) => {
      const comp = companies.find((c) => c.id === companyId);
      const recalculated = calculateVoucherTotals(
        prev.items || [],
        comp,
        isSales ? selectedCustomer : selectedSupplier,
        prev.placeOfSupply
      );
      return {
        ...prev,
        companyId,
        companySnapshot: comp,
        ...recalculated,
      };
    });
  };

  const handleCustomerChange = (customerId: string) => {
    onUpdateVoucherData((prev) => {
      const cust = customers.find((c) => c.id === customerId);
      const recalculated = calculateVoucherTotals(
        prev.items || [],
        selectedCompany,
        cust,
        prev.placeOfSupply || cust?.state
      );
      return {
        ...prev,
        customerId,
        customerSnapshot: cust,
        placeOfSupply: prev.placeOfSupply || cust?.state,
        ...recalculated,
      };
    });
  };

  const handleSupplierChange = (supplierId: string) => {
    onUpdateVoucherData((prev) => {
      const supp = suppliers.find((s) => s.id === supplierId);
      const recalculated = calculateVoucherTotals(
        prev.items || [],
        selectedCompany,
        supp,
        prev.placeOfSupply || supp?.state
      );
      return {
        ...prev,
        supplierId,
        supplierSnapshot: supp,
        ...recalculated,
      };
    });
  };

  // Add line item
  const handleAddItem = () => {
    const defaultItem = items[0];
    if (!defaultItem) {
      alert('Please add items to Item master before adding voucher lines.');
      return;
    }

    const newItem: VoucherItem = {
      id: `vitem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      itemId: defaultItem.id,
      itemName: defaultItem.name,
      hsnCode: defaultItem.hsnCode,
      sku: defaultItem.sku,
      quantity: 1,
      unit: defaultItem.unit,
      rate: defaultItem.rate,
      discount: 0,
      taxableAmount: defaultItem.rate,
      gstPercent: defaultItem.gstPercent,
      cgst: isInterstate ? 0 : (defaultItem.rate * (defaultItem.gstPercent / 2)) / 100,
      sgst: isInterstate ? 0 : (defaultItem.rate * (defaultItem.gstPercent / 2)) / 100,
      igst: isInterstate ? (defaultItem.rate * defaultItem.gstPercent) / 100 : 0,
      total: defaultItem.rate + (defaultItem.rate * defaultItem.gstPercent) / 100,
    };

    onUpdateVoucherData((prev) => {
      const newItems = [...(prev.items || []), newItem];
      const totals = calculateVoucherTotals(
        newItems,
        selectedCompany,
        isSales ? selectedCustomer : selectedSupplier,
        prev.placeOfSupply
      );
      return { ...prev, ...totals };
    });
  };

  // Update line item
  const handleUpdateItem = (index: number, updates: Partial<VoucherItem>) => {
    onUpdateVoucherData((prev) => {
      const newItems = [...(prev.items || [])];
      let current = { ...newItems[index], ...updates };

      if (updates.itemId) {
        const masterItem = items.find((i) => i.id === updates.itemId);
        if (masterItem) {
          current = {
            ...current,
            itemName: masterItem.name,
            hsnCode: masterItem.hsnCode,
            sku: masterItem.sku,
            unit: masterItem.unit,
            rate: masterItem.rate,
            gstPercent: masterItem.gstPercent,
          };
        }
      }

      const calculated = calculateItemTaxes(
        {
          quantity: current.quantity,
          rate: current.rate,
          discount: current.discount,
          gstPercent: current.gstPercent,
        },
        isInterstate
      );

      newItems[index] = { ...current, ...calculated };

      const totals = calculateVoucherTotals(
        newItems,
        selectedCompany,
        isSales ? selectedCustomer : selectedSupplier,
        prev.placeOfSupply
      );
      return { ...prev, ...totals };
    });
  };

  // Delete line item
  const handleDeleteItem = (index: number) => {
    onUpdateVoucherData((prev) => {
      const newItems = (prev.items || []).filter((_, i) => i !== index);
      const totals = calculateVoucherTotals(
        newItems,
        selectedCompany,
        isSales ? selectedCustomer : selectedSupplier,
        prev.placeOfSupply
      );
      return { ...prev, ...totals };
    });
  };

  const hasBlockingValidationIssues = validationIssues.length > 0;

  return (
    <div className="bg-card border border-cardBorder rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-4 h-full">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cardBorder/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold text-text tracking-wide uppercase">
              {voucherType} Voucher Structured Data
            </h2>
            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">
              {voucherData.voucherNumber || 'AUTO-GENERATING'}
            </span>
          </div>
          <p className="text-xs text-textMuted mt-0.5">
            Extracted from natural voice dictation. Review, adjust line items, and save or print.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onClearVoucher}
            className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-textSubtle hover:text-text text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Reset Form"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Validation Warning Alert Banners */}
      {validationIssues.length > 0 && (
        <div className="space-y-2">
          {validationIssues.map((issue, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-danger/15 border border-danger/40 text-danger text-xs font-bold flex items-start justify-between gap-2 shadow-sm animate-fade-in"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p>{issue.message}</p>
                  {issue.spokenValue && (
                    <span className="text-[10px] opacity-80 block font-normal mt-0.5">
                      Spoken value: "{issue.spokenValue}"
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDismissIssue(idx)}
                className="text-xs text-danger/80 hover:text-danger cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Fields Section */}
      <div className="space-y-4">
        {/* Parties Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Company Selector (From Master) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-textMuted uppercase flex items-center gap-1">
              <Building2 className="w-3 h-3 text-primary" />
              <span>{isPurchase ? 'Recipient Company *' : 'From Company *'}</span>
            </label>
            <select
              value={voucherData.companyId || selectedCompany?.id || ''}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-semibold"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (GSTIN: {c.gstin})
                </option>
              ))}
            </select>
          </div>

          {/* Customer / Supplier Selector (Strict Master Check) */}
          {(isSales || isReceipt) && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-textMuted uppercase flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-500" />
                <span>Customer (Master) *</span>
              </label>
              <select
                value={voucherData.customerId || ''}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-background border text-xs text-text focus:outline-none font-semibold ${
                  !voucherData.customerId ? 'border-danger/60 bg-danger/5' : 'border-cardBorder focus:border-emerald-500'
                }`}
              >
                <option value="">-- Select Customer from Master --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.city ? `(${c.city})` : ''} {c.gstin ? `[${c.gstin}]` : '[Unregistered]'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(isPurchase || isPayment) && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-textMuted uppercase flex items-center gap-1">
                <Truck className="w-3 h-3 text-indigo-400" />
                <span>Supplier (Master) *</span>
              </label>
              <select
                value={voucherData.supplierId || ''}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-background border text-xs text-text focus:outline-none font-semibold ${
                  !voucherData.supplierId ? 'border-danger/60 bg-danger/5' : 'border-cardBorder focus:border-indigo-500'
                }`}
              >
                <option value="">-- Select Supplier from Master --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.city ? `(${s.city})` : ''} {s.gstin ? `[${s.gstin}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Date & Reference Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div>
            <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Invoice Date</label>
            <input
              type="date"
              value={voucherData.date || new Date().toISOString().split('T')[0]}
              onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-mono"
            />
          </div>

          {isSales && (
            <>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Place of Supply</label>
                <input
                  type="text"
                  value={voucherData.placeOfSupply || selectedCustomer?.state || selectedCompany?.state || ''}
                  onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, placeOfSupply: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Tax Type</label>
                <span className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs font-bold text-primary block text-center truncate">
                  {isInterstate ? 'IGST (Interstate)' : 'CGST + SGST (Local)'}
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Reverse Charge</label>
                <select
                  value={voucherData.reverseCharge ? 'yes' : 'no'}
                  onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, reverseCharge: e.target.value === 'yes' }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-semibold"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </>
          )}

          {isPurchase && (
            <>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Supplier Inv No</label>
                <input
                  type="text"
                  value={voucherData.supplierInvoiceNumber || ''}
                  onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, supplierInvoiceNumber: e.target.value }))}
                  placeholder="e.g. PUR-501"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Supplier Inv Date</label>
                <input
                  type="date"
                  value={voucherData.supplierInvoiceDate || voucherData.date || ''}
                  onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, supplierInvoiceDate: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Tax Regime</label>
                <span className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs font-bold text-indigo-400 block text-center truncate">
                  {isInterstate ? 'IGST (Interstate)' : 'CGST + SGST'}
                </span>
              </div>
            </>
          )}

          {(isReceipt || isPayment) && (
            <>
              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Against Ref / Inv No</label>
                <input
                  type="text"
                  value={voucherData.referenceInvoiceNumber || ''}
                  onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, referenceInvoiceNumber: e.target.value }))}
                  placeholder="e.g. INV-1001"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Payment Mode</label>
                <select
                  value={voucherData.paymentMode || 'Cash'}
                  onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, paymentMode: e.target.value as any }))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-bold"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="NEFT/RTGS">NEFT / RTGS</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">UTR / Cheque Ref</label>
                <input
                  type="text"
                  value={voucherData.referenceTransactionNumber || ''}
                  onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, referenceTransactionNumber: e.target.value }))}
                  placeholder="e.g. UTR12345"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-primary"
                />
              </div>
            </>
          )}
        </div>

        {/* Sales & Purchase: Items Table */}
        {(isSales || isPurchase) && (
          <div className="space-y-2 pt-2 border-t border-cardBorder">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                <span>Voucher Line Items ({rawItems.length})</span>
                <span className="text-[10px] text-textMuted font-normal lowercase">(strictly from Item master)</span>
              </span>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {rawItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-textMuted bg-surface/40 rounded-xl border border-dashed border-cardBorder p-4">
                No items added. Speak line items (e.g. "laptop 2 pieces and wireless mouse 5 pieces") or click "Add Item"!
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {rawItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-xl bg-surface/60 border border-cardBorder space-y-2 text-xs"
                  >
                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Item Selector (from master) */}
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          value={item.itemId}
                          onChange={(e) => handleUpdateItem(idx, { itemId: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-bold"
                        >
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} (HSN: {it.hsnCode} • Rate: ₹{it.rate})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-2">
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(idx, { quantity: parseFloat(e.target.value) || 1 })}
                            className="w-full px-2 py-1.5 rounded-l-lg bg-background border border-cardBorder text-xs font-mono font-bold text-text focus:outline-none"
                            placeholder="Qty"
                          />
                          <span className="px-2 py-1.5 bg-card border-y border-r border-cardBorder text-[10px] text-textSubtle rounded-r-lg uppercase">
                            {item.unit}
                          </span>
                        </div>
                      </div>

                      {/* Rate */}
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleUpdateItem(idx, { rate: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 rounded-lg bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none"
                          placeholder="Rate"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="col-span-3 sm:col-span-2 text-right font-mono font-bold text-text">
                        {formatCurrency(item.total)}
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="p-1 text-textSubtle hover:text-danger rounded transition cursor-pointer"
                          title="Remove Line Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tax Breakdown for Line */}
                    <div className="flex items-center justify-between text-[10px] text-textSubtle pt-1 border-t border-cardBorder/60">
                      <span>HSN: {item.hsnCode} • Taxable: {formatCurrency(item.taxableAmount)}</span>
                      <span>
                        GST {item.gstPercent}%: {isInterstate ? `IGST ${formatCurrency(item.igst)}` : `CGST ${formatCurrency(item.cgst)} + SGST ${formatCurrency(item.sgst)}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Receipt & Payment: Direct Amount Box */}
        {(isReceipt || isPayment) && (
          <div className="p-4 rounded-xl bg-surface/60 border border-cardBorder space-y-3">
            <div>
              <label className="text-xs font-bold text-text uppercase block mb-1">
                {isReceipt ? 'Total Amount Received (₹) *' : 'Total Amount Paid (₹) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-primary">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={voucherData.amount ?? ''}
                  onChange={(e) =>
                    onUpdateVoucherData((prev) => {
                      const val = parseFloat(e.target.value) || 0;
                      return { ...prev, amount: val, grandTotal: val };
                    })
                  }
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-background border border-cardBorder text-base font-bold font-mono text-text focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Bank / Branch Name</label>
              <input
                type="text"
                value={voucherData.bankName || ''}
                onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, bankName: e.target.value }))}
                placeholder="e.g. HDFC Bank, Mumbai Branch"
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Narration / Payment Notes</label>
              <textarea
                rows={2}
                value={voucherData.narration || ''}
                onChange={(e) => onUpdateVoucherData((prev) => ({ ...prev, narration: e.target.value }))}
                placeholder="e.g. Cleared full balance against Invoice INV-1001 via NEFT"
                className="w-full px-3 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}

        {/* Calculation Summary Bar for Sales & Purchase */}
        {(isSales || isPurchase) && (
          <div className="p-3.5 rounded-xl bg-surface border border-cardBorder space-y-1.5 text-xs">
            <div className="flex justify-between text-textMuted">
              <span>Taxable Subtotal</span>
              <span className="font-mono font-semibold text-text">{formatCurrency(voucherData.taxableAmount || 0)}</span>
            </div>
            {isInterstate ? (
              <div className="flex justify-between text-textMuted">
                <span>IGST Total</span>
                <span className="font-mono font-semibold text-text">+{formatCurrency(voucherData.igstTotal || 0)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-textMuted">
                  <span>CGST Total</span>
                  <span className="font-mono font-semibold text-text">+{formatCurrency(voucherData.cgstTotal || 0)}</span>
                </div>
                <div className="flex justify-between text-textMuted">
                  <span>SGST Total</span>
                  <span className="font-mono font-semibold text-text">+{formatCurrency(voucherData.sgstTotal || 0)}</span>
                </div>
              </>
            )}
            {voucherData.roundOff !== undefined && voucherData.roundOff !== 0 && (
              <div className="flex justify-between text-textSubtle text-[11px]">
                <span>Round-off</span>
                <span className="font-mono">{voucherData.roundOff > 0 ? `+${voucherData.roundOff}` : voucherData.roundOff}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-cardBorder text-sm font-extrabold text-text">
              <span className="uppercase">Grand Total</span>
              <span className="text-base font-black text-primary font-mono">
                {formatCurrency(voucherData.grandTotal || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions Toolbar */}
      <div className="pt-3 border-t border-cardBorder flex flex-wrap items-center justify-between gap-2 mt-auto">
        <button
          type="button"
          onClick={onPrintVoucher}
          disabled={!voucherData.companyId || ((isSales || isPurchase) && rawItems.length === 0)}
          className="px-4 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
          title="Print official GST format"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Voucher</span>
        </button>

        <button
          type="button"
          onClick={onSaveVoucher}
          disabled={isSaving || hasBlockingValidationIssues || !voucherData.companyId}
          className="px-6 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary/25 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Voucher'}</span>
        </button>
      </div>
    </div>
  );
}
