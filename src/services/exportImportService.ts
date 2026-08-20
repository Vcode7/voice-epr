import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { transactionRepository, receiptRepository, templateRepository, dataEntryRepository } from '../repositories';
import { Transaction, Receipt, ImportResult, DataTemplate, DataEntryRecord } from '../types';
import { transactionsToCsv, receiptsToCsv, parseCsvText } from '../utils/csvParser';

export class ExportImportService {
  /**
   * Export all transaction, receipt, and custom data-entry history to a local file (JSON or CSV)
   * and open the native system share dialog.
   */
  public static async exportHistory(format: 'json' | 'csv'): Promise<{ uri: string; count: number }> {
    const transactions = await transactionRepository.getTransactions();
    const receipts = await receiptRepository.getReceipts();
    const templates = await templateRepository.getTemplates();
    const dataEntries = await dataEntryRepository.getDataEntries();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory;

    if (format === 'json') {
      const exportData = {
        version: 2,
        exportedAt: new Date().toISOString(),
        transactions: transactions.map((t) => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency || 'INR',
          merchant: t.merchant || null,
          category: t.category || null,
          payment_method: t.paymentMethod || null,
          transaction_type: t.transactionType || 'expense',
          description: t.description || null,
          date: t.date,
          transcript: t.transcript || null,
          createdAt: t.createdAt,
        })),
        receipts: receipts,
        templates: templates,
        dataEntries: dataEntries,
      };

