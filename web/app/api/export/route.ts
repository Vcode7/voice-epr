import { NextRequest, NextResponse } from 'next/server';
import {
  dbTransactions,
  dbReceipts,
  dbTemplates,
  dbDataEntries,
} from '@/lib/db/models';
import { transactionsToCsv, receiptsToCsv } from '@/lib/utils/csvParser';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const transactions = await dbTransactions.getAll();
    const receipts = await dbReceipts.getAll();
    const templates = await dbTemplates.getAll();
    const dataEntries = await dbDataEntries.getAll();

    if (format === 'json') {
      const exportData = {
        version: 2,
        exportedAt: new Date().toISOString(),
        transactions,
        receipts,
        templates,
        dataEntries,
      };

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="voice_epr_backup_${Date.now()}.json"`,
        },
      });
    } else {
      // CSV Format
      const txCsv = transactionsToCsv(transactions);
      let fileContent = txCsv;

      if (receipts.length > 0) {
        const rcptCsv = receiptsToCsv(receipts);
        fileContent += '\n\n--- RECEIPTS ---\n' + rcptCsv;
      }

      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="voice_epr_backup_${Date.now()}.csv"`,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
