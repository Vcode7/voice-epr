import { NextRequest, NextResponse } from 'next/server';
import { dbTransactions } from '@/lib/db/models';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.toLowerCase();

    let list = await dbTransactions.getAll();

    if (category && category !== 'All') {
      list = list.filter((t) => (t.category || '').toLowerCase() === category.toLowerCase());
    }

    if (type && type !== 'All') {
      list = list.filter((t) => t.transactionType === type.toLowerCase());
    }

    if (search) {
      list = list.filter(
        (t) =>
          (t.merchant || '').toLowerCase().includes(search) ||
          (t.category || '').toLowerCase().includes(search) ||
          (t.description || '').toLowerCase().includes(search) ||
          (t.transcript || '').toLowerCase().includes(search)
      );
    }

    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const created = await dbTransactions.createMany(body);
      return NextResponse.json(created, { status: 201 });
    }

    if (body.transactions && Array.isArray(body.transactions)) {
      const created = await dbTransactions.createMany(body.transactions);
      return NextResponse.json(created, { status: 201 });
    }

    const created = await dbTransactions.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
