'use client';

import React, { useState } from 'react';
import { Search, Trash2, Mail, Phone, Pencil, Loader2 } from 'lucide-react';
import { DoctorPrescription } from '@/types';
import { formatDateDisplay } from '@/lib/utils/dateUtils';

interface PrescriptionHistoryProps {
  records: DoctorPrescription[];
  loading: boolean;
  activeId?: string;
  onOpen: (rx: DoctorPrescription) => void;
  onDelete: (rx: DoctorPrescription) => void;
}

export function PrescriptionHistory({ records, loading, activeId, onOpen, onDelete }: PrescriptionHistoryProps) {
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filtered = !q
    ? records
    : records.filter((r) =>
        [r.patientName, r.phone, r.prescriptionNumber, r.diagnosis]
          .some((v) => (v || '').toLowerCase().includes(q)) ||
        (r.medicines || []).some((m) => (m.name || '').toLowerCase().includes(q))
      );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-textSubtle absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient, phone, diagnosis, Rx no. or medicine…"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-card border border-cardBorder text-xs text-text focus:outline-none focus:border-teal-500"
        />
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-textMuted text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading saved prescriptions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-xs text-textMuted bg-card rounded-2xl border border-cardBorder">
          {records.length === 0
            ? 'No saved prescriptions yet. Fill one in and press Save.'
            : 'Nothing matches your search.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filtered.map((rx) => (
            <div
              key={rx.id}
              onClick={() => onOpen(rx)}
              className={`p-4 rounded-2xl bg-card border transition-all space-y-3 cursor-pointer group shadow-sm hover:shadow-lg ${
                rx.id === activeId ? 'border-teal-500/70' : 'border-cardBorder hover:border-teal-500/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-teal-500 font-bold text-xs">{rx.prescriptionNumber}</span>
                    <span className="text-sm font-bold text-text truncate">{rx.patientName || 'Anonymous'}</span>
                    {rx.age && <span className="text-[11px] text-textSubtle">({rx.age})</span>}
                  </div>
                  <div className="flex items-center gap-x-2 mt-1 flex-wrap text-[11px] text-textSubtle">
                    <span>{formatDateDisplay(rx.date)}</span>
                    {rx.phone && <span>· {rx.phone}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(rx);
                    }}
                    className="p-2 rounded-lg bg-surface hover:bg-surfaceMuted border border-cardBorder text-teal-500 transition cursor-pointer"
                    title="Open and edit"
                    aria-label="Open and edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(rx);
                    }}
                    className="p-2 rounded-lg bg-surface hover:bg-danger/15 hover:text-danger border border-cardBorder text-textSubtle transition cursor-pointer"
                    title="Delete"
                    aria-label="Delete prescription"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-textMuted">
                {rx.diagnosis && (
                  <div className="truncate">
                    <span className="font-semibold text-text">Diagnosis:</span> {rx.diagnosis}
                  </div>
                )}
                <div className="truncate">
                  <span className="font-semibold text-text">{rx.medicines?.length || 0} medicines:</span>{' '}
                  {(rx.medicines || []).map((m) => m.name).filter(Boolean).join(', ') || '—'}
                </div>
              </div>

              {(rx.email || rx.phone) && (
                <div className="flex items-center gap-2 pt-2 border-t border-cardBorder/60">
                  {rx.email && <Mail className="w-3 h-3 text-cyan-500" />}
                  {rx.phone && <Phone className="w-3 h-3 text-emerald-500" />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
