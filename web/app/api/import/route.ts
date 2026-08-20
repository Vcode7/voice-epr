import { NextRequest, NextResponse } from 'next/server';
import {
  dbTransactions,
  dbReceipts,
  dbTemplates,
  dbDataEntries,
} from '@/lib/db/models';
import { Transaction, Receipt, DataEntryRecord, ImportResult } from '@/types';
import { parseCsvText } from '@/lib/utils/csvParser';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No import file provided.' }, { status: 400 });
    }

    const content = await file.text();
    if (!content || content.trim() === '') {
      return NextResponse.json({ totalFound: 0, importedCount: 0, skippedCount: 0, errors: ['File is empty'] });
    }

    const existingTx = await dbTransactions.getAll();
    const existingTxIds = new Set(existingTx.map((t) => t.id));

    const existingRcpt = await dbReceipts.getAll();
    const existingRcptIds = new Set(existingRcpt.map((r) => r.id));

    const isJson = content.trim().startsWith('{') || content.trim().startsWith('[');

    if (isJson) {
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        return NextResponse.json({ totalFound: 0, importedCount: 0, skippedCount: 0, errors: ['Invalid JSON format'] }, { status: 400 });
      }

      let txArray: any[] = [];
      let rcptArray: any[] = [];
      let tmplArray: any[] = [];
      let entryArray: any[] = [];

      if (Array.isArray(parsed)) {
        txArray = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.transactions)) txArray = parsed.transactions;
        if (Array.isArray(parsed.receipts)) rcptArray = parsed.receipts;
        if (Array.isArray(parsed.templates)) tmplArray = parsed.templates;
        if (Array.isArray(parsed.dataEntries)) entryArray = parsed.dataEntries;
        if (!parsed.transactions && !parsed.receipts && parsed.amount !== undefined) {
          txArray = [parsed];
        }
      }

      const totalFound = txArray.length + rcptArray.length + tmplArray.length + entryArray.length;
      const validNewTx: Transaction[] = [];
      const validNewRcpts: Receipt[] = [];
      const validNewEntries: DataEntryRecord[] = [];
      let skippedCount = 0;

      for (const item of txArray) {
        if (!item || typeof item !== 'object') {
          skippedCount++;
          continue;
        }
        const amount = parseFloat(item.amount);
        if (isNaN(amount) || amount <= 0) {
          skippedCount++;
          continue;
        }
        const id = item.id ? String(item.id) : `tx_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (existingTxIds.has(id)) {
          skippedCount++;
          continue;
        }
        validNewTx.push({
          id,
          amount,
          currency: item.currency || 'INR',
          merchant: item.merchant || null,
          category: item.category || 'Other',
          paymentMethod: item.payment_method || item.paymentMethod || null,
          transactionType: item.transaction_type || item.transactionType || 'expense',
          description: item.description || null,
          transcript: item.transcript || null,
          date: item.date || new Date().toISOString().split('T')[0],
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
        });
        existingTxIds.add(id);
      }

      for (const item of rcptArray) {
        if (!item || typeof item !== 'object') {
          skippedCount++;
          continue;
        }
        const id = item.id ? String(item.id) : `rcpt_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (existingRcptIds.has(id)) {
          skippedCount++;
          continue;
        }
        validNewRcpts.push({
          id,
          receiptNumber: item.receiptNumber || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
          date: item.date || new Date().toISOString().split('T')[0],
          customerName: item.customerName || null,
          customerPhone: item.customerPhone || null,
          items: Array.isArray(item.items) ? item.items : [],
          subtotal: parseFloat(item.subtotal) || 0,
          discount: parseFloat(item.discount) || 0,
          tax: parseFloat(item.tax) || 0,
          taxPercent: parseFloat(item.taxPercent) || 0,
          taxType: item.taxType || 'none',
          cgst: parseFloat(item.cgst) || 0,
          sgst: parseFloat(item.sgst) || 0,
          igst: parseFloat(item.igst) || 0,
          grandTotal: parseFloat(item.grandTotal) || 0,
          currency: item.currency || 'INR',
          transcript: item.transcript || null,
          createdAt: item.createdAt || new Date().toISOString(),
        });
        existingRcptIds.add(id);
      }

      for (const tmpl of tmplArray) {
        if (tmpl && tmpl.id && tmpl.name) {
          await dbTemplates.save(tmpl);
        }
      }

      const existingEntries = await dbDataEntries.getAll();
      const existingEntryIds = new Set(existingEntries.map((e) => e.id));
      for (const item of entryArray) {
        if (!item || typeof item !== 'object' || !item.templateId) {
          skippedCount++;
          continue;
        }
        const id = item.id ? String(item.id) : `entry_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (existingEntryIds.has(id)) {
          skippedCount++;
          continue;
        }
        validNewEntries.push({
          id,
          templateId: item.templateId,
          templateName: item.templateName || 'Template Record',
          fieldValues: item.fieldValues || {},
          tableRows: Array.isArray(item.tableRows) ? item.tableRows : [],
          rawTranscript: item.rawTranscript || null,
          date: item.date || new Date().toISOString().split('T')[0],
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
        existingEntryIds.add(id);
      }

      if (validNewTx.length > 0) await dbTransactions.createMany(validNewTx);
      if (validNewRcpts.length > 0) await dbReceipts.createMany(validNewRcpts);
      if (validNewEntries.length > 0) await dbDataEntries.createMany(validNewEntries);

      const result: ImportResult = {
        totalFound,
        importedCount: validNewTx.length + validNewRcpts.length + validNewEntries.length,
        skippedCount,
      };

      return NextResponse.json(result);
    } else {
      // CSV Import
      const parts = content.split('--- RECEIPTS ---');
      const txContent = parts[0];
      const rcptContent = parts[1] || null;

      const { rows: txRows } = parseCsvText(txContent);
      let rcptRows: Record<string, string>[] = [];
      if (rcptContent) {
        rcptRows = parseCsvText(rcptContent).rows;
      }

      const totalFound = txRows.length + rcptRows.length;
      const validNewTx: Transaction[] = [];
      const validNewRcpts: Receipt[] = [];
      let skippedCount = 0;

      for (const row of txRows) {
        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          skippedCount++;
          continue;
        }
        const id = row.id && row.id !== '' ? row.id : `tx_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (existingTxIds.has(id)) {
          skippedCount++;
          continue;
        }
        validNewTx.push({
          id,
          amount,
          currency: row.currency || 'INR',
          merchant: row.merchant || null,
          category: row.category || 'Other',
          paymentMethod: row.payment_method || row.paymentmethod || null,
          transactionType: (row.transaction_type || row.transactiontype || 'expense') as Transaction['transactionType'],
          description: row.description || null,
          transcript: row.transcript || null,
          date: row.date || new Date().toISOString().split('T')[0],
          createdAt: row.createdat || row.created_at || new Date().toISOString(),
        });
        existingTxIds.add(id);
      }

      for (const row of rcptRows) {
        const id = row.id && row.id !== '' ? row.id : `rcpt_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (existingRcptIds.has(id)) {
          skippedCount++;
          continue;
        }
        let items: any[] = [];
        if (row.itemsjson) {
          try {
            items = JSON.parse(row.itemsjson);
          } catch {}
        }
        validNewRcpts.push({
          id,
          receiptNumber: row.receiptnumber || `INV-${Math.floor(100000 + Math.random() * 900000)}`,
          date: row.date || new Date().toISOString().split('T')[0],
          customerName: row.customername || null,
          customerPhone: row.customerphone || null,
          items,
          subtotal: parseFloat(row.subtotal) || 0,
          discount: parseFloat(row.discount) || 0,
          tax: parseFloat(row.tax) || 0,
          taxPercent: parseFloat(row.taxpercent) || 0,
          taxType: (row.taxtype as any) || 'none',
          cgst: 0,
          sgst: 0,
          igst: 0,
          grandTotal: parseFloat(row.grandtotal) || 0,
          currency: row.currency || 'INR',
          transcript: row.transcript || null,
          createdAt: row.createdat || new Date().toISOString(),
        });
        existingRcptIds.add(id);
      }

      if (validNewTx.length > 0) await dbTransactions.createMany(validNewTx);
      if (validNewRcpts.length > 0) await dbReceipts.createMany(validNewRcpts);

      const result: ImportResult = {
        totalFound,
        importedCount: validNewTx.length + validNewRcpts.length,
        skippedCount,
      };

      return NextResponse.json(result);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
