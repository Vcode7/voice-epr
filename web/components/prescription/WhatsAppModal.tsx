'use client';

import React, { useState } from 'react';
import {
  X,
  Send,
  Phone,
  CheckCircle2,
  Copy,
  Clock,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { DoctorPrescription } from '@/types';

interface WhatsAppModalProps {
  prescription: Partial<DoctorPrescription>;
  onClose: () => void;
}

export function WhatsAppModal({ prescription, onClose }: WhatsAppModalProps) {
  const [copied, setCopied] = useState(false);

  const phone = prescription.phone || 'No phone number';
  const patientName = prescription.patientName || 'Patient';

  // Build summary text
  const prescriptionText = `*Medical Prescription for ${patientName}*
Date: ${prescription.date || 'Today'}
Doctor: ${prescription.doctorName || 'Doctor'}
Clinic: ${prescription.clinicDetails || 'Clinic'}
${prescription.diagnosis ? `Diagnosis: ${prescription.diagnosis}\n` : ''}
*Prescribed Medicines:*
${(prescription.medicines || [])
  .map(
    (m, i) =>
      `${i + 1}. *${m.name}* (${m.dosage}) - ${m.timing === 'BF' ? 'Before Food (BF)' : 'After Food (AF)'} | ${m.frequency} | ${m.duration}`
  )
  .join('\n')}

${prescription.notes ? `*Instructions:* ${prescription.notes}` : ''}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(prescriptionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-card border border-cardBorder rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-cardBorder flex items-center justify-between bg-surface/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text">
                Send to WhatsApp
              </h3>
              <p className="text-[11px] text-textMuted">
                Instant delivery to patient phone number
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-textMuted hover:text-text hover:bg-surface transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Prescription is ready to be sent via WhatsApp.</span>
            </div>
            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed pl-6">
              WhatsApp Cloud API integration will be added soon. In the meantime, you can copy the formatted prescription text below to forward via your WhatsApp Web or phone.
            </p>
          </div>

          {/* Recipient Details */}
          <div className="p-3 rounded-xl bg-surface border border-cardBorder space-y-2 text-xs">
            <div className="flex justify-between items-center text-textMuted text-[11px]">
              <span>Recipient Phone:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {phone}
              </span>
            </div>
            <div className="flex justify-between items-center text-textMuted text-[11px]">
              <span>Patient Name:</span>
              <span className="font-bold text-text">{patientName}</span>
            </div>
          </div>

          {/* Prescription Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-textSubtle">
                Formatted WhatsApp Message Preview:
              </span>
              <button
                onClick={handleCopy}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 rounded-xl bg-background border border-cardBorder font-mono text-[11px] text-text whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {prescriptionText}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-cardBorder bg-surface/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-cardBorder text-textMuted hover:text-text hover:bg-surface text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Prescription'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
