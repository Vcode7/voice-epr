import { NextRequest, NextResponse } from 'next/server';
import { dbReceipts } from '@/lib/db/models';

export async function GET() {
  try {
    const list = await dbReceipts.getAll();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const created = await dbReceipts.createMany(body);
      return NextResponse.json(created, { status: 201 });
    }

    const created = await dbReceipts.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
