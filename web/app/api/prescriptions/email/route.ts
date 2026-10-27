import { NextRequest, NextResponse } from 'next/server';
import { DoctorPrescription } from '@/types';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildEmailHtml(rx: DoctorPrescription): string {
  const rows = (rx.medicines || [])
    .map((m, i) => {
      const isBF = m.timing === 'BF';
      return `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px;font-weight:bold;color:#1e293b;">${i + 1}. ${esc(m.name)}${
            m.instructions ? `<div style="font-weight:normal;font-size:12px;color:#64748b;">${esc(m.instructions)}</div>` : ''
          }</td>
          <td style="padding:10px;color:#475569;">${esc(m.dosage) || '-'}</td>
          <td style="padding:10px;text-align:center;">
            <span style="background:${isBF ? '#fef3c7' : '#dcfce7'};color:${isBF ? '#b45309' : '#15803d'};font-weight:bold;padding:3px 8px;border-radius:4px;font-size:11px;">
              ${isBF ? 'Before Food' : 'After Food'}
            </span>
          </td>
          <td style="padding:10px;color:#475569;">${esc(m.frequency) || '-'}</td>
          <td style="padding:10px;color:#475569;">${esc(m.duration) || '-'}</td>
        </tr>`;
    })
    .join('');

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0f172a;">
      <div style="background:#0f766e;color:#fff;padding:18px 20px;border-radius:12px 12px 0 0;">
        <div style="font-size:18px;font-weight:bold;">${esc(rx.clinicDetails) || 'Medical Prescription'}</div>
        ${rx.doctorName ? `<div style="font-size:13px;opacity:.9;margin-top:4px;">${esc(rx.doctorName)}${rx.doctorSpecialty ? ` &middot; ${esc(rx.doctorSpecialty)}` : ''}</div>` : ''}
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:18px 20px;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 4px;"><strong>Patient:</strong> ${esc(rx.patientName)}${rx.age ? ` (${esc(rx.age)}${rx.gender ? `, ${esc(rx.gender)}` : ''})` : ''}</p>
        <p style="margin:0 0 4px;"><strong>Date:</strong> ${esc(rx.date)} &nbsp; <strong>Rx No:</strong> ${esc(rx.prescriptionNumber) || '-'}</p>
        ${rx.diagnosis ? `<p style="margin:0 0 12px;"><strong>Diagnosis:</strong> ${esc(rx.diagnosis)}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;font-size:11px;text-transform:uppercase;color:#475569;">
              <th style="padding:8px 10px;">Medicine</th><th style="padding:8px 10px;">Dosage</th>
              <th style="padding:8px 10px;text-align:center;">Timing</th><th style="padding:8px 10px;">Frequency</th><th style="padding:8px 10px;">Duration</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${rx.notes ? `<p style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;white-space:pre-line;"><strong>Advice:</strong> ${esc(rx.notes)}</p>` : ''}
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const { prescription, recipientEmail } = await req.json();
    const targetEmail = recipientEmail || prescription?.email;

    if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.includes('@')) {
      return NextResponse.json(
        { error: 'A valid patient email address is required to send prescription.' },
        { status: 400 }
      );
    }
    if (!prescription) {
      return NextResponse.json({ error: 'Prescription details are required.' }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      // Be honest: without a mail provider nothing can be delivered from the server.
      return NextResponse.json(
        {
          error:
            'Email delivery is not configured on the server (set RESEND_API_KEY and EMAIL_FROM).',
          notConfigured: true,
        },
        { status: 501 }
      );
    }

    const rx = prescription as DoctorPrescription;
    const from = process.env.EMAIL_FROM || 'Voice ERP <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [targetEmail],
        subject: `Prescription ${rx.prescriptionNumber || ''} - ${rx.patientName || 'Patient'}`.replace(/\s+-\s+$/, ''),
        html: buildEmailHtml(rx),
      }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.message || `Email provider rejected the request (HTTP ${res.status}).`);
    }

    return NextResponse.json({
      success: true,
      message: `Prescription sent to ${targetEmail}`,
      recipient: targetEmail,
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [/api/prescriptions/email error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send prescription email.' },
      { status: 500 }
    );
  }
}
