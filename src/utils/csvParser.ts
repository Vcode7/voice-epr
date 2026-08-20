import { Transaction, Receipt } from '../types';

/**
 * Escapes a single string field for CSV format (handling quotes, commas, and newlines).
 */
export function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses a CSV line respecting quoted values.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses full CSV content into headers and row objects.
 */
export function parseCsvText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  // Normalize line endings and split by lines (handling multiline quoted fields if any)
  const lines: string[] = [];
  let buffer = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      buffer += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') {
        i++; // skip \n in \r\n
      }
      if (buffer.trim().length > 0) {
        lines.push(buffer);
      }
      buffer = '';
    } else {
      buffer += char;
    }
  }
  if (buffer.trim().length > 0) {
    lines.push(buffer);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Converts transactions into CSV format matching required fields:
 * id, amount, currency, merchant, category, payment_method, transaction_type, description, date, transcript, createdAt
 */
export function transactionsToCsv(transactions: Transaction[]): string {
  const headers = [
    'id',
    'amount',
    'currency',
    'merchant',
    'category',
    'payment_method',
    'transaction_type',
    'description',
    'date',
    'transcript',
    'createdAt',
  ];

  const rows = transactions.map((t) => [
    escapeCsvField(t.id),
    escapeCsvField(t.amount),
    escapeCsvField(t.currency || 'INR'),
    escapeCsvField(t.merchant || ''),
    escapeCsvField(t.category || ''),
    escapeCsvField(t.paymentMethod || ''),
    escapeCsvField(t.transactionType || 'expense'),
    escapeCsvField(t.description || ''),
    escapeCsvField(t.date),
    escapeCsvField(t.transcript || ''),
    escapeCsvField(t.createdAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Converts receipts into CSV format.
 */
export function receiptsToCsv(receipts: Receipt[]): string {
  const headers = [
    'id',
    'receiptNumber',
    'date',
    'customerName',
    'customerPhone',
    'subtotal',
    'discount',
    'tax',
    'taxPercent',
    'taxType',
    'grandTotal',
    'currency',
    'itemsJson',
    'transcript',
    'createdAt',
  ];

  const rows = receipts.map((r) => [
    escapeCsvField(r.id),
    escapeCsvField(r.receiptNumber),
    escapeCsvField(r.date),
    escapeCsvField(r.customerName || ''),
    escapeCsvField(r.customerPhone || ''),
    escapeCsvField(r.subtotal),
    escapeCsvField(r.discount),
    escapeCsvField(r.tax),
    escapeCsvField(r.taxPercent),
    escapeCsvField(r.taxType),
    escapeCsvField(r.grandTotal),
    escapeCsvField(r.currency || 'INR'),
    escapeCsvField(JSON.stringify(r.items || [])),
    escapeCsvField(r.transcript || ''),
    escapeCsvField(r.createdAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
