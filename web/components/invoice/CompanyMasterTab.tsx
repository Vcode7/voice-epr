'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, Building2, Check, X, Phone, Mail, MapPin, Landmark } from 'lucide-react';
import { Company } from '@/types';

export function CompanyMasterTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCompany, setEditingCompany] = useState<Partial<Company> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/invoice/companies');
      const data = await res.json();
      if (Array.isArray(data)) setCompanies(data);
    } catch (e: any) {
      console.error('Failed to fetch companies:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany?.name || !editingCompany?.gstin || !editingCompany?.address || !editingCompany?.city || !editingCompany?.state) {
      showNotification('Please fill in Company Name, GSTIN, Address, City, and State.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const isNew = !editingCompany.id;
      const url = isNew ? '/api/invoice/companies' : `/api/invoice/companies/${editingCompany.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCompany),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save company.');
      }

      showNotification(`Company "${editingCompany.name}" saved successfully!`, 'success');
      setEditingCompany(null);
      fetchCompanies();
    } catch (err: any) {
      showNotification(err.message || 'Save failed.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete company "${company.name}"?`)) return;
    try {
      const res = await fetch(`/api/invoice/companies/${company.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete company.');
      showNotification(`Company "${company.name}" deleted.`, 'success');
      fetchCompanies();
    } catch (e: any) {
      showNotification(e.message || 'Delete failed.', 'error');
    }
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.gstin.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-cardBorder p-4 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Company Master Management
          </h2>
          <p className="text-xs text-textMuted mt-0.5">
            Registered business entities for sales invoicing and purchasing. Vouchers strictly reference these records.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingCompany({
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
              bankDetails: { bankName: '', accountNumber: '', ifsc: '', branch: '' },
              termsAndConditions: '1. Payment due within 15 days from invoice date.\n2. Goods once sold will not be taken back.',
            })
          }
          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 transition cursor-pointer self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Company</span>
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
            placeholder="Search company by name, GSTIN, city, or state..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder">
          Loading companies...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder p-6 space-y-2">
          <Building2 className="w-8 h-8 text-textSubtle mx-auto" />
          <p className="font-semibold text-text">No companies found</p>
          <p>Click "Add Company" above to register your first billing company.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-cardBorder hover:border-primary/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 transition group"
            >
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-cardBorder/60">
                <div>
                  <h3 className="font-bold text-sm text-text flex items-center gap-1.5">
                    {c.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">
                      GSTIN: {c.gstin}
                    </span>
                    {c.pan && (
                      <span className="font-mono text-[10px] text-textMuted px-1.5 py-0.5 rounded bg-surface border border-cardBorder">
                        PAN: {c.pan}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingCompany(c)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-textSubtle hover:text-text transition cursor-pointer"
                    title="Edit Company"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-danger/20 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                    title="Delete Company"
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
                    {c.address}, {c.city}, {c.state} - {c.pincode} (Code: {c.stateCode})
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
              </div>

              {/* Bank Details Snippet */}
              {c.bankDetails?.bankName && (
                <div className="p-2.5 rounded-xl bg-surface/60 border border-cardBorder text-[11px] space-y-0.5 text-textMuted">
                  <div className="flex items-center gap-1 font-semibold text-text">
                    <Landmark className="w-3 h-3 text-secondary" />
                    <span>{c.bankDetails.bankName}</span>
                  </div>
                  <p>A/C: <span className="font-mono font-bold text-text">{c.bankDetails.accountNumber}</span> • IFSC: <span className="font-mono">{c.bankDetails.ifsc}</span></p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editingCompany !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cardBorder">
              <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {editingCompany.id ? 'Edit Company Master' : 'Add New Company'}
              </h3>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-1 rounded-lg text-textMuted hover:text-text hover:bg-surfaceMuted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.name || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    placeholder="e.g. ABC Infotech Pvt Ltd"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">GSTIN (15 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={editingCompany.gstin || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AABCA1234F1Z5"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono uppercase text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">PAN</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={editingCompany.pan || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. AABCA1234F"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono uppercase text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Registered Address *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.address || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                    placeholder="Street / Building / Area"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.city || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.state || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, state: e.target.value })}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">State Code (GST)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editingCompany.stateCode || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, stateCode: e.target.value })}
                    placeholder="e.g. 27"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Pincode</label>
                  <input
                    type="text"
                    value={editingCompany.pincode || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, pincode: e.target.value })}
                    placeholder="e.g. 400093"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingCompany.phone || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    placeholder="+91 98200 12345"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCompany.email || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    placeholder="billing@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="pt-2 border-t border-cardBorder space-y-3">
                <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-secondary" />
                  Bank Details (Printed on Invoices for Customer Remittance)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editingCompany.bankDetails?.bankName || ''}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          bankDetails: { ...(editingCompany.bankDetails || {}), bankName: e.target.value },
                        })
                      }
                      placeholder="e.g. HDFC Bank Ltd"
                      className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Account Number</label>
                    <input
                      type="text"
                      value={editingCompany.bankDetails?.accountNumber || ''}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          bankDetails: { ...(editingCompany.bankDetails || {}), accountNumber: e.target.value },
                        })
                      }
                      placeholder="e.g. 50200012345678"
                      className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs font-mono text-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={editingCompany.bankDetails?.ifsc || ''}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          bankDetails: { ...(editingCompany.bankDetails || {}), ifsc: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs font-mono uppercase text-text focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">Branch</label>
                    <input
                      type="text"
                      value={editingCompany.bankDetails?.branch || ''}
                      onChange={(e) =>
                        setEditingCompany({
                          ...editingCompany,
                          bankDetails: { ...(editingCompany.bankDetails || {}), branch: e.target.value },
                        })
                      }
                      placeholder="e.g. Andheri East, Mumbai"
                      className="w-full px-3 py-1.5 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-cardBorder flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-xs font-semibold text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Company'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
