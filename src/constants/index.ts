import { UserSettings, DataTemplate } from '../types';

export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Food',
  'Transport',
  'Shopping',
  'Entertainment',
  'Bills',
  'Rent',
  'Healthcare',
  'Education',
  'Travel',
  'Subscriptions',
  'Fuel',
  'Salary',
  'Investment',
  'Other',
] as const;

export const PAYMENT_METHOD_CATEGORIES = [
  {
    category: 'Cash',
    methods: ['Cash'],
  },
  {
    category: 'Cards',
    methods: ['Credit Card', 'Debit Card', 'RuPay Credit Card', 'RuPay Debit Card', 'Other Card'],
  },
  {
    category: 'UPI',
    methods: ['UPI', 'Google Pay', 'PhonePe', 'Paytm', 'Amazon Pay', 'BHIM', 'Other UPI'],
  },
] as const;

export const DEFAULT_PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'RuPay Credit Card',
  'RuPay Debit Card',
  'Other Card',
  'UPI',
  'Google Pay',
  'PhonePe',
  'Paytm',
  'Amazon Pay',
  'BHIM',
  'Other UPI',
] as const;

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
] as const;

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'INR',
  currencySymbol: '₹',
  businessName: 'My Enterprise / Shop',
  businessPhone: '+91 98765 43210',
  businessAddress: '123 Market Street, Main City',
  gstin: '22AAAAA0000A1Z5',
  receiptPrefix: 'INV-',
  invoiceFormat: 'standard',
  bankDetails: {
    bankName: 'HDFC Bank',
    accountHolder: 'My Enterprise / Shop',
    accountNumber: '50200012345678',
    ifsc: 'HDFC0001234',
    branch: 'Main City Branch',
  },
};

export const DEFAULT_MONITORING_DETAILS_TEMPLATE: DataTemplate = {
  id: 'template_monitoring_details_default',
  name: 'Monitoring Details',
  description: 'Production run monitoring log with counters, cycle time, cavities, weights & hourly logs.',
  isDefault: true,
  fields: [
    { id: 'f_part_no', name: 'Part No', extractionKey: 'part_no', type: 'text', placeholder: 'e.g. PRT-4029' },
    { id: 'f_description', name: 'Description', extractionKey: 'description', type: 'text', placeholder: 'e.g. Housing Gear Box' },
    { id: 'f_raw_material', name: 'Raw Material', extractionKey: 'raw_material', type: 'text', placeholder: 'e.g. ABS Resin Grade A' },
    { id: 'f_planned_date', name: 'Planned Production Date', extractionKey: 'planned_production_date', type: 'date', placeholder: 'YYYY-MM-DD' },
    { id: 'f_batch_no', name: 'Batch No', extractionKey: 'batch_no', type: 'text', placeholder: 'e.g. B-2026-08' },
    { id: 'f_shift', name: 'Shift', extractionKey: 'shift', type: 'text', placeholder: 'e.g. Shift A / Morning' },
    { id: 'f_opening_counter', name: 'Opening Counter', extractionKey: 'opening_counter', type: 'number', placeholder: 'e.g. 12500' },
    { id: 'f_closing_counter', name: 'Closing Counter', extractionKey: 'closing_counter', type: 'number', placeholder: 'e.g. 13800' },
    { id: 'f_cycle_time', name: 'Cycle Time', extractionKey: 'cycle_time', type: 'text', placeholder: 'e.g. 45 sec' },
    { id: 'f_startup_time', name: 'Startup Time', extractionKey: 'startup_time', type: 'time', placeholder: 'e.g. 08:30 AM' },
    { id: 'f_operator_no', name: 'Operator No', extractionKey: 'operator_no', type: 'text', placeholder: 'e.g. OP-104' },
    { id: 'f_no_of_cavities', name: 'No. of Cavities', extractionKey: 'no_of_cavities', type: 'number', placeholder: 'e.g. 4' },
    { id: 'f_purge_weight', name: 'Purge Weight', extractionKey: 'purge_weight', type: 'number', placeholder: 'e.g. 250 g' },
    { id: 'f_runner_weight', name: 'Runner Weight', extractionKey: 'runner_weight', type: 'number', placeholder: 'e.g. 45 g' },
  ],
  hasTable: true,
  tableTitle: 'Repeated Entries',
  tableFields: [
    { id: 'tf_start_time', name: 'Start Time', extractionKey: 'start_time', type: 'time', placeholder: '08:00 AM' },
    { id: 'tf_end_time', name: 'End Time', extractionKey: 'end_time', type: 'time', placeholder: '09:00 AM' },
    { id: 'tf_planned_qty', name: 'Planned Qty', extractionKey: 'planned_qty', type: 'number', placeholder: '100' },
    { id: 'tf_produced_qty', name: 'Produced Qty', extractionKey: 'produced_qty', type: 'number', placeholder: '98' },
    { id: 'tf_rejection', name: 'Rejection', extractionKey: 'rejection', type: 'number', placeholder: '2' },
    { id: 'tf_remarks', name: 'Remarks', extractionKey: 'remarks', type: 'text', placeholder: 'e.g. Normal Run' },
  ],
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

export const STORAGE_KEYS = {
  TRANSACTIONS: '@voice_finance_transactions_v1',
  RECEIPTS: '@voice_finance_receipts_v1',
  BUDGETS: '@voice_finance_budgets_v1',
  DEBTS: '@voice_finance_debts_v1',
  RECURRING: '@voice_finance_recurring_v1',
  SETTINGS: '@voice_finance_settings_v1',
  RECEIPT_COUNTER: '@voice_finance_receipt_counter_v1',
  TEMPLATES: '@voice_finance_templates_v1',
  DATA_ENTRIES: '@voice_finance_data_entries_v1',
  ACTIVE_TEMPLATE_ID: '@voice_finance_active_template_id_v1',
};

export const COLORS = {
  primary: '#6366F1', // Indigo
  primaryDark: '#4F46E5',
  secondary: '#10B981', // Emerald
  accent: '#F59E0B', // Amber
  danger: '#EF4444', // Red/Coral
  background: '#0F172A', // Slate 900
  card: '#1E293B', // Slate 800
  cardBorder: '#334155', // Slate 700
  text: '#F8FAFC', // Slate 50
  textMuted: '#94A3B8', // Slate 400
  textSubtle: '#64748B', // Slate 500
  inputBg: '#0F172A',
  success: '#10B981',
  warning: '#F59E0B',
  expenseColor: '#F87171',
  incomeColor: '#34D399',
  transferColor: '#60A5FA',
  dataColor: '#06B6D4', // Cyan 500
  dataColorDark: '#0891B2', // Cyan 600
  dataColorLight: '#22D3EE', // Cyan 400
};

