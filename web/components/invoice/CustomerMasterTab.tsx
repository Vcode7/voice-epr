'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, Users, Check, X, Phone, Mail, MapPin, UserCheck, Package } from 'lucide-react';
import { Customer } from '@/types';

export function CustomerMasterTab() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoice/customers');
      const data = await res.json();
      if (Array.isArray(data)) setCustomers(data);
    } catch (e: any) {
      console.error('Failed to fetch customers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.name || !editingCustomer?.address || !editingCustomer?.city || !editingCustomer?.state) {
      showNotification('Please fill in Customer Name, Address, City, and State.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const isNew = !editingCustomer.id;
      const url = isNew ? '/api/invoice/customers' : `/api/invoice/customers/${editingCustomer.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save customer.');
      }

      showNotification(`Customer "${editingCustomer.name}" saved successfully!`, 'success');
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      showNotification(err.message || 'Save failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete customer "${customer.name}"?`)) return;
    try {
      const res = await fetch(`/api/invoice/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete customer.');
      showNotification(`Customer "${customer.name}" deleted.`, 'success');
      fetchCustomers();
    } catch (e: any) {
      showNotification(e.message || 'Delete failed.', 'error');
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.gstin || '').toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-cardBorder p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            Customer Master Management
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Registered buyers and clients for Sales invoices and Receipts. Vouchers strictly validate against these records.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingCustomer({
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
          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
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
            placeholder="Search customer by name, GSTIN, contact person, or city..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder">
          Loading customers...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6 space-y-2">
          <Users className="w-8 h-8 text-textSubtle mx-auto" />
          <p className="font-semibold text-text">No customers found</p>
          <p>Click "Add Customer" above to register your first buyer.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-cardBorder hover:border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition group"
            >
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-cardBorder/60">
                <div>
                  <h3 className="font-bold text-sm text-text flex items-center gap-1.5">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                      GSTIN: {c.gstin || 'Unregistered'}
                    </span>
                    {c.contactPerson && (
                      <span className="text-[11px] text-textMuted flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-textSubtle" />
                        {c.contactPerson}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingCustomer(c)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-textSubtle hover:text-text transition cursor-pointer"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                    title="Delete Customer"
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
                    {c.address}, {c.city}, {c.state} {c.pincode ? `- ${c.pincode}` : ''} {c.stateCode ? `(Code: ${c.stateCode})` : ''}
                  </span>
                </div>
                {c.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-textSubtle shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-textSubtle shrink-0" />
                    <span>{c.email}</span>
                  </div>
                )}
                {c.shippingAddress?.address && (
                  <div className="flex items-start gap-1.5 pt-1 text-[11px] text-textSubtle border-t border-cardBorder/60 mt-1">
                    <Package className="w-3 h-3 text-textSubtle shrink-0 mt-0.5" />
                    <span>Ship to: {c.shippingAddress.address}, {c.shippingAddress.city}, {c.shippingAddress.state}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingCustomer !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cardBorder">
              <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                {editingCustomer.id ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1 rounded-lg text-textMuted hover:text-text hover:bg-surfaceMuted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    placeholder="e.g. XYZ Enterprises"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">GSTIN (Optional if Unregistered)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={editingCustomer.gstin || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 24AAACX9876J1Z1"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono uppercase text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editingCustomer.contactPerson || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, contactPerson: e.target.value })}
                    placeholder="e.g. Anil Mehta"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Billing Address *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.address || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    placeholder="Office / Street / Area"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.city || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                    placeholder="e.g. Ahmedabad"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.state || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, state: e.target.value })}
                    placeholder="e.g. Gujarat"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">State Code (GST)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editingCustomer.stateCode || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, stateCode: e.target.value })}
                    placeholder="e.g. 24"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editingCustomer.pincode || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, pincode: e.target.value })}
                    placeholder="e.g. 380009"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    placeholder="+91 97234 56789"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    placeholder="purchase@client.com"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Shipping Address Section */}
              <div className="pt-2 border-t border-cardBorder space-y-3">
                <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-secondary" />
                  Shipping / Delivery Destination (Optional - defaults to billing address)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Shipping Street Address</label>
                    <input
                      type="text"
                      value={editingCustomer.shippingAddress?.address || ''}
                      onChange={(e) =>
                        setEditingCustomer({
                          ...editingCustomer,
                          shippingAddress: { ...(editingCustomer.shippingAddress || {}), address: e.target.value },
                        })
                      }
                      placeholder="e.g. Plot 12, GIDC Phase 2, Vatva"
                      className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Shipping City</label>
                    <input
                      type="text"
                      value={editingCustomer.shippingAddress?.city || ''}
                      onChange={(e) =>
                        setEditingCustomer({
                          ...editingCustomer,
                          shippingAddress: { ...(editingCustomer.shippingAddress || {}), city: e.target.value },
                        })
                      }
                      placeholder="e.g. Ahmedabad"
                      className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Shipping State</label>
                    <input
                      type="text"
                      value={editingCustomer.shippingAddress?.state || ''}
                      onChange={(e) =>
                        setEditingCustomer({
                          ...editingCustomer,
                          shippingAddress: { ...(editingCustomer.shippingAddress || {}), state: e.target.value },
                        })
                      }
                      placeholder="e.g. Gujarat"
                      className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-cardBorder flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-xs font-semibold text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
