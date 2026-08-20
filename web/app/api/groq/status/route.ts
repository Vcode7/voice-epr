import { NextResponse } from 'next/server';
import { GroqServer } from '@/lib/groq/groqServer';

export async function GET() {
  try {
    const status = await GroqServer.getKeyStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
