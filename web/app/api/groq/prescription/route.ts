import { NextRequest, NextResponse } from 'next/server';
import { GroqServer } from '@/lib/groq/groqServer';

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    const customKey = req.headers.get('x-custom-groq-key');

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Prescription text or transcript is required.' },
        { status: 400 }
      );
    }

    const result = await GroqServer.extractDoctorPrescription(transcript, customKey);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [/api/groq/prescription error]:', error);
    return NextResponse.json(
      { error: error.message || 'Prescription extraction failed.' },
      { status: 500 }
    );
  }
}