      const jsonStr = JSON.stringify(exportData, null, 2);
      const fileUri = `${directory}voice_finance_backup_${timestamp}.json`;

      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Finance & Data History (JSON)',
          UTI: 'public.json',
        });
      }

      return { uri: fileUri, count: transactions.length + receipts.length + dataEntries.length };
    } else {
      // CSV Format
      const txCsv = transactionsToCsv(transactions);
      let fileContent = txCsv;

      if (receipts.length > 0) {
        const rcptCsv = receiptsToCsv(receipts);
        fileContent += '\n\n--- RECEIPTS ---\n' + rcptCsv;
      }

      const fileUri = `${directory}voice_finance_backup_${timestamp}.csv`;

      await FileSystem.writeAsStringAsync(fileUri, fileContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Finance History (CSV)',
          UTI: 'public.comma-separated-values-text',
        });
      }

      return { uri: fileUri, count: transactions.length + receipts.length };
    }
  }


  /**
   * Prompts user to pick a JSON or CSV file, validates records,
   * prevents duplicates by ID, saves valid records, and returns metrics.
   */
  public static async importHistory(): Promise<ImportResult | null> {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return null; // User cancelled
      }

      const fileAsset = pickerResult.assets[0];
      const fileUri = fileAsset.uri;
      const fileName = fileAsset.name?.toLowerCase() || '';

      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!content || content.trim() === '') {
        return { totalFound: 0, importedCount: 0, skippedCount: 0, errors: ['File is empty'] };
      }

      // Fetch existing records for duplicate ID check
      const existingTx = await transactionRepository.getTransactions();
      const existingTxIds = new Set(existingTx.map((t) => t.id));

      const existingRcpt = await receiptRepository.getReceipts();
      const existingRcptIds = new Set(existingRcpt.map((r) => r.id));

      const isJson = fileName.endsWith('.json') || content.trim().startsWith('{') || content.trim().startsWith('[');

      if (isJson) {
        return await this.parseAndImportJson(content, existingTxIds, existingRcptIds);
      } else {
        return await this.parseAndImportCsv(content, existingTxIds, existingRcptIds);
      }
    } catch (e: any) {
      console.error('❌ Import History Error:', e);
      return {
        totalFound: 0,
        importedCount: 0,
        skippedCount: 0,
        errors: [e.message || 'Failed to read or process import file'],
      };
    }
  }

  private static async parseAndImportJson(
    content: string,
    existingTxIds: Set<string>,
    existingRcptIds: Set<string>
  ): Promise<ImportResult> {
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return {
        totalFound: 0,
        importedCount: 0,
        skippedCount: 0,
        errors: ['Invalid JSON file format.'],
      };
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

    // Validate and process transactions
    for (const item of txArray) {
      if (!item || typeof item !== 'object') {
        skippedCount++;
        continue;
      }

      const amount = parseFloat(item.amount);
      if (isNaN(amount) || amount <= 0) {
        skippedCount++;
        continue; // Invalid amount
      }

      const id = item.id ? String(item.id) : `tx_imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      if (existingTxIds.has(id)) {
        skippedCount++; // Duplicate ID
        continue;
      }

      const dateStr = item.date || new Date().toISOString().split('T')[0];
      const createdAtStr = item.createdAt || item.created_at || new Date().toISOString();
      const rawType = item.transaction_type || item.transactionType;
      const validTypes = ['expense', 'income', 'transfer'];
      const transactionType = validTypes.includes(rawType) ? rawType : 'expense';

      validNewTx.push({
        id,
        amount,
        currency: item.currency || 'INR',
        merchant: item.merchant || null,
        category: item.category || 'Other',
        paymentMethod: item.payment_method || item.paymentMethod || null,
        transactionType,
        description: item.description || null,
        transcript: item.transcript || null,
        date: dateStr,
        createdAt: createdAtStr,
      });

      existingTxIds.add(id); // track to avoid duplicates within file
    }

    // Validate and process receipts
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

      const receiptNumber = item.receiptNumber || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
      const items = Array.isArray(item.items) ? item.items : [];

      validNewRcpts.push({
        id,
        receiptNumber,
        date: item.date || new Date().toISOString().split('T')[0],
        customerName: item.customerName || null,
        customerPhone: item.customerPhone || null,
        items,
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

    // Validate and process custom templates
    for (const tmpl of tmplArray) {
      if (tmpl && tmpl.id && tmpl.name) {
        await templateRepository.saveTemplate(tmpl);
      }
    }

    // Validate and process data entries
    const existingEntries = await dataEntryRepository.getDataEntries();
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

    // Save to repositories
    if (validNewTx.length > 0) {
      await transactionRepository.saveMultipleTransactions(validNewTx);
    }
    if (validNewRcpts.length > 0) {
      await receiptRepository.saveMultipleReceipts(validNewRcpts);
    }
    if (validNewEntries.length > 0) {
      await dataEntryRepository.saveMultipleDataEntries(validNewEntries);
    }

    const importedCount = validNewTx.length + validNewRcpts.length + validNewEntries.length;

    return {
      totalFound,
      importedCount,
      skippedCount,
    };
  }


  private static async parseAndImportCsv(
    content: string,
    existingTxIds: Set<string>,
    existingRcptIds: Set<string>
  ): Promise<ImportResult> {
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

      const dateStr = row.date || new Date().toISOString().split('T')[0];
      const createdAtStr = row.createdat || row.created_at || new Date().toISOString();
      const rawType = (row.transaction_type || row.transactiontype || 'expense').toLowerCase();
      const validTypes = ['expense', 'income', 'transfer'];
      const transactionType = (validTypes.includes(rawType) ? rawType : 'expense') as Transaction['transactionType'];

      validNewTx.push({
        id,
        amount,
        currency: row.currency || 'INR',
        merchant: row.merchant || null,
        category: row.category || 'Other',
        paymentMethod: row.payment_method || row.paymentmethod || null,
        transactionType,
        description: row.description || null,
        transcript: row.transcript || null,
        date: dateStr,
        createdAt: createdAtStr,
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

    if (validNewTx.length > 0) {
      await transactionRepository.saveMultipleTransactions(validNewTx);
    }
    if (validNewRcpts.length > 0) {
      await receiptRepository.saveMultipleReceipts(validNewRcpts);
    }

    return {
      totalFound,
      importedCount: validNewTx.length + validNewRcpts.length,
      skippedCount,
    };
  }
}
