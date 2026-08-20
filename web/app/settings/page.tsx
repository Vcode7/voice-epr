'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Key,
  Building,
  Coins,
  Database,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  LayoutTemplate,
  Eye,
} from 'lucide-react';
import { UserSettings, InvoiceFormatType, BankDetails } from '@/types';
import { CURRENCIES, DEFAULT_SETTINGS } from '@/lib/constants';
import { InvoiceFormatPreviewModal } from '@/components/invoice/InvoiceFormatPreviewModal';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showFormatPreview, setShowFormatPreview] = useState(false);

  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: DEFAULT_SETTINGS.bankDetails?.bankName || 'HDFC Bank',
    accountHolder: DEFAULT_SETTINGS.bankDetails?.accountHolder || 'My Enterprise / Shop',
    accountNumber: DEFAULT_SETTINGS.bankDetails?.accountNumber || '50200012345678',
    ifsc: DEFAULT_SETTINGS.bankDetails?.ifsc || 'HDFC0001234',
    branch: DEFAULT_SETTINGS.bankDetails?.branch || 'Main City Branch',
  });

  const [invoiceFormat, setInvoiceFormat] = useState<InvoiceFormatType>(
    DEFAULT_SETTINGS.invoiceFormat || 'standard'
  );

  const [keyStatus, setKeyStatus] = useState<{
    hasEnvKey: boolean;
    hasCustomKey: boolean;
    isConfigured: boolean;
    activeKeyType: string;
  }>({
    hasEnvKey: false,
    hasCustomKey: false,
    isConfigured: false,
    activeKeyType: 'none',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const loadSettings = async () => {
    try {
      const [setRes, keyRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/groq/status'),
      ]);
      const setData = await setRes.json();
      const keyData = await keyRes.json();

      setSettings(setData);
      setApiKeyInput(setData.customGroqApiKey || '');
      if (setData.bankDetails) setBankDetails(setData.bankDetails);
      if (setData.invoiceFormat) setInvoiceFormat(setData.invoiceFormat);
      setKeyStatus(keyData);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated: UserSettings = {
        ...settings,
        bankDetails,
        invoiceFormat,
        customGroqApiKey: apiKeyInput.trim(),
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      setSettings(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemoData = async () => {
    if (!confirm('This will seed sample transactions, GST invoices, and EPR records into your MongoDB database.')) return;
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      alert(`Demo Data Seeded! Loaded ${data.stats?.transactionsCount || 7} transactions, ${data.stats?.receiptsCount || 2} receipts, and ${data.stats?.dataEntriesCount || 2} Voice EPR records.`);
    } catch (e) {
      alert('Failed to seed demo data.');
    }
  };

  const handleClearData = async () => {
    if (!confirm('WARNING: Are you sure you want to delete ALL stored records? This action cannot be undone.')) return;
    try {
      await fetch('/api/clear', { method: 'POST' });
      alert('All database records have been cleared.');
    } catch (e) {
      alert('Failed to clear database records.');
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    window.open(`/api/export?format=${format}`, '_blank');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportResult(null);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setImportResult(data);
    } catch (err: any) {
      alert(err.message || 'Import failed.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          Settings & Enterprise Profile
        </h1>
        <p className="text-xs text-textMuted mt-0.5">
          Configure business profile, bank details, tax invoice format, Groq keys, and database backup.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Details */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-cardBorder shadow-md space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" />
            Enterprise & Supplier Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Business / Supplier Name
              </label>
              <input
                type="text"
                value={settings.businessName}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Business Phone
              </label>
              <input
                type="text"
                value={settings.businessPhone}
                onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={settings.receiptPrefix}
                onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Registered Business Address
              </label>
              <input
                type="text"
                value={settings.businessAddress}
                onChange={(e) => setSettings({ ...settings, businessAddress: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Business Bank Details (For Invoices) */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-cardBorder shadow-md space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Business Bank Details (Printed on Invoices)
          </h2>
          <p className="text-[11px] text-textSubtle leading-relaxed">
            These bank credentials appear on customer tax invoices for NEFT, RTGS, and IMPS payments.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                placeholder="e.g. HDFC Bank"
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={bankDetails.accountHolder}
                onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                placeholder="e.g. My Enterprise Pvt Ltd"
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                placeholder="e.g. 50200012345678"
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={bankDetails.ifsc}
                onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                placeholder="e.g. HDFC0001234"
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-mono uppercase"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
                Branch & City
              </label>
              <input
                type="text"
                value={bankDetails.branch}
                onChange={(e) => setBankDetails({ ...bankDetails, branch: e.target.value })}
                placeholder="e.g. Industrial Area Branch, City"
                className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Invoice Format Selector */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-cardBorder shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              Default Invoice Format
            </h2>

            <button
              type="button"
              onClick={() => setShowFormatPreview(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg bg-primary/10 border border-primary/30"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview & Compare Formats</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div
              onClick={() => setInvoiceFormat('standard')}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                invoiceFormat === 'standard'
                  ? 'bg-primary/15 border-primary shadow-md shadow-primary/15'
                  : 'bg-slate-900/60 border-cardBorder hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-text">Standard Modern Invoice</h3>
                  {invoiceFormat === 'standard' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-[11px] text-textSubtle mt-1 leading-relaxed">
                  Vibrant dark card style with accent badges, structured summary boxes, and modern typography.
                </p>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase">Modern UI Layout</span>
            </div>

            <div
              onClick={() => setInvoiceFormat('basic_tax')}
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                invoiceFormat === 'basic_tax'
                  ? 'bg-neutral-100/10 border-neutral-300 shadow-md shadow-white/10'
                  : 'bg-slate-900/60 border-cardBorder hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-text">Basic Tax Invoice (A4 B&W)</h3>
                  {invoiceFormat === 'basic_tax' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[11px] text-textSubtle mt-1 leading-relaxed">
                  Clean, formal black-and-white GST Tax Invoice layout with classic grid borders, HSN table, and Bank details for A4 printing.
                </p>
              </div>
              <span className="text-[10px] font-bold text-cyan-400 uppercase">Formal A4 Print Ready</span>
            </div>
          </div>
        </div>

        {/* Currency Selector */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-cardBorder shadow-md space-y-4">
          <h2 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-secondary" />
            Default Currency
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {CURRENCIES.map((c) => {
              const isSelected = settings.currency === c.code;

              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSettings({ ...settings, currency: c.code, currencySymbol: c.symbol })}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-secondary/15 border-secondary text-text font-bold shadow-sm'
                      : 'bg-slate-900/60 border-cardBorder text-textMuted hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold text-text flex items-center justify-between">
                    <span>{c.code}</span>
                    <span className="text-secondary">{c.symbol}</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-textSubtle truncate mt-0.5">{c.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Groq Keys Configuration */}
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-cardBorder shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-accent" />
              Groq AI Cloud Keys
            </h2>
            {keyStatus.isConfigured ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Active ({keyStatus.activeKeyType})
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Offline Mode
              </span>
            )}
          </div>

          <p className="text-[11px] sm:text-xs text-textSubtle leading-relaxed">
            Multi-tier automatic failover across primary and backup keys.
          </p>

          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-textSubtle mb-1">
              Custom Groq API Key Override
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="gsk_..."
              className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-1">
          {saveSuccess && (
            <span className="text-xs text-secondary font-bold flex items-center gap-1 animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Settings & Bank Details Saved!
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="ml-auto px-5 sm:px-6 py-2.5 rounded-xl bg-primary hover:bg-primaryDark text-white text-xs font-bold shadow-lg shadow-primary/25 transition cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Database Management & Portability */}
      <div className="p-4 sm:p-6 rounded-2xl bg-card border border-cardBorder shadow-md space-y-4 sm:space-y-6">
        <h2 className="text-xs sm:text-sm font-bold text-text uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          MongoDB Database Operations
        </h2>

        {/* Seed & Clear */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-cardBorder space-y-2">
            <h3 className="text-xs font-bold text-text flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Load Sample Demo Data
            </h3>
            <p className="text-[10px] sm:text-[11px] text-textSubtle leading-relaxed">
              Populate database with sample transactions, invoices, and EPR records.
            </p>
            <button
              onClick={handleSeedDemoData}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-text transition cursor-pointer"
            >
              Seed Demo Records
            </button>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/60 border border-cardBorder space-y-2">
            <h3 className="text-xs font-bold text-danger flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Clear Local / DB Data
            </h3>
            <p className="text-[10px] sm:text-[11px] text-textSubtle leading-relaxed">
              Permanently wipe all records from the database.
            </p>
            <button
              onClick={handleClearData}
              className="px-3.5 py-1.5 rounded-lg bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30 text-xs font-semibold transition cursor-pointer"
            >
              Wipe Database
            </button>
          </div>
        </div>

        {/* Export / Import Section */}
        <div className="pt-3 sm:pt-4 border-t border-cardBorder/60 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Export */}
            <div className="space-y-2">
              <label className="block text-[11px] sm:text-xs font-bold uppercase text-textSubtle">
                Export History
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleExport('json')}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-text flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-text flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-secondary" />
                  CSV
                </button>
              </div>
            </div>

            {/* Import */}
            <div className="space-y-2">
              <label className="block text-[11px] sm:text-xs font-bold uppercase text-textSubtle">
                Import Backup
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleImportFile}
                  disabled={importing}
                  className="block w-full text-xs text-textMuted file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primaryDark file:cursor-pointer"
                />
              </div>
            </div>
          </div>

          {importResult && (
            <div className="p-3 rounded-xl bg-slate-900 border border-cardBorder text-xs space-y-1">
              <div className="font-bold text-secondary flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Import Complete
              </div>
              <p className="text-textMuted">
                Found {importResult.totalFound} items. Imported {importResult.importedCount} new records (Skipped {importResult.skippedCount} duplicates).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Format Preview Modal */}
      {showFormatPreview && (
        <InvoiceFormatPreviewModal
          currentFormat={invoiceFormat}
          settings={{ ...settings, bankDetails, invoiceFormat }}
          onSelectFormat={(newFormat) => setInvoiceFormat(newFormat)}
          onClose={() => setShowFormatPreview(false)}
        />
      )}
    </div>
  );
}
