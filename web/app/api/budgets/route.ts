import { NextRequest, NextResponse } from 'next/server';
import { dbBudgets } from '@/lib/db/models';

export async function GET() {
  try {
    const list = await dbBudgets.getAll();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { category, amount, period } = await req.json();
    if (!category || amount === undefined) {
      return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 });
    }
    const budget = await dbBudgets.setBudget(category, parseFloat(amount), period || 'monthly');
    return NextResponse.json(budget, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
