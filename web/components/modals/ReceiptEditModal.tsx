'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Printer, CheckCircle, Save } from 'lucide-react';
import { ExtractedReceiptResult, ReceiptItem, TaxType } from '@/types';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import { getTodayString, formatDateDisplay } from '@/lib/utils/dateUtils';

interface ReceiptEditModalProps {
  extractedData?: ExtractedReceiptResult;
  existingReceipt?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function ReceiptEditModal({
  extractedData,
  existingReceipt,
  onClose,
  onSaved,
}: ReceiptEditModalProps) {
  const initialItems: ReceiptItem[] = existingReceipt?.items ||
    (extractedData?.items && extractedData.items.length > 0
      ? extractedData.items.map((item, idx) => ({
          id: `item_${Date.now()}_${idx}`,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          unitPrice: item.unit_price || 0,
          lineTotal: (item.quantity || 1) * (item.unit_price || 0),
        }))
      : [{ id: 'item_1', name: 'Sample Product', quantity: 1, unit: 'pcs', unitPrice: 100, lineTotal: 100 }]);

  const [customerName, setCustomerName] = useState(existingReceipt?.customerName || extractedData?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(existingReceipt?.customerPhone || extractedData?.customer_phone || '');
  const [discountStr, setDiscountStr] = useState(String(existingReceipt?.discount ?? extractedData?.discount ?? 0));
  const [taxPercentStr, setTaxPercentStr] = useState(String(existingReceipt?.taxPercent ?? extractedData?.tax_percent ?? 0));
  const [taxType, setTaxType] = useState<TaxType>((existingReceipt?.taxType || extractedData?.tax_type || 'none') as TaxType);
  const [items, setItems] = useState<ReceiptItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const discount = parseFloat(discountStr) || 0;
  const taxPercent = parseFloat(taxPercentStr) || 0;
  const taxAmount = Math.round(Math.max(0, subtotal - discount) * taxPercent) / 100;
  const cgst = taxType === 'gst' ? Math.round((taxAmount / 2) * 100) / 100 : 0;
  const sgst = taxType === 'gst' ? Math.round((taxAmount / 2) * 100) / 100 : 0;
  const igst = taxType === 'igst' ? taxAmount : 0;
  const grandTotal = Math.max(0, subtotal - discount + taxAmount);

  const updateItem = (id: string, key: keyof ReceiptItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [key]: val };
        if (key === 'quantity' || key === 'unitPrice') {
          const qty = key === 'quantity' ? parseFloat(val) || 0 : item.quantity;
          const price = key === 'unitPrice' ? parseFloat(val) || 0 : item.unitPrice;
          updated.lineTotal = qty * price;
        }
        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        name: 'New Item',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 50,
        lineTotal: 50,
      },
    ]);
  };

  const deleteItem = (id: string) => {
    if (items.length <= 1) {
      setError('Invoice must contain at least one line item.');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = async (andPrint: boolean = false) => {
    setError(null);
    try {
      setSaving(true);
      let receiptNumber = existingReceipt?.receiptNumber;
      if (!receiptNumber) {
        const numRes = await fetch('/api/receipts/next-number');
        const numData = await numRes.json();
        receiptNumber = numData.nextReceiptNumber || `INV-${Date.now().toString().slice(-4)}`;
      }

      const payload = {
        receiptNumber,
        date: existingReceipt?.date || getTodayString(),
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        items,
        subtotal,
        discount,
        tax: taxAmount,
        taxPercent,
        taxType,
        cgst,
        sgst,
        igst,
        grandTotal,
        currency: 'INR',
        transcript: extractedData?.raw_transcript || existingReceipt?.transcript || null,
      };

      const url = existingReceipt ? `/api/receipts/${existingReceipt.id}` : '/api/receipts';
      const method = existingReceipt ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save receipt.');

      onSaved();
      if (andPrint) {
        window.print();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-cardBorder flex items-center justify-between bg-slate-900/50 no-print">
          <div>
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-secondary" />
              {existingReceipt ? `Edit Invoice ${existingReceipt.receiptNumber}` : 'Voice GST Invoice & Bill Generator'}
            </h2>
            <p className="text-xs text-textMuted mt-0.5">
              Itemized billing with automatic CGST, SGST, IGST tax computations.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-textMuted hover:text-text hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable & Editable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 printable-area">
          {error && (
            <div className="p-3.5 rounded-xl bg-danger/15 border border-danger/30 text-danger text-xs font-medium no-print">
              {error}
            </div>
          )}

          {/* Customer & Tax Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 border border-cardBorder">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-cardBorder text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Customer Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-cardBorder text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Tax Type
              </label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value as TaxType)}
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-cardBorder text-sm text-text focus:outline-none focus:border-primary"
              >
                <option value="none">No Tax (0%)</option>
                <option value="gst">GST (CGST + SGST split)</option>
                <option value="igst">IGST (Inter-state Full)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                disabled={taxType === 'none'}
                value={taxPercentStr}
                onChange={(e) => setTaxPercentStr(e.target.value)}
                placeholder="e.g. 18"
                className="w-full px-3.5 py-2 rounded-xl bg-background border border-cardBorder text-sm text-text focus:outline-none focus:border-primary disabled:opacity-40"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-cardBorder rounded-xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-[11px] font-bold uppercase text-textMuted border-b border-cardBorder">
                <tr>
                  <th className="p-3 w-10">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 w-28">Quantity</th>
                  <th className="p-3 w-28">Unit</th>
                  <th className="p-3 w-32 text-right">Unit Price (₹)</th>
                  <th className="p-3 w-32 text-right">Total (₹)</th>
                  <th className="p-3 w-12 text-center no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cardBorder/60">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 text-textSubtle font-medium text-xs">{idx + 1}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background/80 border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-medium"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background/80 border border-cardBorder text-xs text-text focus:outline-none focus:border-primary text-center font-medium"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        placeholder="kg, pcs"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background/80 border border-cardBorder text-xs text-text focus:outline-none focus:border-primary text-center"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-background/80 border border-cardBorder text-xs text-text focus:outline-none focus:border-primary text-right font-medium"
                      />
                    </td>
                    <td className="p-3 text-right font-bold text-text">
                      {formatCurrency(item.lineTotal)}
                    </td>
                    <td className="p-3 text-center no-print">
                      {items.length > 1 && (
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-textSubtle hover:text-danger p-1 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="no-print">
            <button
              type="button"
              onClick={addItem}
              className="py-2.5 px-4 rounded-xl border border-dashed border-cardBorder hover:border-primary/50 text-textMuted hover:text-primary text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Product / Service Item
            </button>
          </div>

          {/* Invoice Summary Box */}
          <div className="flex justify-end">
            <div className="w-80 rounded-xl bg-slate-900/80 border border-cardBorder p-4 space-y-2.5">
              <div className="flex justify-between text-xs text-textMuted">
                <span>Subtotal</span>
                <span className="font-semibold text-text">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-textMuted">Discount (₹)</span>
                <input
                  type="number"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  className="w-24 px-2 py-1 rounded bg-background border border-cardBorder text-xs text-right font-semibold text-secondary focus:outline-none focus:border-primary"
                />
              </div>

              {taxType === 'gst' && taxPercent > 0 && (
                <>
                  <div className="flex justify-between text-xs text-textMuted">
                    <span>CGST ({taxPercent / 2}%)</span>
                    <span className="font-semibold text-text">+{formatCurrency(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-textMuted">
                    <span>SGST ({taxPercent / 2}%)</span>
                    <span className="font-semibold text-text">+{formatCurrency(sgst)}</span>
                  </div>
                </>
              )}

              {taxType === 'igst' && taxPercent > 0 && (
                <div className="flex justify-between text-xs text-textMuted">
                  <span>IGST ({taxPercent}%)</span>
                  <span className="font-semibold text-text">+{formatCurrency(igst)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-cardBorder flex justify-between items-center">
                <span className="text-sm font-bold text-text">Grand Total</span>
                <span className="text-base font-extrabold text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-cardBorder bg-slate-900/50 flex items-center justify-between no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-cardBorder text-textMuted hover:text-text hover:bg-slate-800 text-xs font-semibold transition"
          >
            Close
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cardBorder text-text text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-textMuted" />
              <span>Save & Print / PDF</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primaryDark to-primary hover:from-primary hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-primary/25 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
