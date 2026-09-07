'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import {
  Voucher,
  VoucherType,
  Company,
  Customer,
  Supplier,
  Item,
  VoiceVoucherValidationIssue,
  VoiceVoucherExtractionResult,
} from '@/types';
import { useWebAudioRecorder } from '@/hooks/useWebAudioRecorder';
import { VoucherLeftPanel } from './VoucherLeftPanel';
import { VoucherRightPanel } from './VoucherRightPanel';
import { VoucherHistoryList } from './VoucherHistoryList';
import { PrintableGstInvoice } from './PrintableGstInvoice';
import { calculateVoucherTotals } from '@/lib/utils/gstCalculator';

interface VoucherTabProps {
  companies: Company[];
  customers: Customer[];
  suppliers: Supplier[];
  items: Item[];
  onRefreshMasters: () => void;
}

export function VoucherTab({
  companies,
  customers,
  suppliers,
  items,
  onRefreshMasters,
}: VoucherTabProps) {
  // 1. Voucher Type Selector (Sales, Purchase, Receipt, Payment)
  const [voucherType, setVoucherType] = useState<VoucherType>('sales');

  // 2. Voucher Editor State (Left Panel)
  const [voucherData, setVoucherData] = useState<Partial<Voucher>>({
    voucherType: 'sales',
    companyId: companies[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    grandTotal: 0,
  });

  const [validationIssues, setValidationIssues] = useState<VoiceVoucherValidationIssue[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // 3. Audio & Voice Recording State (Right Panel)
  const recorder = useWebAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  // 4. Saved Vouchers History
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<VoucherType | 'all'>('all');
  const [historyFilterCompany, setHistoryFilterCompany] = useState<string>('all');

  // 5. Printable voucher instance (for window.print)
  const [printableVoucher, setPrintableVoucher] = useState<Voucher | null>(null);

  // Fetch voucher history
  const fetchVouchers = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/invoice/vouchers');
      const data = await res.json();
      if (Array.isArray(data)) setVouchers(data);
    } catch (e: any) {
      console.error('Failed to fetch vouchers:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Keep default company in voucherData if not set
  useEffect(() => {
    if (!voucherData.companyId && companies.length > 0) {
      setVoucherData((prev) => ({
        ...prev,
        companyId: companies[0].id,
        companySnapshot: companies[0],
      }));
    }
  }, [companies, voucherData.companyId]);

  // Reset or switch voucher type
  const handleVoucherTypeChange = (newType: VoucherType) => {
    setVoucherType(newType);
    setValidationIssues([]);
    setVoucherData((prev) => {
      const isPartyReset = newType === 'sales' || newType === 'receipt';
      return {
        voucherType: newType,
        companyId: prev.companyId || companies[0]?.id || '',
        companySnapshot: prev.companySnapshot || companies[0],
        customerId: isPartyReset ? prev.customerId : undefined,
        customerSnapshot: isPartyReset ? prev.customerSnapshot : undefined,
        supplierId: !isPartyReset ? prev.supplierId : undefined,
        supplierSnapshot: !isPartyReset ? prev.supplierSnapshot : undefined,
        date: prev.date || new Date().toISOString().split('T')[0],
        items: newType === 'sales' || newType === 'purchase' ? prev.items || [] : [],
        amount: newType === 'receipt' || newType === 'payment' ? prev.amount || 0 : undefined,
        grandTotal: prev.grandTotal || 0,
      };
    });
  };

  // Process recorded or uploaded audio
  const processAudioInput = async (blob: Blob | File, filename: string = 'recording.webm') => {
    try {
      setIsProcessing(true);
      recorder.setState('Transcribing');
      setProcessingStatus('Transcribing speech with Whisper AI...');

      const formData = new FormData();
      formData.append('file', blob, filename);

      const transcribeRes = await fetch('/api/groq/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        const errData = await transcribeRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Audio transcription failed.');
      }

      const { text } = await transcribeRes.json();
      setLastTranscript(text);
      const audioUrl = blob instanceof Blob ? URL.createObjectURL(blob) : null;
      if (audioUrl) setLastAudioUrl(audioUrl);

      recorder.setState('Understanding');
      setProcessingStatus(`Extracting structured ${voucherType} voucher...`);

      // Extract voice voucher with strict master matching
      const extractRes = await fetch('/api/groq/voice-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          voucherType,
        }),
      });

      if (!extractRes.ok) {
        const errData = await extractRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Voice extraction failed.');
      }

      const extracted: VoiceVoucherExtractionResult = await extractRes.json();

      // Resolve extracted entities with masters
      const matchedCompany = companies.find((c) => c.id === extracted.companyId) || companies[0];
      const matchedCustomer = customers.find((c) => c.id === extracted.customerId);
      const matchedSupplier = suppliers.find((s) => s.id === extracted.supplierId);

      // Build structured line items
      let resolvedItems = (extracted.items || []).map((it) => {
        const masterItem = items.find((mi) => mi.id === it.itemId);
        return {
          id: `vitem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          itemId: it.itemId || masterItem?.id || '',
          itemName: it.name || masterItem?.name || 'Spoken Item',
          hsnCode: masterItem?.hsnCode || '0000',
          sku: masterItem?.sku,
          quantity: it.quantity || 1,
          unit: it.unit || masterItem?.unit || 'PCS',
          rate: it.rate !== undefined ? it.rate : masterItem?.rate || 0,
          discount: it.discount || 0,
          taxableAmount: 0,
          gstPercent: it.gstPercent !== undefined ? it.gstPercent : masterItem?.gstPercent || 18,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
        };
      });

      // Compute totals if items present
      let calculatedTotals = calculateVoucherTotals(
        resolvedItems,
        matchedCompany,
        voucherType === 'sales' ? matchedCustomer : matchedSupplier,
        extracted.date
      );

      setVoucherData((prev) => ({
        ...prev,
        voucherType,
        companyId: matchedCompany?.id || prev.companyId,
        companySnapshot: matchedCompany,
        customerId: matchedCustomer?.id || (voucherType === 'sales' || voucherType === 'receipt' ? prev.customerId : undefined),
        customerSnapshot: matchedCustomer || (voucherType === 'sales' || voucherType === 'receipt' ? prev.customerSnapshot : undefined),
        supplierId: matchedSupplier?.id || (voucherType === 'purchase' || voucherType === 'payment' ? prev.supplierId : undefined),
        supplierSnapshot: matchedSupplier || (voucherType === 'purchase' || voucherType === 'payment' ? prev.supplierSnapshot : undefined),
        date: extracted.date || prev.date || new Date().toISOString().split('T')[0],
        items: calculatedTotals.items,
        subtotal: calculatedTotals.subtotal,
        taxableAmount: calculatedTotals.taxableAmount,
        cgstTotal: calculatedTotals.cgstTotal,
        sgstTotal: calculatedTotals.sgstTotal,
        igstTotal: calculatedTotals.igstTotal,
        taxTotal: calculatedTotals.taxTotal,
        roundOff: calculatedTotals.roundOff,
        grandTotal: voucherType === 'receipt' || voucherType === 'payment' ? extracted.amount || prev.grandTotal || 0 : calculatedTotals.grandTotal,
        amount: extracted.amount || prev.amount || 0,
        referenceInvoiceNumber: extracted.referenceInvoiceNumber || prev.referenceInvoiceNumber,
        paymentMode: extracted.paymentMode || prev.paymentMode || 'Cash',
        referenceTransactionNumber: extracted.referenceTransactionNumber || prev.referenceTransactionNumber,
        narration: extracted.narration || prev.narration,
        notes: extracted.notes || prev.notes,
        rawTranscript: text,
        audioUrl,
      }));

      setValidationIssues(extracted.validationIssues || []);
      recorder.setState('Ready');
    } catch (err: any) {
      console.error('Audio processing error:', err);
      recorder.setErrorMessage(err.message || 'Processing failed. Please try again.');
      recorder.setState('Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicPress = async () => {
    if (recorder.state === 'Recording') {
      const blob = await recorder.stopRecording();
      if (!blob) return;
      await processAudioInput(blob, 'recording.webm');
    } else {
      await recorder.startRecording();
    }
  };

  const handleUploadAudio = async (file: File) => {
    if (!file) return;
    if (recorder.state === 'Recording') {
      await recorder.stopRecording();
    }
    await processAudioInput(file, file.name);
  };

  // Save Voucher Handler
  const handleSaveVoucher = async () => {
    if (!voucherData.companyId) {
      alert('Please select a company from Company master.');
      return;
    }

    if (validationIssues.length > 0) {
      alert('Cannot save voucher. Please resolve the validation issues first (e.g. register missing customer/supplier/item).');
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch('/api/invoice/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucherData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save voucher.');
      }

      const savedVoucher: Voucher = await res.json();
      setSuccessBanner(`✓ ${savedVoucher.voucherType.toUpperCase()} voucher #${savedVoucher.voucherNumber} saved successfully!`);
      fetchVouchers();

      // Reset voucher data for next entry
      setVoucherData({
        voucherType,
        companyId: voucherData.companyId,
        companySnapshot: voucherData.companySnapshot,
        date: new Date().toISOString().split('T')[0],
        items: [],
        grandTotal: 0,
      });
      setValidationIssues([]);
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err: any) {
      alert(`Save Error: ${err.message || 'Failed to save voucher'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Print voucher handler
  const handlePrintCurrent = () => {
    const fullVoucher: Voucher = {
      ...(voucherData as Voucher),
      id: voucherData.id || `preview_${Date.now()}`,
      voucherType,
      voucherNumber: voucherData.voucherNumber || 'DRAFT-001',
      date: voucherData.date || new Date().toISOString().split('T')[0],
      companyId: voucherData.companyId || companies[0]?.id || '',
      companySnapshot: voucherData.companySnapshot || companies[0] || {},
      customerSnapshot: voucherData.customerSnapshot,
      supplierSnapshot: voucherData.supplierSnapshot,
      items: voucherData.items || [],
      grandTotal: voucherData.grandTotal || voucherData.amount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPrintableVoucher(fullVoucher);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handlePrintPastVoucher = (voucher: Voucher) => {
    setPrintableVoucher(voucher);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleEditPastVoucher = (voucher: Voucher) => {
    setVoucherType(voucher.voucherType);
    setVoucherData(voucher);
    setValidationIssues([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePastVoucher = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voucher from database?')) return;
    try {
      const res = await fetch(`/api/invoice/vouchers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete voucher.');
      fetchVouchers();
    } catch (e: any) {
      alert(e.message || 'Delete failed.');
    }
  };

  const handleClearVoucher = () => {
    setVoucherData({
      voucherType,
      companyId: companies[0]?.id || '',
      companySnapshot: companies[0],
      date: new Date().toISOString().split('T')[0],
      items: [],
      grandTotal: 0,
    });
    setValidationIssues([]);
    setLastTranscript(null);
    setLastAudioUrl(null);
  };

  // Filter vouchers in history
  const filteredHistory = vouchers.filter((v) => {
    if (historyFilterType !== 'all' && v.voucherType !== historyFilterType) return false;
    if (historyFilterCompany !== 'all' && v.companyId !== historyFilterCompany) return false;
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      const num = (v.voucherNumber || '').toLowerCase();
      const party = (v.customerSnapshot?.name || v.supplierSnapshot?.name || '').toLowerCase();
      const comp = (v.companySnapshot?.name || '').toLowerCase();
      const ref = (v.referenceInvoiceNumber || v.supplierInvoiceNumber || '').toLowerCase();
      const itemMatch = (v.items || []).some((it) => it.itemName.toLowerCase().includes(q));
      return num.includes(q) || party.includes(q) || comp.includes(q) || ref.includes(q) || itemMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hidden Black and White GST Printable Invoice */}
      <PrintableGstInvoice voucher={printableVoucher} />

      {/* Success Banner */}
      {successBanner && (
        <div className="p-3 rounded-xl bg-success/20 border border-success/40 text-success text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-xs text-textMuted hover:text-text cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP VOUCHER TYPE SELECTOR TABS (Sales, Purchase, Receipt, Payment) */}
      <div className="bg-card border border-cardBorder rounded-2xl p-3 sm:p-4 shadow-sm no-print">
        <label className="text-[11px] font-bold text-textSubtle uppercase tracking-wider block mb-2">
          Select Voucher Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Sales */}
          <button
            onClick={() => handleVoucherTypeChange('sales')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              voucherType === 'sales'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-500 font-extrabold scale-[1.01]'
                : 'bg-surface hover:bg-surfaceMuted border border-cardBorder text-textMuted hover:text-text'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Sales Voucher</span>
          </button>

          {/* Purchase */}
          <button
            onClick={() => handleVoucherTypeChange('purchase')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              voucherType === 'purchase'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 border border-indigo-500 font-extrabold scale-[1.01]'
                : 'bg-surface hover:bg-surfaceMuted border border-cardBorder text-textMuted hover:text-text'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchase Bill</span>
          </button>

          {/* Receipt */}
          <button
            onClick={() => handleVoucherTypeChange('receipt')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              voucherType === 'receipt'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 border border-purple-500 font-extrabold scale-[1.01]'
                : 'bg-surface hover:bg-surfaceMuted border border-cardBorder text-textMuted hover:text-text'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Receipt (Inflow)</span>
          </button>

          {/* Payment */}
          <button
            onClick={() => handleVoucherTypeChange('payment')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              voucherType === 'payment'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/25 border border-amber-500 font-extrabold scale-[1.01]'
                : 'bg-surface hover:bg-surfaceMuted border border-cardBorder text-textMuted hover:text-text'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Payment (Outflow)</span>
          </button>
        </div>
      </div>

      {/* TWO-PANEL VOICE-TO-DATA LAYOUT (Left: Structured Data | Right: Voice Recording Console) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        {/* LEFT PANEL: Structured Voucher Data Form */}
        <div className="lg:col-span-7 h-full">
          <VoucherLeftPanel
            voucherType={voucherType}
            voucherData={voucherData}
            onUpdateVoucherData={setVoucherData}
            companies={companies}
            customers={customers}
            suppliers={suppliers}
            items={items}
            validationIssues={validationIssues}
            onDismissIssue={(idx) => setValidationIssues((prev) => prev.filter((_, i) => i !== idx))}
            isSaving={isSaving}
            onSaveVoucher={handleSaveVoucher}
            onPrintVoucher={handlePrintCurrent}
            onClearVoucher={handleClearVoucher}
          />
        </div>

        {/* RIGHT PANEL: Voice Recording Console */}
        <div className="lg:col-span-5 h-full">
          <VoucherRightPanel
            voucherType={voucherType}
            recordingState={recorder.state}
            durationSeconds={recorder.durationSeconds}
            volumeLevel={recorder.volumeLevel}
            isProcessing={isProcessing}
            processingStatus={processingStatus}
            errorMessage={recorder.errorMessage}
            lastAudioUrl={lastAudioUrl}
            lastTranscript={lastTranscript}
            onMicPress={handleMicPress}
            onUploadAudio={handleUploadAudio}
          />
        </div>
      </div>

      {/* SAVED VOUCHERS DATABASE HISTORY */}
      <div className="no-print pt-2">
        <VoucherHistoryList
          vouchers={filteredHistory}
          companies={companies}
          customers={customers}
          suppliers={suppliers}
          search={historySearch}
          onSearchChange={setHistorySearch}
          filterType={historyFilterType}
          onFilterTypeChange={setHistoryFilterType}
          filterCompanyId={historyFilterCompany}
          onFilterCompanyChange={setHistoryFilterCompany}
          onEditVoucher={handleEditPastVoucher}
          onPrintVoucher={handlePrintPastVoucher}
          onDeleteVoucher={handleDeletePastVoucher}
        />
      </div>
    </div>
  );
}
