import { NextRequest, NextResponse } from 'next/server';
import { dbDebts } from '@/lib/db/models';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updated = await dbDebts.toggleSettled(id);
    if (!updated) {
      return NextResponse.json({ error: 'Debt not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
