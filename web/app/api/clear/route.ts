import { NextResponse } from 'next/server';
import {
  dbTransactions,
  dbReceipts,
  dbBudgets,
  dbDebts,
  dbDataEntries,
} from '@/lib/db/models';

export async function POST() {
  try {
    await dbTransactions.clear();
    await dbReceipts.clear();
    await dbBudgets.clear();
    await dbDebts.clear();
    await dbDataEntries.clear();
    return NextResponse.json({ success: true, message: 'All database data cleared successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
