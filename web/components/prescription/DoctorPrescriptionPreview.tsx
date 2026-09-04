'use client';

import React from 'react';
import {
  Stethoscope,
  Calendar,
  User,
  Phone,
  Mail,
  Building2,
  Clock,
  FileText,
  QrCode,
  ShieldCheck,
  Pill,
} from 'lucide-react';
import { DoctorPrescription } from '@/types';
import { formatDateDisplay } from '@/lib/utils/dateUtils';

interface DoctorPrescriptionPreviewProps {
  prescription: Partial<DoctorPrescription>;
}

export function DoctorPrescriptionPreview({ prescription }: DoctorPrescriptionPreviewProps) {
  const patientName = prescription.patientName || '—';
  const age = prescription.age || '';
  const phone = prescription.phone || '';
  const email = prescription.email || '';
  const date = prescription.date || '';
  const doctorName = prescription.doctorName || '';
  const doctorSpecialty = prescription.doctorSpecialty || '';
  const doctorRegNo = prescription.doctorRegNo || '';
  const clinicDetails = prescription.clinicDetails || 'Medical Prescription';
  const clinicAddress = prescription.clinicAddress || '';
  const clinicPhone = prescription.clinicPhone || '';
  const diagnosis = prescription.diagnosis || '';
  const notes = prescription.notes || '';
  const medicines = prescription.medicines || [];
  const prescriptionNumber = prescription.prescriptionNumber || 'RX';

  return (
    <div className="w-full bg-white text-neutral-900 rounded-2xl border-2 border-neutral-300 shadow-xl overflow-hidden font-sans printable-area select-text">
      {/* 1. CLINIC / HOSPITAL HEADER */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-cyan-900 text-white p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-md">
              <Stethoscope className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-tight">
                {clinicDetails}
              </h2>
              {clinicAddress && <p className="text-xs text-emerald-100/80 mt-0.5">{clinicAddress}</p>}
              {clinicPhone && (
                <div className="text-[11px] text-emerald-200 mt-1">
                  <span>Contact: {clinicPhone}</span>
                </div>
              )}
            </div>
          </div>

          {(doctorName || doctorSpecialty || doctorRegNo) && (
            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/15">
              {doctorName && (
                <div className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {doctorName}
                </div>
              )}
              {doctorSpecialty && (
                <div className="text-xs text-emerald-200 font-medium">{doctorSpecialty}</div>
              )}
              {doctorRegNo && (
                <div className="text-[10px] text-emerald-100/70 font-mono mt-0.5">
                  Reg. No: {doctorRegNo}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. PATIENT INFO BAR */}
      <div className="bg-neutral-50 border-b border-neutral-200 px-5 py-3 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Patient Name
            </span>
            <span className="font-bold text-neutral-900 text-sm truncate block mt-0.5">
              {patientName}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Age / Gender
            </span>
            <span className="font-semibold text-neutral-800 text-xs block mt-0.5">
              {age || '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Date &amp; Rx No.
            </span>
            <span className="font-semibold text-neutral-800 text-xs block mt-0.5">
              {date ? formatDateDisplay(date) : '—'} •{' '}
              <strong className="text-teal-700 font-mono">{prescriptionNumber}</strong>
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
              Contact &amp; Email
            </span>
            <div className="truncate text-neutral-700 text-xs mt-0.5">
              {phone ? <span>{phone}</span> : <span className="text-neutral-400">—</span>}
              {email && <span className="text-neutral-500 block text-[11px] truncate">{email}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 3. DIAGNOSIS (if present) */}
      {diagnosis && (
        <div className="px-5 py-2 sm:px-6 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider">
              Diagnosis
            </span>
            <span className="font-semibold text-teal-950">{diagnosis}</span>
          </div>
        </div>
      )}

      {/* 4. MEDICINES TABLE */}
      <div className="p-5 sm:p-6 space-y-4 min-h-[220px]">
        <div className="flex items-center justify-between pb-2 border-b-2 border-teal-800/20">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-serif font-black text-teal-900 tracking-wider">
              ℞
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Prescribed Medications
            </span>
          </div>
          <span className="text-xs font-medium text-neutral-500">
            {medicines.length} {medicines.length === 1 ? 'Medication' : 'Medications'}
          </span>
        </div>

        {medicines.length === 0 ? (
          <div className="py-10 text-center rounded-xl border border-dashed border-neutral-300 text-xs text-neutral-400">
            No medications prescribed.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-neutral-300 bg-neutral-100/80 text-[10px] font-black uppercase text-neutral-700 tracking-wider">
                  <th className="py-2 px-3 w-8 text-center">#</th>
                  <th className="py-2 px-3">Medicine Name</th>
                  <th className="py-2 px-3 w-28">Dosage</th>
                  <th className="py-2 px-3 w-32 text-center">Timing</th>
                  <th className="py-2 px-3 w-36">Frequency</th>
                  <th className="py-2 px-3 w-24 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {medicines.map((med, index) => {
                  const isBF = med.timing === 'BF' || String(med.timing).toUpperCase().includes('BF');
                  return (
                    <tr key={med.id || index}>
                      <td className="py-2.5 px-3 text-center font-bold text-neutral-400 text-xs">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-neutral-900 text-sm">{med.name}</div>
                        {med.instructions && (
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {med.instructions}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-700">
                        {med.dosage || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isBF
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {isBF ? 'BF (Before Food)' : 'AF (After Food)'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-800">
                        {med.frequency || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-800">
                        {med.duration || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. NOTES */}
        {notes && (
          <div className="mt-4 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-neutral-700 uppercase tracking-wide">
              <FileText className="w-3.5 h-3.5 text-teal-700" />
              <span>General Advice &amp; Instructions</span>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line pl-5">
              {notes}
            </p>
          </div>
        )}
      </div>

      {/* 6. FOOTER */}
      <div className="border-t-2 border-neutral-200 bg-neutral-50 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-6">
          <div className="flex items-center space-x-2.5 text-neutral-500 text-[10px]">
            <QrCode className="w-8 h-8 text-neutral-700 shrink-0" />
            <div>
              <div className="font-bold text-neutral-700">Voice EPR Prescription</div>
              <div>Electronically Generated Medical Record</div>
            </div>
          </div>

          <div className="text-right shrink-0 min-w-[160px]">
            <div className="h-8 border-b border-neutral-400 flex items-end justify-end pb-0.5">
              <span className="font-serif italic text-teal-900 text-xs opacity-70">
                {doctorName ? doctorName.replace(/^Dr\.\s*/i, '') : 'Doctor Sign'}
              </span>
            </div>
            <div className="text-xs font-bold text-neutral-800 mt-1">{doctorName || 'Doctor Signature'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
