'use client';

import React from 'react';
import {
  Save,
  Printer,
  Download,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  FileText,
  User,
  Phone,
  Calendar,
  Building2,
  Stethoscope,
  Clock,
  Sparkles,
  Pill,
  RotateCcw,
} from 'lucide-react';
import { DoctorPrescription, PrescriptionMedicine, DataTemplate } from '@/types';

interface PrescriptionActiveViewProps {
  prescription: Partial<DoctorPrescription>;
  activeTemplate: DataTemplate;
  isSaving: boolean;
  onUpdateField: (key: string, value: any) => void;
  onUpdateMedicine: (index: number, key: keyof PrescriptionMedicine, value: any) => void;
  onAddMedicine: () => void;
  onDeleteMedicine: (index: number) => void;
  onToggleTiming: (index: number) => void;
  onSave: () => void;
  onPrint: () => void;
  onDownloadPDF: () => void;
  onSendEmail: () => void;
  onSendWhatsApp: () => void;
  onClear: () => void;
}

export function PrescriptionActiveView({
  prescription,
  activeTemplate,
  isSaving,
  onUpdateField,
  onUpdateMedicine,
  onAddMedicine,
  onDeleteMedicine,
  onToggleTiming,
  onSave,
  onPrint,
  onDownloadPDF,
  onSendEmail,
  onSendWhatsApp,
  onClear,
}: PrescriptionActiveViewProps) {
  const medicines = prescription.medicines || [];

  const hasEmail = Boolean(prescription.email && prescription.email.includes('@'));
  const hasPhone = Boolean(prescription.phone && prescription.phone.trim().length >= 7);
  const hasContent = Boolean(
    prescription.patientName ||
    prescription.phone ||
    prescription.email ||
    prescription.doctorName ||
    prescription.diagnosis ||
    medicines.length > 0
  );

  return (
    <div className="bg-card border border-cardBorder rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-5 h-full">
      {/* 1. Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cardBorder/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text tracking-wide">
              {activeTemplate.name || 'Doctor Prescription'}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-xs font-mono font-bold">
              {medicines.length} {medicines.length === 1 ? 'medicine' : 'medicines'}
            </span>
          </div>
          <p className="text-xs text-textMuted mt-0.5">
            Extracted fields &amp; dynamic medicine table. Review, edit, and Save/Print/Email.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Save Button */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 active:scale-95"
            title="Save prescription to database"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={onPrint}
            className="px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer hover:border-teal-500/50 shadow-sm active:scale-95"
            title="Print prescription document"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            <span>Print</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={onDownloadPDF}
            className="px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer hover:border-cyan-500/50 shadow-sm active:scale-95"
            title="Download PDF"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>PDF</span>
          </button>

          {/* Email Button */}
          <button
            onClick={onSendEmail}
            disabled={!hasEmail}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 ${
              hasEmail
                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                : 'bg-surface/50 text-textSubtle border-cardBorder opacity-50 cursor-not-allowed'
            }`}
            title={hasEmail ? `Send to ${prescription.email}` : 'Enter email address first'}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          {/* WhatsApp Button */}
          <button
            onClick={onSendWhatsApp}
            disabled={!hasPhone}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95 ${
              hasPhone
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : 'bg-surface/50 text-textSubtle border-cardBorder opacity-50 cursor-not-allowed'
            }`}
            title={hasPhone ? `Send to ${prescription.phone}` : 'Enter phone number first'}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Clear Button */}
          {hasContent && (
            <button
              onClick={onClear}
              className="p-2 rounded-xl bg-surface hover:bg-danger/15 hover:text-danger text-textSubtle border border-cardBorder hover:border-danger/30 text-xs transition cursor-pointer shadow-sm active:scale-95"
              title="Clear prescription form"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Top-Level Prescription Fields (Generated from Template Fields) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-cardBorder/60">
          <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-teal-500" />
            <span>Patient &amp; Doctor Information</span>
          </span>
          <span className="text-[11px] text-textSubtle">Manually Editable</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Dynamic Template Fields */}
          {activeTemplate.fields.map((field) => {
            // Map extractionKey or field.id to value
            const fieldKey = field.extractionKey;
            let val = (prescription as any)[fieldKey] ?? '';

            // Handle common alias mappings
            if (fieldKey === 'patient_name' && prescription.patientName) val = prescription.patientName;
            if (fieldKey === 'doctor_name' && prescription.doctorName) val = prescription.doctorName;
            if (fieldKey === 'phone_number' && prescription.phone) val = prescription.phone;
            if (fieldKey === 'clinic_details' && prescription.clinicDetails) val = prescription.clinicDetails;

            return (
              <div
                key={field.id}
                className={
                  fieldKey === 'clinic_details' || fieldKey === 'diagnosis' || fieldKey === 'notes'
                    ? 'sm:col-span-2'
                    : ''
                }
              >
                <label className="block text-[11px] font-semibold text-textMuted mb-1">
                  {field.name}
                  {field.required && <span className="text-danger ml-0.5">*</span>}
                </label>
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'text' : 'text'}
                  value={val}
                  onChange={(e) => onUpdateField(fieldKey, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.name.toLowerCase()}...`}
                  className="w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500 font-medium"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Dynamic Prescribed Medicines Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-cardBorder/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-teal-500" />
              <span>Prescribed Medicines Table</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-[10px] font-mono font-bold">
              {medicines.length} {medicines.length === 1 ? 'row' : 'rows'}
            </span>
          </div>

          <button
            onClick={onAddMedicine}
            className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine</span>
          </button>
        </div>

        {medicines.length === 0 ? (
          <div className="py-8 text-center rounded-xl bg-background/50 border border-dashed border-cardBorder text-xs text-textMuted space-y-1">
            <p>No medicines added yet.</p>
            <p className="text-[11px] text-textSubtle">
              Dictate medicines using the voice console on the right, or click &quot;Add Medicine&quot; to add rows manually.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {medicines.map((med, index) => {
              const isBF = med.timing === 'BF' || String(med.timing).toUpperCase().includes('BF');

              return (
                <div
                  key={med.id || index}
                  className="p-3.5 rounded-xl bg-background border border-cardBorder hover:border-teal-500/40 transition space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-textMuted font-mono">
                      Medicine #{index + 1}
                    </span>
                    <button
                      onClick={() => onDeleteMedicine(index)}
                      className="p-1 rounded-lg text-textSubtle hover:text-danger hover:bg-danger/10 transition cursor-pointer"
                      title="Delete medicine row"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    {/* Medicine Name (Span 6) */}
                    <div className="sm:col-span-6">
                      <label className="block text-[10px] uppercase font-bold text-textSubtle mb-1">
                        Medicine Name
                      </label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => onUpdateMedicine(index, 'name', e.target.value)}
                        placeholder="e.g. Paracetamol 650mg"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500 font-bold"
                      />
                    </div>

                    {/* Dosage (Span 3) */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] uppercase font-bold text-textSubtle mb-1">
                        Dosage
                      </label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => onUpdateMedicine(index, 'dosage', e.target.value)}
                        placeholder="e.g. 500 mg / 1 Tab"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Timing Toggle (AF vs BF) (Span 3) */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] uppercase font-bold text-textSubtle mb-1">
                        Timing (AF / BF)
                      </label>
                      <button
                        type="button"
                        onClick={() => onToggleTiming(index)}
                        className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                          isBF
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        }`}
                        title="Click to toggle After Food (AF) vs Before Food (BF)"
                      >
                        <span>{isBF ? 'BF (Before Food)' : 'AF (After Food)'}</span>
                      </button>
                    </div>

                    {/* Frequency (Span 4) */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] uppercase font-bold text-textSubtle mb-1">
                        Frequency
                      </label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => onUpdateMedicine(index, 'frequency', e.target.value)}
                        placeholder="e.g. 1-0-1"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500 font-mono font-bold"
                      />
                    </div>

                    {/* Duration (Span 4) */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] uppercase font-bold text-textSubtle mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => onUpdateMedicine(index, 'duration', e.target.value)}
                        placeholder="e.g. 5 Days"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Instructions (Span 4) */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] uppercase font-bold text-textSubtle mb-1">
                        Instructions / Notes
                      </label>
                      <input
                        type="text"
                        value={med.instructions || ''}
                        onChange={(e) => onUpdateMedicine(index, 'instructions', e.target.value)}
                        placeholder="e.g. After meals with water"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. General Advice & Notes */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-text uppercase tracking-wider">
          General Advice &amp; Patient Instructions
        </label>
        <textarea
          value={prescription.notes || ''}
          onChange={(e) => onUpdateField('notes', e.target.value)}
          placeholder="Enter doctor advice, precautions, diet recommendations, follow-up instructions..."
          rows={3}
          className="w-full p-3 rounded-xl bg-background border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500 leading-relaxed resize-none"
        />
      </div>
    </div>
  );
}
