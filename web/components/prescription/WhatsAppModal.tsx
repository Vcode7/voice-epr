'use client';

import React, { useState } from 'react';
import { X, Phone, CheckCircle2, Copy, MessageCircle, ExternalLink } from 'lucide-react';
import { DoctorPrescription } from '@/types';
import { buildPrescriptionText, toWhatsAppNumber } from '@/lib/utils/prescriptionText';

interface WhatsAppModalProps {
  prescription: Partial<DoctorPrescription>;
  onClose: () => void;
}

export function WhatsAppModal({ prescription, onClose }: WhatsAppModalProps) {
  const [copied, setCopied] = useState(false);

  const phone = prescription.phone || '';
  const patientName = prescription.patientName || 'Patient';
  const message = buildPrescriptionText(prescription);
  const waNumber = toWhatsAppNumber(phone);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard can be blocked (insecure origin); the text is still selectable below.
    }
  };

  const handleOpen = () => {
    window.open(
      `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in no-print"
      onClick={onClose}
    >
      <div
        className="bg-card border border-cardBorder rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Send prescription on WhatsApp"
      >
        <div className="p-4 sm:p-5 border-b border-cardBorder flex items-center justify-between bg-surface/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-text">Send on WhatsApp</h3>
              <p className="text-[11px] text-textMuted">Opens a chat with the message filled in</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-textMuted hover:text-text hover:bg-surface transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="p-3 rounded-xl bg-surface border border-cardBorder space-y-2 text-xs">
            <div className="flex justify-between items-center text-textMuted text-[11px]">
              <span>Recipient</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Phone className="w-3 h-3" />+{waNumber}
              </span>
            </div>
            <div className="flex justify-between items-center text-textMuted text-[11px]">
              <span>Patient</span>
              <span className="font-bold text-text">{patientName}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase text-textSubtle">Message preview</span>
            <div className="p-3 rounded-xl bg-background border border-cardBorder text-[12px] text-text whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed select-text">
              {message}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-cardBorder bg-surface/50 flex items-center justify-between gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl border border-cardBorder text-text hover:bg-surface text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy text'}</span>
          </button>

          <button
            onClick={handleOpen}
            disabled={waNumber.length < 8}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
