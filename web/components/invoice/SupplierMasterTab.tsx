'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, Truck, Check, X, Phone, Mail, MapPin, UserCheck } from 'lucide-react';
import { Supplier } from '@/types';

export function SupplierMasterTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoice/suppliers');
      const data = await res.json();
      if (Array.isArray(data)) setSuppliers(data);
    } catch (e: any) {
      console.error('Failed to fetch suppliers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name || !editingSupplier?.address || !editingSupplier?.city || !editingSupplier?.state) {
      showNotification('Please fill in Supplier Name, Address, City, and State.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const isNew = !editingSupplier.id;
      const url = isNew ? '/api/invoice/suppliers' : `/api/invoice/suppliers/${editingSupplier.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSupplier),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save supplier.');
      }

      showNotification(`Supplier "${editingSupplier.name}" saved successfully!`, 'success');
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      showNotification(err.message || 'Save failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) return;
    try {
      const res = await fetch(`/api/invoice/suppliers/${supplier.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete supplier.');
      showNotification(`Supplier "${supplier.name}" deleted.`, 'success');
      fetchSuppliers();
    } catch (e: any) {
      showNotification(e.message || 'Delete failed.', 'error');
    }
  };

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-cardBorder p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-400" />
            Supplier Master Management
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Vendors and suppliers for Purchase bills and Payment disbursements. Vouchers strictly validate against these records.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingSupplier({
              name: '',
              gstin: '',
              pan: '',
              address: '',
              city: '',
              state: 'Maharashtra',
              stateCode: '27',
              pincode: '',
              phone: '',
              email: '',
              contactPerson: '',
            })
          }
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition cursor-pointer self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
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
            placeholder="Search supplier by name, GSTIN, contact person, or city..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Suppliers List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder">
          Loading suppliers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6 space-y-2">
          <Truck className="w-8 h-8 text-textSubtle mx-auto" />
          <p className="font-semibold text-text">No suppliers found</p>
          <p>Click "Add Supplier" above to register your vendor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-card border border-cardBorder hover:border-indigo-500/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition group"
            >
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-cardBorder/60">
                <div>
                  <h3 className="font-bold text-sm text-text flex items-center gap-1.5">
                    {s.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                      GSTIN: {s.gstin || 'Unregistered'}
                    </span>
                    {s.contactPerson && (
                      <span className="text-[11px] text-textMuted flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-textSubtle" />
                        {s.contactPerson}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingSupplier(s)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-textSubtle hover:text-text transition cursor-pointer"
                    title="Edit Supplier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                    title="Delete Supplier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Address & Contacts */}
              <div className="space-y-1 text-xs text-textMuted">
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-textSubtle shrink-0 mt-0.5" />
                  <span>
                    {s.address}, {s.city}, {s.state} {s.pincode ? `- ${s.pincode}` : ''} {s.stateCode ? `(Code: ${s.stateCode})` : ''}
                  </span>
                </div>
                {s.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-textSubtle shrink-0" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-textSubtle shrink-0" />
                    <span>{s.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingSupplier !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cardBorder">
              <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                {editingSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                onClick={() => setEditingSupplier(null)}
                className="p-1 rounded-lg text-textMuted hover:text-text hover:bg-surfaceMuted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.name || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    placeholder="e.g. Global Tech Supplies"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">GSTIN (Optional if Unregistered)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editingSupplier.gstin || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AABCG5678K1Z2"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono uppercase text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editingSupplier.contactPerson || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, contactPerson: e.target.value })}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Address *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.address || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                    placeholder="Shop/Office Address"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.city || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.state || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">State Code (GST)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editingSupplier.stateCode || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, stateCode: e.target.value })}
                    placeholder="e.g. 27"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editingSupplier.pincode || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, pincode: e.target.value })}
                    placeholder="e.g. 400062"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    placeholder="+91 98111 22334"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingSupplier.email || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                    placeholder="orders@supplier.com"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-cardBorder flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-xs font-semibold text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
