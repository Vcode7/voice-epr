import { NextRequest, NextResponse } from 'next/server';
import { GroqServer } from '@/lib/groq/groqServer';
import { dbCompanies, dbCustomers, dbSuppliers, dbItems } from '@/lib/db/models';
import { VoucherType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { transcript, voucherType = 'sales' } = await req.json();
    const customKey = req.headers.get('x-custom-groq-key');

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Transcript string is required.' },
        { status: 400 }
      );
    }

    const [companies, customers, suppliers, items] = await Promise.all([
      dbCompanies.getAll(),
      dbCustomers.getAll(),
      dbSuppliers.getAll(),
      dbItems.getAll(),
    ]);

    const result = await GroqServer.extractVoiceVoucher(
      transcript,
      voucherType as VoucherType,
      { companies, customers, suppliers, items },
      customKey
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [/api/groq/voice-voucher error]:', error);
    return NextResponse.json(
      { error: error.message || 'Voice voucher extraction failed.' },
      { status: 500 }
    );
  }
}
