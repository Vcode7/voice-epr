import { NextRequest, NextResponse } from 'next/server';
import { dbSettings } from '@/lib/db/models';

export async function GET() {
  try {
    const settings = await dbSettings.get();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const updates = await req.json();
    const updated = await dbSettings.update(updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
