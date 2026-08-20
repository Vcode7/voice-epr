import { NextRequest, NextResponse } from 'next/server';
import { GroqServer } from '@/lib/groq/groqServer';

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();
    const customKey = req.headers.get('x-custom-groq-key');

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript string is required.' }, { status: 400 });
    }

    const result = await GroqServer.extractVoiceReceipt(transcript, customKey);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [/api/groq/receipt error]:', error);
    return NextResponse.json({ error: error.message || 'Receipt extraction failed.' }, { status: 500 });
  }
}
