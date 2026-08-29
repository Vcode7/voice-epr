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

// 1. Indepth Template (formerly Monitoring Details)
export const INDEPTH_TEMPLATE: DataTemplate = {
  id: 'template_indepth_monitoring',
  name: 'Indepth Template',
  description: 'Detailed production run monitoring log with counters, cycle time, cavities, weights & hourly logs.',
  isDefault: false,
  fields: [
    { id: 'f_part_no', name: 'Part No', extractionKey: 'part_no', type: 'text', placeholder: 'e.g. PRT-4029' },
    { id: 'f_description', name: 'Description', extractionKey: 'description', type: 'text', placeholder: 'e.g. Housing Gear Box' },
    { id: 'f_raw_material', name: 'Raw Material', extractionKey: 'raw_material', type: 'text', placeholder: 'e.g. ABS Resin Grade A' },
    { id: 'f_planned_date', name: 'Planned Production Date', extractionKey: 'planned_production_date', type: 'date', placeholder: 'YYYY-MM-DD' },
    { id: 'f_batch_no', name: 'Batch No', extractionKey: 'batch_no', type: 'text', placeholder: 'e.g. B-2026-08' },
    { id: 'f_shift', name: 'Shift', extractionKey: 'shift', type: 'select', options: ['A', 'B', 'C'], placeholder: 'Select Shift (A, B, or C)' },
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

// 2. New Default Template (No table, concise 9 fields)
export const NEW_DEFAULT_TEMPLATE: DataTemplate = {
  id: 'template_default_concise',
  name: 'Default Template',
  description: 'Standard daily production log with machine, part, description, material, quantities, date, and shift.',
  isDefault: true,
  fields: [
    { id: 'f_machine_name', name: 'Machine Name', extractionKey: 'machine_name', type: 'text', placeholder: 'e.g. Injection Machine 01' },
    { id: 'f_part_no', name: 'Part No', extractionKey: 'part_no', type: 'text', placeholder: 'e.g. PRT-4029' },
    { id: 'f_description', name: 'Description', extractionKey: 'description', type: 'number', placeholder: 'e.g. 101' },
    { id: 'f_raw_material', name: 'Raw Material', extractionKey: 'raw_material', type: 'text', placeholder: 'e.g. ABS Resin Grade A' },
    { id: 'f_prod_n_qty', name: 'Prod n Qty', extractionKey: 'prod_n_qty', type: 'text', placeholder: 'e.g. 500 pcs' },
    { id: 'f_reg_n_qty', name: 'Reg n Qty', extractionKey: 'reg_n_qty', type: 'text', placeholder: 'e.g. 12 pcs' },
    { id: 'f_ok_qty', name: 'OK Qty', extractionKey: 'ok_qty', type: 'text', placeholder: 'e.g. 488 pcs' },
    { id: 'f_date', name: 'Date', extractionKey: 'date', type: 'text', placeholder: 'e.g. 21-08-2026' },
    { id: 'f_shift', name: 'Shift', extractionKey: 'shift', type: 'select', options: ['A', 'B', 'C'], placeholder: 'Select Shift (A, B, or C)' },
  ],
  hasTable: false,
  tableFields: [],
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
};

// Aliases
export const DEFAULT_MONITORING_DETAILS_TEMPLATE = NEW_DEFAULT_TEMPLATE;
export const SYSTEM_DEFAULT_TEMPLATES = [NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE];

export const DEFAULT_KEYBOARD_SHORTCUTS = [
  {
    id: 'toggle_recording',
    name: 'Toggle Voice Recording',
    description: 'Start or stop voice dictation on the Voice to Data page',
    defaultKey: 'r',
    key: 'r',
    category: 'recording' as const,
  },
  {
    id: 'new_template',
    name: 'Create / Manage Templates',
    description: 'Open the Template Manager to select or create a template',
    defaultKey: 'ctrl+t',
    key: 'ctrl+t',
    category: 'template' as const,
  },
  {
    id: 'add_field',
    name: 'Add Field / Manual Entry',
    description: 'Quickly create a new manual entry row or add flexible field',
    defaultKey: 'ctrl+f',
    key: 'ctrl+f',
    category: 'entries' as const,
  },
  {
    id: 'save_all',
    name: 'Save All Entries',
    description: 'Save all session entries into a single database parent record',
    defaultKey: 'ctrl+enter',
    key: 'ctrl+enter',
    category: 'entries' as const,
  },
  {
    id: 'edit_entry',
    name: 'Edit Entry with Voice',
    description: 'Trigger focused voice editing on the active or latest entry',
    defaultKey: 'ctrl+e',
    key: 'ctrl+e',
    category: 'recording' as const,
  },
  {
    id: 'cancel_action',
    name: 'Cancel / Stop Action',
    description: 'Stop recording, close open modals, or cancel current operation',
    defaultKey: 'escape',
    key: 'escape',
    category: 'general' as const,
  },
  {
    id: 'undo',
    name: 'Undo Latest Action',
    description: 'Revert the latest entry addition, edit, or deletion',
    defaultKey: 'ctrl+z',
    key: 'ctrl+z',
    category: 'general' as const,
  },
  {
    id: 'print_report',
    name: 'Print Entries Report',
    description: 'Open the formatted printable report view',
    defaultKey: 'ctrl+p',
    key: 'ctrl+p',
    category: 'general' as const,
  },
  {
    id: 'export_excel',
    name: 'Export to Excel',
    description: 'Export all current session entries to an Excel spreadsheet',
    defaultKey: 'ctrl+shift+e',
    key: 'ctrl+shift+e',
    category: 'general' as const,
  },
  {
    id: 'clear_all',
    name: 'Clear Session Entries',
    description: 'Clear all entries currently in the session stack',
    defaultKey: 'ctrl+shift+x',
    key: 'ctrl+shift+x',
    category: 'entries' as const,
  },
];

export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  background: '#0F172A',
  card: '#1E293B',
  cardBorder: '#334155',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
  inputBg: '#0F172A',
  dataColor: '#06B6D4',
};
