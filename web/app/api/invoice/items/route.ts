import { NextRequest, NextResponse } from 'next/server';
import { dbItems } from '@/lib/db/models';

export async function GET() {
  try {
    const items = await dbItems.getAll();
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch items.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.hsnCode || body.rate === undefined) {
      return NextResponse.json(
        { error: 'Item Name, HSN Code, and Rate are required.' },
        { status: 400 }
      );
    }
    const created = await dbItems.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create item.' }, { status: 500 });
  }
}
