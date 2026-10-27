'use client';

import React from 'react';
import {
  Save,
  Printer,
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  User,
  Building2,
  Pill,
  FilePlus2,
  Loader2,
} from 'lucide-react';
import { DoctorPrescription, PrescriptionMedicine } from '@/types';

interface PrescriptionActiveViewProps {
  prescription: Partial<DoctorPrescription>;
  isSaving: boolean;
  isSendingEmail: boolean;
  onUpdateField: (key: keyof DoctorPrescription, value: string) => void;
  onUpdateMedicine: (index: number, key: keyof PrescriptionMedicine, value: string) => void;
  onAddMedicine: () => void;
  onDeleteMedicine: (index: number) => void;
  onSave: () => void;
  onPrint: () => void;
  onSendEmail: () => void;
  onSendWhatsApp: () => void;
  onNew: () => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-background border border-cardBorder text-xs text-text placeholder:text-textSubtle focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/40 transition';

function Field({
  label,
  required,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-[11px] font-semibold text-textMuted mb-1">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ icon: Icon, title, right }: { icon: React.ElementType; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pb-2 border-b border-cardBorder/60">
      <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-teal-500" />
        {title}
      </h3>
      {right}
    </div>
  );
}

export function PrescriptionActiveView({
  prescription,
  isSaving,
  isSendingEmail,
  onUpdateField,
  onUpdateMedicine,
  onAddMedicine,
  onDeleteMedicine,
  onSave,
  onPrint,
  onSendEmail,
  onSendWhatsApp,
  onNew,
}: PrescriptionActiveViewProps) {
  const medicines = prescription.medicines || [];
  const text = (key: keyof DoctorPrescription) => String(prescription[key] ?? '');
  const bind = (key: keyof DoctorPrescription) => ({
    value: text(key),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onUpdateField(key, e.target.value),
  });

  const hasEmail = /\S+@\S+\.\S+/.test(prescription.email || '');
  const hasPhone = (prescription.phone || '').replace(/\D/g, '').length >= 7;

  const secondaryBtn =
    'px-3 py-2 rounded-xl bg-surface hover:bg-surfaceMuted border border-cardBorder text-text text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';

  return (
    <div className="bg-card border border-cardBorder rounded-2xl shadow-xl overflow-hidden">
      {/* Header + actions */}
      <div className="p-4 sm:p-5 border-b border-cardBorder bg-surface/40 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-text flex items-center gap-2 flex-wrap">
              {prescription.prescriptionNumber ? (
                <>
                  <span className="font-mono text-teal-500">{prescription.prescriptionNumber}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    SAVED
                  </span>
                </>
              ) : (
                <>
                  <span>New prescription</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    NOT SAVED
                  </span>
                </>
              )}
            </h2>
            <p className="text-xs text-textMuted mt-0.5">
              Everything below is editable — check what the AI filled in before saving.
            </p>
          </div>
          <button onClick={onNew} className={`${secondaryBtn} shrink-0`} title="Start a blank prescription">
            <FilePlus2 className="w-3.5 h-3.5 text-teal-500" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60 active:scale-95"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaving ? 'Saving…' : prescription.id ? 'Update' : 'Save'}</span>
          </button>
          <button onClick={onPrint} className={secondaryBtn} title="Print, or choose “Save as PDF” in the print dialog">
            <Printer className="w-3.5 h-3.5 text-teal-500" />
            <span>Print / PDF</span>
          </button>
          <button
            onClick={onSendEmail}
            disabled={!hasEmail || isSendingEmail}
            className={secondaryBtn}
            title={hasEmail ? `Email to ${prescription.email}` : 'Enter a patient email first'}
          >
            {isSendingEmail ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Mail className="w-3.5 h-3.5 text-cyan-500" />
            )}
            <span>Email</span>
          </button>
          <button
            onClick={onSendWhatsApp}
            disabled={!hasPhone}
            className={secondaryBtn}
            title={hasPhone ? `WhatsApp ${prescription.phone}` : 'Enter a patient phone number first'}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-6">
        {/* Patient */}
        <section className="space-y-3">
          <SectionTitle icon={User} title="Patient" />
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <Field label="Patient name" required className="col-span-2 sm:col-span-3">
              <input type="text" {...bind('patientName')} placeholder="e.g. Ananya Sharma" className={inputClass} />
            </Field>
            <Field label="Age" className="sm:col-span-1">
              <input type="text" {...bind('age')} placeholder="34 Yrs" className={inputClass} />
            </Field>
            <Field label="Gender" className="sm:col-span-2">
              <select {...bind('gender')} className={inputClass}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Phone" className="col-span-2 sm:col-span-2">
              <input type="tel" {...bind('phone')} placeholder="+91 98765 43210" className={inputClass} />
            </Field>
            <Field label="Email" className="col-span-2 sm:col-span-2">
              <input type="email" {...bind('email')} placeholder="patient@example.com" className={inputClass} />
            </Field>
            <Field label="Date (DD-MM-YYYY)" className="col-span-2 sm:col-span-2">
              <input type="text" {...bind('date')} placeholder="DD-MM-YYYY" className={inputClass} />
            </Field>
            <Field label="Diagnosis / chief complaint" className="col-span-2 sm:col-span-6">
              <input type="text" {...bind('diagnosis')} placeholder="e.g. Acute upper respiratory tract infection" className={inputClass} />
            </Field>
          </div>
        </section>

        {/* Doctor & clinic */}
        <section className="space-y-3">
          <SectionTitle icon={Building2} title="Doctor & clinic" />
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <Field label="Doctor name" className="col-span-2 sm:col-span-2">
              <input type="text" {...bind('doctorName')} placeholder="Dr. Sarah Jenkins, MD" className={inputClass} />
            </Field>
            <Field label="Specialty" className="col-span-2 sm:col-span-2">
              <input type="text" {...bind('doctorSpecialty')} placeholder="General Physician" className={inputClass} />
            </Field>
            <Field label="Registration no." className="col-span-2 sm:col-span-2">
              <input type="text" {...bind('doctorRegNo')} placeholder="e.g. MMC 12345" className={inputClass} />
            </Field>
            <Field label="Clinic / hospital" className="col-span-2 sm:col-span-3">
              <input type="text" {...bind('clinicDetails')} placeholder="City Care Health Clinic" className={inputClass} />
            </Field>
            <Field label="Clinic address" className="col-span-2 sm:col-span-2">
              <input type="text" {...bind('clinicAddress')} placeholder="45 Medical Enclave" className={inputClass} />
            </Field>
            <Field label="Clinic phone" className="col-span-2 sm:col-span-1">
              <input type="tel" {...bind('clinicPhone')} placeholder="Phone" className={inputClass} />
            </Field>
          </div>
        </section>

        {/* Medicines */}
        <section className="space-y-3">
          <SectionTitle
            icon={Pill}
            title={`Medicines (${medicines.length})`}
            right={
              <button
                onClick={onAddMedicine}
                className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            }
          />

          {medicines.length === 0 ? (
            <div className="py-8 text-center rounded-xl bg-background/50 border border-dashed border-cardBorder text-xs text-textMuted space-y-1">
              <p>No medicines yet.</p>
              <p className="text-[11px] text-textSubtle">
                Dictate them on the left, or press &quot;Add&quot; to type one in.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {medicines.map((med, index) => {
                const isBF = med.timing === 'BF';
                return (
                  <div
                    key={med.id || index}
                    className="p-3.5 rounded-xl bg-background border border-cardBorder hover:border-teal-500/40 transition space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => onUpdateMedicine(index, 'name', e.target.value)}
                        placeholder="Medicine name, e.g. Paracetamol 650mg"
                        aria-label={`Medicine ${index + 1} name`}
                        className={`${inputClass} font-bold`}
                      />
                      <button
                        onClick={() => onDeleteMedicine(index)}
                        className="p-2 rounded-lg text-textSubtle hover:text-danger hover:bg-danger/10 transition cursor-pointer shrink-0"
                        title="Remove medicine"
                        aria-label={`Remove medicine ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <Field label="Dosage">
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => onUpdateMedicine(index, 'dosage', e.target.value)}
                          placeholder="1 tablet"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Frequency">
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => onUpdateMedicine(index, 'frequency', e.target.value)}
                          placeholder="1-0-1"
                          className={`${inputClass} font-mono`}
                        />
                      </Field>
                      <Field label="Duration">
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => onUpdateMedicine(index, 'duration', e.target.value)}
                          placeholder="5 days"
                          className={inputClass}
                        />
                      </Field>
                      <div>
                        <span className="block text-[11px] font-semibold text-textMuted mb-1">Timing</span>
                        <div className="grid grid-cols-2 rounded-xl border border-cardBorder overflow-hidden text-[11px] font-bold">
                          {(['BF', 'AF'] as const).map((t) => {
                            const selected = t === 'BF' ? isBF : !isBF;
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => onUpdateMedicine(index, 'timing', t)}
                                aria-pressed={selected}
                                title={t === 'BF' ? 'Before food' : 'After food'}
                                className={`py-2 transition cursor-pointer ${
                                  selected
                                    ? t === 'BF'
                                      ? 'bg-amber-500/25 text-amber-700 dark:text-amber-300'
                                      : 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-surface text-textSubtle hover:text-text'
                                }`}
                              >
                                {t === 'BF' ? 'Before' : 'After'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <Field label="Instructions" className="col-span-2 sm:col-span-4">
                        <input
                          type="text"
                          value={med.instructions || ''}
                          onChange={(e) => onUpdateMedicine(index, 'instructions', e.target.value)}
                          placeholder="e.g. with warm water"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Advice */}
        <section className="space-y-2">
          <Field label="General advice & follow-up">
            <textarea
              {...bind('notes')}
              rows={3}
              placeholder="Rest, fluids, diet, follow-up date…"
              className={`${inputClass} leading-relaxed resize-none`}
            />
          </Field>
        </section>
      </div>
    </div>
  );
}
