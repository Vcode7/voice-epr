import { NextResponse } from 'next/server';
import { dbReceipts } from '@/lib/db/models';

export async function GET() {
  try {
    const nextNumber = await dbReceipts.getNextReceiptNumber();
    return NextResponse.json({ nextReceiptNumber: nextNumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
