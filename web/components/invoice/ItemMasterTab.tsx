'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, Box, Check, X, Tag, Percent, Hash } from 'lucide-react';
import { Item } from '@/types';
import { formatCurrency } from '@/lib/utils/currencyFormatter';

export function ItemMasterTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoice/items');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (e: any) {
      console.error('Failed to fetch items:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.hsnCode || editingItem?.rate === undefined) {
      showNotification('Please fill in Item Name, HSN Code, and Rate.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const isNew = !editingItem.id;
      const url = isNew ? '/api/invoice/items' : `/api/invoice/items/${editingItem.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save item.');
      }

      showNotification(`Item "${editingItem.name}" saved successfully!`, 'success');
      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      showNotification(err.message || 'Save failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    if (!confirm(`Are you sure you want to delete item "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/invoice/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item.');
      showNotification(`Item "${item.name}" deleted.`, 'success');
      fetchItems();
    } catch (e: any) {
      showNotification(e.message || 'Delete failed.', 'error');
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.hsnCode.toLowerCase().includes(search.toLowerCase()) ||
      (i.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-cardBorder p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <Box className="w-5 h-5 text-amber-500" />
            Item Master Management
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Product catalog and inventory master. Vouchers strictly reference these items for rates, units, and GST tax percentages.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingItem({
              name: '',
              hsnCode: '',
              sku: '',
              unit: 'PCS',
              rate: 100,
              gstPercent: 18,
              cgstPercent: 9,
              sgstPercent: 9,
              igstPercent: 18,
              description: '',
            })
          }
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in ${
            notification.type === 'success'
              ? 'bg-success/15 border border-success/30 text-success'
              : 'bg-danger/15 border border-danger/30 text-danger'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="cursor-pointer text-textMuted hover:text-text">
            ✕
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="bg-card border border-cardBorder rounded-xl p-2.5 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-textSubtle absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items by name, HSN code, SKU, or description..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder">
          Loading items...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6 space-y-2">
          <Box className="w-8 h-8 text-textSubtle mx-auto" />
          <p className="font-semibold text-text">No items found</p>
          <p>Click "Add Item" above to create catalog items.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-cardBorder hover:border-amber-500/40 rounded-2xl p-4 shadow-sm space-y-3 transition group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-cardBorder/60">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-text truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-cardBorder text-textMuted">
                        HSN: {item.hsnCode}
                      </span>
                      {item.sku && (
                        <span className="font-mono text-[10px] text-textSubtle px-1.5 py-0.5 rounded bg-surface border border-cardBorder">
                          SKU: {item.sku}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-textSubtle hover:text-text transition cursor-pointer"
                      title="Edit Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-textMuted line-clamp-2">{item.description}</p>
                )}
              </div>

              {/* Price and GST Badges */}
              <div className="pt-2 border-t border-cardBorder/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-textSubtle block uppercase">Rate / Unit</span>
                  <span className="text-sm font-extrabold text-text font-mono">
                    {formatCurrency(item.rate)} <span className="text-xs font-normal text-textMuted">/{item.unit}</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-block">
                    GST {item.gstPercent}%
                  </span>
                  <span className="text-[10px] text-textSubtle block mt-0.5">
                    CGST {item.cgstPercent}% + SGST {item.sgstPercent}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingItem !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cardBorder">
              <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                <Box className="w-5 h-5 text-amber-500" />
                {editingItem.id ? 'Edit Item Master' : 'Add New Item'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-textMuted hover:text-text hover:bg-surfaceMuted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="e.g. Laptop 15-inch Pro"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">HSN / SAC Code *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.hsnCode || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, hsnCode: e.target.value })}
                    placeholder="e.g. 8471"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">SKU / Item Code</label>
                  <input
                    type="text"
                    value={editingItem.sku || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    placeholder="e.g. LAP-001"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Unit Type *</label>
                  <select
                    value={editingItem.unit || 'PCS'}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="NOS">NOS (Numbers)</option>
                    <option value="KGS">KGS (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="BOX">BOX (Box)</option>
                    <option value="SET">SET (Set)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="PKT">PKT (Packets)</option>
                    <option value="BAG">BAG (Bags)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Default Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingItem.rate ?? ''}
                    onChange={(e) => setEditingItem({ ...editingItem, rate: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 55000"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono font-bold text-text focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">GST Tax Rate % *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 5, 12, 18, 28].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() =>
                          setEditingItem({
                            ...editingItem,
                            gstPercent: pct,
                            cgstPercent: pct / 2,
                            sgstPercent: pct / 2,
                            igstPercent: pct,
                          })
                        }
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          editingItem.gstPercent === pct
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                            : 'bg-surface border-cardBorder text-textMuted hover:text-text'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-textSubtle mt-1.5">
                    Intrastate: CGST {(editingItem.gstPercent || 0) / 2}% + SGST {(editingItem.gstPercent || 0) / 2}% | Interstate: IGST {editingItem.gstPercent || 0}%
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Description / Notes</label>
                  <textarea
                    rows={2}
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    placeholder="Detailed specifications, model number, etc."
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-cardBorder flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-xs font-semibold text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
