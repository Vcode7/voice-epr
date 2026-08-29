import { NextRequest, NextResponse } from 'next/server';
import { GroqServer } from '@/lib/groq/groqServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, template, currentValues, isFlexible, flexibleFields, customApiKey } = body;

    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return NextResponse.json(
        { error: 'Transcript text is required for voice editing.' },
        { status: 400 }
      );
    }

    const result = await GroqServer.editEntryByVoice(
      transcript,
      template,
      currentValues || {},
      {
        isFlexible,
        flexibleFields,
        customApiKey,
      }
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/groq/voice-edit:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process voice edit request.' },
      { status: 500 }
    );
  }
}
