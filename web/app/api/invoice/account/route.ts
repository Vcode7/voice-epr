import { NextRequest, NextResponse } from 'next/server';
import { dbLedger } from '@/lib/db/models';
import { VoucherType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const voucherType = searchParams.get('voucherType') as VoucherType | 'all' | null;
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const data = await dbLedger.getTransactions({
      companyId,
      customerId,
      supplierId,
      voucherType: voucherType || 'all',
      fromDate,
      toDate,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch ledger account.' }, { status: 500 });
  }
}
