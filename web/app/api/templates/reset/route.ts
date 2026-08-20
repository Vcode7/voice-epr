import { NextResponse } from 'next/server';
import { dbTemplates } from '@/lib/db/models';

export async function POST() {
  try {
    const list = await dbTemplates.resetDefaults();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
