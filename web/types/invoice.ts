export interface BankDetailsConfig {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  ifsc?: string;
  branch?: string;
}

export interface Company {
  id: string;
  name: string;
  gstin: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  email: string;
  bankDetails?: BankDetailsConfig;
  termsAndConditions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  gstin?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  email: string;
  contactPerson?: string;
  bankDetails?: BankDetailsConfig;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  gstin?: string;
  pan?: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  email: string;
  contactPerson?: string;
  shippingAddress?: {
    address?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  name: string;
  hsnCode: string;
  sku?: string;
  unit: string; // PCS, NOS, KGS, MTR, BOX, SET, etc.
  rate: number; // default selling or purchase rate
  gstPercent: number; // 0, 5, 12, 18, 28
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type VoucherType = 'sales' | 'purchase' | 'receipt' | 'payment';

export interface VoucherItem {
  id: string;
  itemId: string;
  itemName: string;
  hsnCode: string;
  sku?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number; // discount amount in INR
  taxableAmount: number;
  gstPercent: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface Voucher {
  id: string;
  voucherType: VoucherType;
  voucherNumber: string; // e.g. INV-1001, PUR-1001, REC-1001, PAY-1001
  date: string; // YYYY-MM-DD
  companyId: string;
  companySnapshot: Partial<Company>;

  // Party references
  customerId?: string;
  customerSnapshot?: Partial<Customer>;
  supplierId?: string;
  supplierSnapshot?: Partial<Supplier>;

  // Sales / Purchase fields
  items?: VoucherItem[];
  subtotal?: number;
  taxableAmount?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  taxTotal?: number;
  roundOff?: number;
  grandTotal: number;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  shipTo?: {
    name?: string;
    address?: string;
    gstin?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    pincode?: string;
  };
  paymentStatus?: 'unpaid' | 'partial' | 'paid';

  // Receipt / Payment specific fields
  amount?: number;
  referenceInvoiceNumber?: string;
  paymentMode?: 'Cash' | 'Bank Transfer' | 'NEFT/RTGS' | 'Cheque' | 'UPI';
  bankName?: string;
  referenceTransactionNumber?: string;
  narration?: string;

  // General fields
  notes?: string;
  termsAndConditions?: string;
  rawTranscript?: string;
  audioUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountTransaction {
  id: string;
  date: string;
  voucherId: string;
  voucherNumber: string;
  voucherType: VoucherType;
  companyId: string;
  companyName: string;
  partyId?: string;
  partyName: string;
  partyType: 'customer' | 'supplier' | 'other';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  balanceType: 'Dr' | 'Cr';
  transactionsCount: number;
}

export interface VoiceVoucherValidationIssue {
  field: 'company' | 'customer' | 'supplier' | 'item' | 'amount' | 'general';
  message: string;
  spokenValue?: string;
}

export interface VoiceVoucherExtractionResult {
  voucherType: VoucherType;
  companyId?: string;
  companyName?: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  date?: string;
  items?: Array<{
    itemId?: string;
    name: string;
    quantity: number;
    unit?: string;
    rate?: number;
    discount?: number;
    gstPercent?: number;
  }>;
  amount?: number;
  referenceInvoiceNumber?: string;
  paymentMode?: 'Cash' | 'Bank Transfer' | 'NEFT/RTGS' | 'Cheque' | 'UPI';
  referenceTransactionNumber?: string;
  narration?: string;
  notes?: string;
  validationIssues: VoiceVoucherValidationIssue[];
  rawTranscript: string;
}
