import { NextRequest, NextResponse } from 'next/server';
import { GroqServer } from '@/lib/groq/groqServer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;
    const customKey = req.headers.get('x-custom-groq-key');

    if (!file) {
      return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 });
    }

    const transcript = await GroqServer.transcribeAudio(file, 'audio.webm', customKey);
    return NextResponse.json({ text: transcript });
  } catch (error: any) {
    console.error('❌ [/api/groq/transcribe error]:', error);
    return NextResponse.json({ error: error.message || 'Audio transcription failed.' }, { status: 500 });
  }
}
