import { DoctorPrescription } from '@/types';
import { formatDateDisplay } from '@/lib/utils/dateUtils';
import { CLINIC } from '@/lib/clinic';

/** Plain-text prescription, formatted for WhatsApp (*bold*) and as a mailto body. */
export function buildPrescriptionText(rx: Partial<DoctorPrescription>): string {
  const lines: string[] = [];
  const who = [rx.age, rx.gender].filter(Boolean).join(', ');

  lines.push(`*${CLINIC.name}*`);
  lines.push(`${CLINIC.doctorName}, ${CLINIC.qualifications} (Regd. No. ${CLINIC.registrationNo})`);
  lines.push(CLINIC.address);
  lines.push('');
  lines.push(`*Prescription${rx.prescriptionNumber ? ` ${rx.prescriptionNumber}` : ''}*`);
  lines.push('');
  lines.push(`Patient: ${rx.patientName || '-'}${who ? ` (${who})` : ''}`);
  if (rx.date) lines.push(`Date: ${formatDateDisplay(rx.date)}`);
  if (rx.diagnosis) lines.push(`Diagnosis: ${rx.diagnosis}`);

  const meds = rx.medicines || [];
  if (meds.length > 0) {
    lines.push('');
    lines.push('*Medicines:*');
    meds.forEach((m, i) => {
      const parts = [
        m.dosage,
        m.timing === 'BF' ? 'before food' : 'after food',
        m.frequency,
        m.duration,
      ].filter(Boolean);
      lines.push(`${i + 1}. *${m.name || 'Medicine'}* - ${parts.join(' | ')}`);
      if (m.instructions) lines.push(`   ${m.instructions}`);
    });
  }

  if (rx.notes) {
    lines.push('');
    lines.push(`*Advice:* ${rx.notes}`);
  }
  return lines.join('\n');
}

/** Digits only; a bare 10-digit number is assumed to be Indian (+91). */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}
