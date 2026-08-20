import { NextRequest, NextResponse } from 'next/server';
import { GroqServer } from '@/lib/groq/groqServer';
import { DataTemplate } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { transcript, template } = await req.json();
    const customKey = req.headers.get('x-custom-groq-key');

    if (!transcript || !template) {
      return NextResponse.json({ error: 'Transcript and template schema are required.' }, { status: 400 });
    }

    const result = await GroqServer.extractCustomData(transcript, template as DataTemplate, customKey);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [/api/groq/custom-data error]:', error);
    return NextResponse.json({ error: error.message || 'Custom template extraction failed.' }, { status: 500 });
  }
}
