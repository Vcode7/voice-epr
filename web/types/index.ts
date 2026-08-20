export type FinancialIntent =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'lend'
  | 'borrow'
  | 'repayment'
  | 'query'
  | 'budget'
  | 'reminder'
  | 'correction'
  | 'unknown'
  | 'create_receipt';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
  id: string;
  userId?: string;
  amount: number;
  currency: string;
  merchant?: string | null;
  category?: string | null;
  paymentMethod?: string | null;
  transactionType: TransactionType;
  description?: string | null;
  transcript?: string | null;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO String
}

export interface ExtractedIntentItem {
  intent: FinancialIntent;
  amount?: number | null;
  currency?: string | null;
  merchant?: string | null;
  category?: string | null;
  payment_method?: string | null;
  transaction_type?: TransactionType | null;
  description?: string | null;
  date?: string | null;
  person_name?: string | null;
  target_category?: string | null;
}

export interface ExtractedIntentResult {
  intent: FinancialIntent;
  amount?: number | null;
  currency?: string | null;
  merchant?: string | null;
  category?: string | null;
  payment_method?: string | null;
  transaction_type?: TransactionType | null;
  description?: string | null;
  date?: string | null;
  person_name?: string | null;
  target_category?: string | null;
  raw_transcript?: string;
  transactions?: ExtractedIntentItem[];
  entries?: ExtractedIntentItem[];
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface ExtractedReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export type TaxType = 'gst' | 'igst' | 'none';

export interface ExtractedReceiptResult {
  intent: 'create_receipt';
  items: ExtractedReceiptItem[];
  customer_name?: string | null;
  customer_phone?: string | null;
  discount?: number | null;
  tax?: number | null;
  tax_percent?: number | null;
  tax_type?: TaxType | null;
  currency?: string | null;
  raw_transcript?: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  date: string; // YYYY-MM-DD
  customerName?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  taxPercent: number;
  taxType: TaxType;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  currency: string;
  transcript?: string | null;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  createdAt: string;
}

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  type: 'given' | 'borrowed';
  settled: boolean;
  notes?: string | null;
  date: string;
  updatedAt: string;
}

export interface RecurringPayment {
  id: string;
  title: string;
  amount: number;
  currency: string;
  frequency: 'monthly' | 'weekly' | 'yearly';
  nextDueDate: string;
  category: string;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  gstin: string;
  receiptPrefix: string;
  customGroqApiKey?: string;
}

export interface FinancialQueryResult {
  queryType: 'category_total' | 'biggest_expense' | 'payment_method_total' | 'income_vs_expense' | 'count' | 'general';
  category?: string | null;
  paymentMethod?: string | null;
  period?: 'this_month' | 'last_month' | 'all_time' | null;
  answerText?: string;
  calculatedValue?: number;
}

export type RecordingState =
  | 'Ready'
  | 'Recording'
  | 'Processing'
  | 'Transcribing'
  | 'Understanding'
  | 'Complete'
  | 'Error';

export interface ImportResult {
  totalFound: number;
  importedCount: number;
  skippedCount: number;
  errors?: string[];
}

export type FieldType = 'text' | 'number' | 'date' | 'time' | 'select' | 'boolean';

export interface TemplateField {
  id: string;
  name: string;
  extractionKey: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  placeholder?: string;
}

export interface DataTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  fields: TemplateField[];
  hasTable: boolean;
  tableTitle?: string;
  tableFields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

export interface FlexibleField {
  id?: string;
  name: string;
  value: string | number;
}

export interface FlexibleTable {
  title?: string;
  headers: string[];
  rows: Array<string[]>;
}

export interface DataEntryRecord {
  id: string;
  templateId: string;
  templateName: string;
  isFlexible?: boolean;
  title?: string;
  fieldValues: Record<string, any>;
  flexibleFields?: FlexibleField[];
  tableTitle?: string;
  tableHeaders?: string[];
  tableRows: Array<Record<string, any>> | Array<any[]>;
  rawTranscript?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedDataResult {
  templateId: string;
  templateName: string;
  isFlexible?: boolean;
  title?: string;
  fieldValues: Record<string, any>;
  flexibleFields?: FlexibleField[];
  tableTitle?: string;
  tableHeaders?: string[];
  tableRows: Array<Record<string, any>> | Array<any[]>;
  raw_transcript?: string;
}

export interface FlexibleExtractedResult {
  isFlexible: true;
  title?: string;
  fields: FlexibleField[];
  table?: FlexibleTable | null;
  raw_transcript?: string;
}
