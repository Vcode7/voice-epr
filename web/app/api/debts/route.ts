import { NextRequest, NextResponse } from 'next/server';
import { dbDebts } from '@/lib/db/models';

export async function GET() {
  try {
    const list = await dbDebts.getAll();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { personName, amount, type, notes, date, action } = await req.json();

    if (action === 'repayment') {
      const updated = await dbDebts.recordRepayment(personName, parseFloat(amount));
      return NextResponse.json(updated, { status: 200 });
    }

    if (!personName || amount === undefined || !type) {
      return NextResponse.json({ error: 'personName, amount, and type (given|borrowed) are required' }, { status: 400 });
    }

    const created = await dbDebts.recordDebt(personName, parseFloat(amount), type, notes, date);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
