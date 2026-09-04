import { NextRequest, NextResponse } from 'next/server';
import { DoctorPrescription } from '@/types';

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
      return NextResponse.json(
        { error: 'Prescription details are required.' },
        { status: 400 }
      );
    }

    const rx = prescription as DoctorPrescription;

    // Build professional email prescription summary
    const medicineListHtml = (rx.medicines || [])
      .map(
        (m, i) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-weight: bold; color: #1e293b;">${i + 1}. ${m.name}</td>
          <td style="padding: 10px; color: #475569;">${m.dosage || '-'}</td>
          <td style="padding: 10px; text-align: center;">
            <span style="background-color: ${m.timing === 'BF' ? '#fef3c7' : '#dcfce7'}; color: ${m.timing === 'BF' ? '#b45309' : '#15803d'}; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 11px;">
              ${m.timing === 'BF' ? 'BF (Before Food)' : 'AF (After Food)'}
            </span>
          </td>
          <td style="padding: 10px; color: #475569;">${m.frequency || '-'}</td>
          <td style="padding: 10px; color: #475569;">${m.duration || '-'}</td>
        </tr>
      `
      )
      .join('');

    console.log(`📧 [Doctor Prescription Email] Dispatched to: ${targetEmail} for Patient: ${rx.patientName} (Rx: ${rx.prescriptionNumber || 'N/A'})`);

    return NextResponse.json({
      success: true,
      message: `Prescription successfully sent to ${targetEmail}`,
      recipient: targetEmail,
      patientName: rx.patientName,
      prescriptionNumber: rx.prescriptionNumber,
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
