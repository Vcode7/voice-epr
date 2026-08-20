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
  hsnCode?: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
}

export interface ExtractedReceiptItem {
  name: string;
  hsn_code?: string | null;
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
  customer_address?: string | null;
  customer_gstin?: string | null;
  discount?: number | null;
  tax?: number | null;        // kept for backward compat (flat ₹ amount, deprecated)
  tax_percent?: number | null; // e.g. 18 (means 18%)
  tax_type?: TaxType | null;  // 'gst' = CGST+SGST split, 'igst' = IGST only
  currency?: string | null;
  raw_transcript?: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  date: string; // YYYY-MM-DD
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;        // computed flat ₹ tax amount
  taxPercent: number; // e.g. 18
  taxType: TaxType;   // 'gst', 'igst', or 'none'
  cgst: number;       // CGST ₹ (half of tax if taxType='gst')
  sgst: number;       // SGST ₹ (half of tax if taxType='gst')
  igst: number;       // IGST ₹ (full tax if taxType='igst')
  grandTotal: number;
  currency: string;
  notes?: string | null;
  format?: 'standard' | 'basic_tax';
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
  type: 'given' | 'borrowed'; // 'given' = owed to user, 'borrowed' = user owes
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

export type InvoiceFormatType = 'standard' | 'basic_tax';

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
}

export interface UserSettings {
  currency: string;
  currencySymbol: string;
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  gstin: string;
  receiptPrefix: string;
  invoiceFormat?: InvoiceFormatType;
  bankDetails?: BankDetails;
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
  name: string;             // User-facing label (e.g., "Part No", "Shift")
  extractionKey: string;    // Key for AI entity extraction (e.g., "part_no", "shift")
  type: FieldType;          // Data type
  required?: boolean;
  options?: string[];       // Options list if type is 'select'
  defaultValue?: string;
  placeholder?: string;
}

export interface DataTemplate {
  id: string;
  name: string;             // Template title (e.g., "Monitoring Details")
  description?: string;     // Short description
  isDefault?: boolean;      // True if it's the built-in system template
  fields: TemplateField[];  // Single-value fields
  hasTable: boolean;        // True if includes repeated entries table
  tableTitle?: string;      // Table header title (e.g., "Repeated Entries")
  tableFields: TemplateField[]; // Columns for the repeated entries table
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

export interface DataEntryRecord {
  id: string;
  templateId: string;
  templateName: string;
  isFlexible?: boolean;
  title?: string;
  fieldValues: Record<string, any>; // Keyed by field extractionKey or field name
  flexibleFields?: Array<{ id?: string; name: string; value: any }>; // Ordered list of direct fields for flexible entries
  tableTitle?: string;
  tableHeaders?: string[]; // List of column names for flexible table
  tableRows: Array<Record<string, any>> | Array<any[]>; // Array of row objects or arrays of cell values
  rawTranscript?: string | null;
  date: string;             // YYYY-MM-DD
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

export interface ExtractedDataResult {
  templateId: string;
  templateName: string;
  isFlexible?: boolean;
  title?: string;
  fieldValues: Record<string, any>;
  flexibleFields?: Array<{ id?: string; name: string; value: any }>;
  tableTitle?: string;
  tableHeaders?: string[];
  tableRows: Array<Record<string, any>> | Array<any[]>;
  raw_transcript?: string;
}

export interface FlexibleField {
  id?: string;
  name: string;             // Display name (e.g. "Part No", "Date", "Billing", "Operator")
  value: string | number;   // Spoken / extracted value (e.g. "1234", "20 August", "None", "Ravi")
}

export interface FlexibleTable {
  title?: string;
  headers: string[];        // TABLEHEADER = ["Field1", "Field2", "Field3"]
  rows: Array<string[]>;    // TABLEROWS = [["Value1", "Value2", "Value3"], ["Value4", ...]]
}

export interface FlexibleExtractedResult {
  isFlexible: true;
  title?: string;
  fields: FlexibleField[];
  table?: FlexibleTable | null;
  raw_transcript?: string;
}


