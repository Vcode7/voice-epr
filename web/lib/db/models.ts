import { getDb } from '../mongodb';
import {
  Transaction,
  Receipt,
  Budget,
  Debt,
  DataTemplate,
  DataEntryRecord,
  UserSettings,
  DoctorPrescription,
  SapIntegrationConfig,
  SapFieldMapping,
  SapUploadLog,
  Company,
  Supplier,
  Customer,
  Item,
  Voucher,
  VoucherType,
  AccountTransaction,
  LedgerSummary,
} from '../../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_MONITORING_DETAILS_TEMPLATE,
  NEW_DEFAULT_TEMPLATE,
  INDEPTH_TEMPLATE,
  DOCTOR_PRESCRIPTION_TEMPLATE,
} from '../constants';

export const DEFAULT_COMPANIES: Company[] = [
  {
    id: 'comp_default_1',
    name: 'ABC Infotech Pvt Ltd',
    gstin: '27AABCA1234F1Z5',
    pan: 'AABCA1234F',
    address: 'Plot 42, Tech Park, MIDC Andheri East',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400093',
    phone: '+91 98200 12345',
    email: 'billing@abcinfotech.com',
    bankDetails: {
      accountName: 'ABC Infotech Pvt Ltd',
      accountNumber: '91234567890123',
      bankName: 'HDFC Bank Ltd',
      ifsc: 'HDFC0001234',
      branch: 'Andheri East, Mumbai',
    },
    termsAndConditions: '1. Payment due within 15 days from invoice date.\n2. Goods once sold will not be taken back.',
    notes: 'Primary registered company for sales & GST invoicing.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'supp_default_1',
    name: 'Global Tech Supplies',
    gstin: '27AABCG5678K1Z2',
    pan: 'AABCG5678K',
    address: '102 Industrial Estate, Goregaon West',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400062',
    phone: '+91 98111 22334',
    email: 'orders@globaltech.in',
    contactPerson: 'Ramesh Sharma',
    bankDetails: {
      accountName: 'Global Tech Supplies',
      accountNumber: '023405001234',
      bankName: 'ICICI Bank',
      ifsc: 'ICIC0000234',
    },
    notes: 'Authorized IT hardware & accessories vendor',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'cust_default_1',
    name: 'XYZ Enterprises',
    gstin: '24AAACX9876J1Z1',
    pan: 'AAACX9876J',
    address: '501 Commerce Tower, Ashram Road',
    city: 'Ahmedabad',
    state: 'Gujarat',
    stateCode: '24',
    pincode: '380009',
    phone: '+91 97234 56789',
    email: 'purchase@xyzent.com',
    contactPerson: 'Anil Mehta',
    shippingAddress: {
      address: 'Plot 12, GIDC Phase 2, Vatva',
      city: 'Ahmedabad',
      state: 'Gujarat',
      stateCode: '24',
      pincode: '382445',
    },
    notes: 'Regular corporate client (Interstate sales)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cust_default_2',
    name: 'Apex Solutions',
    gstin: '27AABCA9999P1Z8',
    pan: 'AABCA9999P',
    address: 'B-204 Crystal Plaza, Link Road, Malad West',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400064',
    phone: '+91 98205 99999',
    email: 'accounts@apexsolutions.in',
    contactPerson: 'Pooja Verma',
    notes: 'Local client (Intrastate sales)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_ITEMS: Item[] = [
  {
    id: 'item_default_1',
    name: 'Laptop 15-inch Pro',
    hsnCode: '8471',
    sku: 'LAP-001',
    unit: 'PCS',
    rate: 55000,
    gstPercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    description: '15.6-inch Intel Core i7 16GB RAM 512GB SSD Laptop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item_default_2',
    name: 'Wireless Optical Mouse',
    hsnCode: '8471',
    sku: 'MOU-002',
    unit: 'PCS',
    rate: 650,
    gstPercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    description: '2.4GHz Wireless USB Optical Mouse Ergonomic',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item_default_3',
    name: 'Mechanical Keyboard',
    hsnCode: '8471',
    sku: 'KEY-003',
    unit: 'PCS',
    rate: 2400,
    gstPercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    description: 'RGB Backlit Mechanical Typing Keyboard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item_default_4',
    name: 'Ergonomic Office Chair',
    hsnCode: '9403',
    sku: 'CHR-101',
    unit: 'NOS',
    rate: 8500,
    gstPercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    description: 'High-back mesh ergonomic office executive chair',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item_default_5',
    name: 'USB-C Fast Charging Cable',
    hsnCode: '8544',
    sku: 'CBL-202',
    unit: 'PCS',
    rate: 450,
    gstPercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    description: '100W Braided 1.5m Fast Charge Data Cable',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SAP_CONFIG: SapIntegrationConfig = {
  id: 'sap_config_default',
  name: 'SAP S/4HANA OData Service',
  serviceUrl: 'https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV',
  clientNumber: '100',
  auth: {
    authType: 'basic',
    username: 'SAP_API_USER',
    password: '',
    hasPassword: true,
  },
  csrfEnabled: true,
  timeoutMs: 60000,
  isActive: true,
  useMockFallback: false,
  allowInsecureSsl: true,
  proxyUrl: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// In-Memory fallback store if MongoDB URI is not configured or in offline mode
const memoryStore = {
  transactions: [] as Transaction[],
  receipts: [] as Receipt[],
  budgets: [] as Budget[],
  debts: [] as Debt[],
  templates: [DEFAULT_MONITORING_DETAILS_TEMPLATE, DOCTOR_PRESCRIPTION_TEMPLATE] as DataTemplate[],
  dataEntries: [] as DataEntryRecord[],
  prescriptions: [] as DoctorPrescription[],
  settings: { ...DEFAULT_SETTINGS } as UserSettings,
  sapConfig: { ...DEFAULT_SAP_CONFIG } as SapIntegrationConfig,
  sapMappings: [] as SapFieldMapping[],
  sapLogs: [] as SapUploadLog[],
  companies: [...DEFAULT_COMPANIES] as Company[],
  suppliers: [...DEFAULT_SUPPLIERS] as Supplier[],
  customers: [...DEFAULT_CUSTOMERS] as Customer[],
  items: [...DEFAULT_ITEMS] as Item[],
  vouchers: [] as Voucher[],
};

// ----------------------------------------------------
// 1. Transactions Collection
// ----------------------------------------------------
export const dbTransactions = {
  async getAll(): Promise<Transaction[]> {
    const db = await getDb();
    if (!db) {
      return [...memoryStore.transactions].sort((a, b) => (b.date > a.date ? 1 : -1));
    }
    const docs = await db
      .collection<Transaction>('transactions')
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .toArray();
    return docs.map(({ _id, ...rest }: any) => rest as Transaction);
  },

  async getById(id: string): Promise<Transaction | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.transactions.find((t) => t.id === id) || null;
    }
    const doc = await db.collection<Transaction>('transactions').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as Transaction;
  },

  async create(data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Transaction> {
    const transaction: Transaction = {
      id: data.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amount: data.amount,
      currency: data.currency || 'INR',
      merchant: data.merchant || null,
      category: data.category || 'Other',
      paymentMethod: data.paymentMethod || null,
      transactionType: data.transactionType || 'expense',
      description: data.description || null,
      transcript: data.transcript || null,
      date: data.date,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.transactions.unshift(transaction);
      return transaction;
    }

    await db.collection('transactions').updateOne(
      { id: transaction.id },
      { $set: transaction },
      { upsert: true }
    );
    return transaction;
  },

  async createMany(items: Transaction[]): Promise<Transaction[]> {
    const db = await getDb();
    if (!db) {
      items.forEach((item) => {
        const idx = memoryStore.transactions.findIndex((t) => t.id === item.id);
        if (idx >= 0) memoryStore.transactions[idx] = item;
        else memoryStore.transactions.unshift(item);
      });
      return items;
    }

    const operations = items.map((item) => ({
      updateOne: {
        filter: { id: item.id },
        update: { $set: item },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await db.collection('transactions').bulkWrite(operations);
    }
    return items;
  },

  async update(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.transactions.findIndex((t) => t.id === id);
      if (idx === -1) return null;
      memoryStore.transactions[idx] = { ...memoryStore.transactions[idx], ...updates };
      return memoryStore.transactions[idx];
    }

    await db.collection('transactions').updateOne({ id }, { $set: updates });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.transactions.findIndex((t) => t.id === id);
      if (idx === -1) return false;
      memoryStore.transactions.splice(idx, 1);
      return true;
    }
    const res = await db.collection('transactions').deleteOne({ id });
    return res.deletedCount > 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    if (!db) {
      memoryStore.transactions = [];
      return;
    }
    await db.collection('transactions').deleteMany({});
  },
};

// ----------------------------------------------------
// 2. Receipts Collection
// ----------------------------------------------------
export const dbReceipts = {
  async getAll(): Promise<Receipt[]> {
    const db = await getDb();
    if (!db) {
      return [...memoryStore.receipts].sort((a, b) => (b.date > a.date ? 1 : -1));
    }
    const docs = await db
      .collection<Receipt>('receipts')
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .toArray();
    return docs.map(({ _id, ...rest }: any) => rest as Receipt);
  },

  async getById(id: string): Promise<Receipt | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.receipts.find((r) => r.id === id) || null;
    }
    const doc = await db.collection<Receipt>('receipts').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as Receipt;
  },

  async getNextReceiptNumber(): Promise<string> {
    const db = await getDb();
    const settings = await dbSettings.get();
    const prefix = settings.receiptPrefix || 'INV-';

    if (!db) {
      const count = memoryStore.receipts.length + 1;
      return `${prefix}${1000 + count}`;
    }

    const count = await db.collection('receipts').countDocuments();
    return `${prefix}${1001 + count}`;
  },

  async create(data: Omit<Receipt, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Receipt> {
    const receipt: Receipt = {
      id: data.id || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber: data.receiptNumber,
      date: data.date,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      items: data.items || [],
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax || 0,
      taxPercent: data.taxPercent || 0,
      taxType: data.taxType || 'none',
      cgst: data.cgst || 0,
      sgst: data.sgst || 0,
      igst: data.igst || 0,
      grandTotal: data.grandTotal,
      currency: data.currency || 'INR',
      transcript: data.transcript || null,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.receipts.unshift(receipt);
      return receipt;
    }

    await db.collection('receipts').updateOne(
      { id: receipt.id },
      { $set: receipt },
      { upsert: true }
    );
    return receipt;
  },

  async createMany(items: Receipt[]): Promise<Receipt[]> {
    const db = await getDb();
    if (!db) {
      items.forEach((item) => {
        const idx = memoryStore.receipts.findIndex((r) => r.id === item.id);
        if (idx >= 0) memoryStore.receipts[idx] = item;
        else memoryStore.receipts.unshift(item);
      });
      return items;
    }

    const operations = items.map((item) => ({
      updateOne: {
        filter: { id: item.id },
        update: { $set: item },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await db.collection('receipts').bulkWrite(operations);
    }
    return items;
  },

  async update(id: string, updates: Partial<Receipt>): Promise<Receipt | null> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.receipts.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      memoryStore.receipts[idx] = { ...memoryStore.receipts[idx], ...updates };
      return memoryStore.receipts[idx];
    }
    await db.collection('receipts').updateOne({ id }, { $set: updates });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.receipts.findIndex((r) => r.id === id);
      if (idx === -1) return false;
      memoryStore.receipts.splice(idx, 1);
      return true;
    }
    const res = await db.collection('receipts').deleteOne({ id });
    return res.deletedCount > 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    if (!db) {
      memoryStore.receipts = [];
      return;
    }
    await db.collection('receipts').deleteMany({});
  },
};

// ----------------------------------------------------
// 3. Budgets Collection
// ----------------------------------------------------
export const dbBudgets = {
  async getAll(): Promise<Budget[]> {
    const db = await getDb();
    if (!db) return [...memoryStore.budgets];
    const docs = await db.collection<Budget>('budgets').find({}).toArray();
    return docs.map(({ _id, ...rest }: any) => rest as Budget);
  },

  async setBudget(category: string, amount: number, period: Budget['period'] = 'monthly'): Promise<Budget> {
    const db = await getDb();
    const existing = await this.getAll();
    const found = existing.find((b) => b.category.toLowerCase() === category.toLowerCase());

    const budget: Budget = {
      id: found ? found.id : `budget_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      amount,
      period,
      createdAt: found ? found.createdAt : new Date().toISOString(),
    };

    if (!db) {
      const idx = memoryStore.budgets.findIndex((b) => b.category.toLowerCase() === category.toLowerCase());
      if (idx >= 0) memoryStore.budgets[idx] = budget;
      else memoryStore.budgets.push(budget);
      return budget;
    }

    await db.collection('budgets').updateOne(
      { category: { $regex: new RegExp(`^${category}$`, 'i') } },
      { $set: budget },
      { upsert: true }
    );
    return budget;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.budgets.findIndex((b) => b.id === id);
      if (idx === -1) return false;
      memoryStore.budgets.splice(idx, 1);
      return true;
    }
    const res = await db.collection('budgets').deleteOne({ id });
    return res.deletedCount > 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    if (!db) {
      memoryStore.budgets = [];
      return;
    }
    await db.collection('budgets').deleteMany({});
  },
};

// ----------------------------------------------------
// 4. Debts Collection
// ----------------------------------------------------
export const dbDebts = {
  async getAll(): Promise<Debt[]> {
    const db = await getDb();
    if (!db) return [...memoryStore.debts];
    const docs = await db.collection<Debt>('debts').find({}).sort({ updatedAt: -1 }).toArray();
    return docs.map(({ _id, ...rest }: any) => rest as Debt);
  },

  async recordDebt(
    personName: string,
    amount: number,
    type: 'given' | 'borrowed',
    notes?: string | null,
    date?: string
  ): Promise<Debt> {
    const debt: Debt = {
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      personName,
      amount,
      type,
      settled: false,
      notes: notes || null,
      date: date || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.debts.unshift(debt);
      return debt;
    }

    await db.collection('debts').insertOne(debt as any);
    return debt;
  },

  async recordRepayment(personName: string, amount: number): Promise<Debt | null> {
    const debts = await this.getAll();
    const active = debts.find(
      (d) => !d.settled && d.personName.toLowerCase().includes(personName.toLowerCase())
    );

    if (!active) return null;

    const remaining = active.amount - amount;
    const updates = {
      amount: Math.max(0, remaining),
      settled: remaining <= 0,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      const idx = memoryStore.debts.findIndex((d) => d.id === active.id);
      if (idx !== -1) memoryStore.debts[idx] = { ...memoryStore.debts[idx], ...updates };
      return memoryStore.debts[idx];
    }

    await db.collection('debts').updateOne({ id: active.id }, { $set: updates });
    return { ...active, ...updates };
  },

  async toggleSettled(id: string): Promise<Debt | null> {
    const debts = await this.getAll();
    const target = debts.find((d) => d.id === id);
    if (!target) return null;

    const updates = {
      settled: !target.settled,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      const idx = memoryStore.debts.findIndex((d) => d.id === id);
      if (idx !== -1) memoryStore.debts[idx] = { ...memoryStore.debts[idx], ...updates };
      return memoryStore.debts[idx];
    }

    await db.collection('debts').updateOne({ id }, { $set: updates });
    return { ...target, ...updates };
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.debts.findIndex((d) => d.id === id);
      if (idx === -1) return false;
      memoryStore.debts.splice(idx, 1);
      return true;
    }
    const res = await db.collection('debts').deleteOne({ id });
    return res.deletedCount > 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    if (!db) {
      memoryStore.debts = [];
      return;
    }
    await db.collection('debts').deleteMany({});
  },
};

// ----------------------------------------------------
// 5. Templates Collection
// ----------------------------------------------------
export const dbTemplates = {
  async getAll(): Promise<DataTemplate[]> {
    const db = await getDb();
    if (!db) {
      if (memoryStore.templates.length === 0) {
        memoryStore.templates = [NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE];
      }
      return [...memoryStore.templates];
    }

    const docs = await db.collection<DataTemplate>('templates').find({}).toArray();
    if (docs.length === 0) {
      // Seed default, indepth, and doctor prescription templates
      await db.collection('templates').insertMany([NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE, DOCTOR_PRESCRIPTION_TEMPLATE] as any);
      return [NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE, DOCTOR_PRESCRIPTION_TEMPLATE];
    }

    // Auto-migrate: ensure NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE, and DOCTOR_PRESCRIPTION_TEMPLATE exist in database
    const defaultDoc = docs.find((d) => d.id === NEW_DEFAULT_TEMPLATE.id);
    const indepthDoc = docs.find((d) => d.id === INDEPTH_TEMPLATE.id || d.name === 'Indepth Template');
    const doctorDoc = docs.find((d) => d.id === DOCTOR_PRESCRIPTION_TEMPLATE.id || d.name === 'Doctor Prescription');

    let needsRefresh = false;

    if (!doctorDoc) {
      await db.collection('templates').updateOne(
        { id: DOCTOR_PRESCRIPTION_TEMPLATE.id },
        { $set: DOCTOR_PRESCRIPTION_TEMPLATE },
        { upsert: true }
      );
      needsRefresh = true;
    }

    if (!defaultDoc) {
      await db.collection('templates').updateOne(
        { id: NEW_DEFAULT_TEMPLATE.id },
        { $set: NEW_DEFAULT_TEMPLATE },
        { upsert: true }
      );
      needsRefresh = true;
    } else {
      const shiftField = defaultDoc.fields?.find((f) => f.extractionKey === 'shift');
      if (!shiftField?.options || shiftField.options.length === 0) {
        await db.collection('templates').updateOne(
          { id: NEW_DEFAULT_TEMPLATE.id },
          { $set: NEW_DEFAULT_TEMPLATE }
        );
        needsRefresh = true;
      }
    }

    if (!indepthDoc) {
      await db.collection('templates').updateOne(
        { id: INDEPTH_TEMPLATE.id },
        { $set: INDEPTH_TEMPLATE },
        { upsert: true }
      );
      needsRefresh = true;
    } else {
      const shiftField = indepthDoc.fields?.find((f) => f.extractionKey === 'shift');
      if (!shiftField?.options || shiftField.options.length === 0) {
        await db.collection('templates').updateOne(
          { id: INDEPTH_TEMPLATE.id },
          { $set: INDEPTH_TEMPLATE }
        );
        needsRefresh = true;
      }
    }

    if (needsRefresh) {
      const updatedDocs = await db.collection<DataTemplate>('templates').find({}).toArray();
      return updatedDocs.map(({ _id, ...rest }: any) => rest as DataTemplate);
    }

    return docs.map(({ _id, ...rest }: any) => rest as DataTemplate);
  },

  async getById(id: string): Promise<DataTemplate | null> {
    const all = await this.getAll();
    return all.find((t) => t.id === id) || null;
  },

  async save(template: DataTemplate): Promise<DataTemplate> {
    const tmpl: DataTemplate = {
      ...template,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      const idx = memoryStore.templates.findIndex((t) => t.id === tmpl.id);
      if (idx >= 0) memoryStore.templates[idx] = tmpl;
      else memoryStore.templates.push(tmpl);
      return tmpl;
    }

    await db.collection('templates').updateOne(
      { id: tmpl.id },
      { $set: tmpl },
      { upsert: true }
    );
    return tmpl;
  },

  async delete(id: string): Promise<boolean> {
    if (id === NEW_DEFAULT_TEMPLATE.id) {
      return false; // Protect default template
    }
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.templates.findIndex((t) => t.id === id);
      if (idx === -1) return false;
      memoryStore.templates.splice(idx, 1);
      return true;
    }
    const res = await db.collection('templates').deleteOne({ id });
    return res.deletedCount > 0;
  },

  async resetDefaults(): Promise<DataTemplate[]> {
    const db = await getDb();
    if (!db) {
      memoryStore.templates = [NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE];
      return memoryStore.templates;
    }
    await db.collection('templates').deleteMany({});
    await db.collection('templates').insertMany([NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE] as any);
    return [NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE];
  },
};

// ----------------------------------------------------
// 6. Data Entries (EPR Records) Collection
// ----------------------------------------------------
export const dbDataEntries = {
  async getAll(): Promise<DataEntryRecord[]> {
    const db = await getDb();
    if (!db) {
      return [...memoryStore.dataEntries].sort((a, b) => (b.date > a.date ? 1 : -1));
    }
    const docs = await db
      .collection<DataEntryRecord>('data_entries')
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .toArray();
    return docs.map(({ _id, ...rest }: any) => rest as DataEntryRecord);
  },

  async getById(id: string): Promise<DataEntryRecord | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.dataEntries.find((e) => e.id === id) || null;
    }
    const doc = await db.collection<DataEntryRecord>('data_entries').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as DataEntryRecord;
  },

  async create(data: Omit<DataEntryRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }): Promise<DataEntryRecord> {
    const record: DataEntryRecord = {
      id: data.id || `entry_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      templateId: data.templateId,
      templateName: data.templateName || 'Data Record',
      isFlexible: !!data.isFlexible,
      title: data.title || undefined,
      fieldValues: data.fieldValues || {},
      flexibleFields: data.flexibleFields || undefined,
      tableTitle: data.tableTitle || undefined,
      tableHeaders: data.tableHeaders || undefined,
      tableRows: data.tableRows || [],
      rawTranscript: data.rawTranscript || null,
      entries: data.entries || undefined,
      totalEntries: data.totalEntries || (data.entries ? data.entries.length : 1),
      date: data.date || new Date().toISOString().split('T')[0],
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.dataEntries.unshift(record);
      return record;
    }

    await db.collection('data_entries').updateOne(
      { id: record.id },
      { $set: record },
      { upsert: true }
    );
    return record;
  },

  async createMany(items: DataEntryRecord[]): Promise<DataEntryRecord[]> {
    const db = await getDb();
    if (!db) {
      items.forEach((item) => {
        const idx = memoryStore.dataEntries.findIndex((e) => e.id === item.id);
        if (idx >= 0) memoryStore.dataEntries[idx] = item;
        else memoryStore.dataEntries.unshift(item);
      });
      return items;
    }

    const operations = items.map((item) => ({
      updateOne: {
        filter: { id: item.id },
        update: { $set: item },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await db.collection('data_entries').bulkWrite(operations);
    }
    return items;
  },

  async update(id: string, updates: Partial<DataEntryRecord>): Promise<DataEntryRecord | null> {
    const db = await getDb();
    const payload = { ...updates, updatedAt: new Date().toISOString() };

    if (!db) {
      const idx = memoryStore.dataEntries.findIndex((e) => e.id === id);
      if (idx === -1) return null;
      memoryStore.dataEntries[idx] = { ...memoryStore.dataEntries[idx], ...payload };
      return memoryStore.dataEntries[idx];
    }

    await db.collection('data_entries').updateOne({ id }, { $set: payload });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.dataEntries.findIndex((e) => e.id === id);
      if (idx === -1) return false;
      memoryStore.dataEntries.splice(idx, 1);
      return true;
    }
    const res = await db.collection('data_entries').deleteOne({ id });
    return res.deletedCount > 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    if (!db) {
      memoryStore.dataEntries = [];
      return;
    }
    await db.collection('data_entries').deleteMany({});
  },
};

// ----------------------------------------------------
// 7. Settings Collection
// ----------------------------------------------------
export const dbSettings = {
  async get(): Promise<UserSettings> {
    const db = await getDb();
    if (!db) return { ...memoryStore.settings };

    const doc = await db.collection('settings').findOne({ _key: 'app_settings' });
    if (!doc) {
      await db.collection('settings').insertOne({ _key: 'app_settings', ...DEFAULT_SETTINGS } as any);
      return { ...DEFAULT_SETTINGS };
    }
    const { _id, _key, ...rest } = doc as any;
    return rest as UserSettings;
  },

  async update(updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.get();
    const updated = { ...current, ...updates };

    const db = await getDb();
    if (!db) {
      memoryStore.settings = updated;
      return updated;
    }

    await db.collection('settings').updateOne(
      { _key: 'app_settings' },
      { $set: updated },
      { upsert: true }
    );
    return updated;
  },
};

// ----------------------------------------------------
// 8. Prescriptions Collection (Doctor Prescriptions)
// ----------------------------------------------------
export const dbPrescriptions = {
  async getAll(): Promise<DoctorPrescription[]> {
    const db = await getDb();
    if (!db) {
      return [...memoryStore.prescriptions].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    }
    const docs = await db
      .collection<DoctorPrescription>('prescriptions')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map(({ _id, ...rest }: any) => rest as DoctorPrescription);
  },

  async getById(id: string): Promise<DoctorPrescription | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.prescriptions.find((p) => p.id === id) || null;
    }
    const doc = await db.collection<DoctorPrescription>('prescriptions').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as DoctorPrescription;
  },

  async getNextPrescriptionNumber(): Promise<string> {
    const db = await getDb();
    const prefix = 'RX-';
    const year = new Date().getFullYear();

    if (!db) {
      const count = memoryStore.prescriptions.length + 1;
      return `${prefix}${year}-${1000 + count}`;
    }

    const count = await db.collection('prescriptions').countDocuments();
    return `${prefix}${year}-${1001 + count}`;
  },

  async create(data: Omit<DoctorPrescription, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }): Promise<DoctorPrescription> {
    const prescriptionNumber = data.prescriptionNumber || (await this.getNextPrescriptionNumber());
    const prescription: DoctorPrescription = {
      id: data.id || `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      prescriptionNumber,
      patientName: data.patientName || 'Anonymous Patient',
      age: data.age || '',
      gender: data.gender || '',
      phone: data.phone || '',
      email: data.email || '',
      date: data.date || new Date().toISOString().split('T')[0],
      doctorName: data.doctorName || 'Dr. Physician',
      doctorSpecialty: data.doctorSpecialty || '',
      doctorRegNo: data.doctorRegNo || '',
      clinicDetails: data.clinicDetails || '',
      clinicAddress: data.clinicAddress || '',
      clinicPhone: data.clinicPhone || '',
      diagnosis: data.diagnosis || '',
      notes: data.notes || '',
      medicines: data.medicines || [],
      rawTranscript: data.rawTranscript || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.prescriptions.unshift(prescription);
      return prescription;
    }

    await db.collection('prescriptions').updateOne(
      { id: prescription.id },
      { $set: prescription },
      { upsert: true }
    );
    return prescription;
  },

  async update(id: string, updates: Partial<DoctorPrescription>): Promise<DoctorPrescription | null> {
    const db = await getDb();
    const payload = { ...updates, updatedAt: new Date().toISOString() };

    if (!db) {
      const idx = memoryStore.prescriptions.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      memoryStore.prescriptions[idx] = { ...memoryStore.prescriptions[idx], ...payload };
      return memoryStore.prescriptions[idx];
    }

    await db.collection('prescriptions').updateOne({ id }, { $set: payload });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.prescriptions.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      memoryStore.prescriptions.splice(idx, 1);
      return true;
    }
    const res = await db.collection('prescriptions').deleteOne({ id });
    return res.deletedCount > 0;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    if (!db) {
      memoryStore.prescriptions = [];
      return;
    }
    await db.collection('prescriptions').deleteMany({});
  },
};

// ----------------------------------------------------
// 9. SAP Integration Configuration Collection
// ----------------------------------------------------
export const dbSapConfig = {
  async get(): Promise<SapIntegrationConfig> {
    const db = await getDb();
    if (!db) return { ...memoryStore.sapConfig };

    const doc = await db.collection('sap_config').findOne({ _key: 'sap_active_config' });
    if (!doc) {
      await db.collection('sap_config').insertOne({ _key: 'sap_active_config', ...DEFAULT_SAP_CONFIG } as any);
      return { ...DEFAULT_SAP_CONFIG };
    }
    const { _id, _key, ...rest } = doc as any;
    return rest as SapIntegrationConfig;
  },

  async getPublic(): Promise<SapIntegrationConfig> {
    const config = await this.get();
    // Return sanitized config - never reveal raw secrets to frontend
    return {
      ...config,
      auth: {
        ...config.auth,
        password: undefined,
        hasPassword: !!(config.auth.password && config.auth.password.trim().length > 0),
        clientSecret: undefined,
        hasClientSecret: !!(config.auth.clientSecret && config.auth.clientSecret.trim().length > 0),
        bearerToken: undefined,
        hasBearerToken: !!(config.auth.bearerToken && config.auth.bearerToken.trim().length > 0),
        apiKeyValue: undefined,
        hasApiKey: !!(config.auth.apiKeyValue && config.auth.apiKeyValue.trim().length > 0),
      },
    };
  },

  async save(updates: Partial<SapIntegrationConfig>): Promise<SapIntegrationConfig> {
    const current = await this.get();
    
    // Preserve existing server secrets if client submitted masked or empty password
    const updatedAuth = { ...current.auth, ...(updates.auth || {}) };
    if (!updates.auth?.password || updates.auth.password.includes('••') || updates.auth.password.trim() === '') {
      updatedAuth.password = current.auth.password || '';
    }
    if (!updates.auth?.clientSecret || updates.auth.clientSecret.includes('••') || updates.auth.clientSecret.trim() === '') {
      updatedAuth.clientSecret = current.auth.clientSecret || '';
    }
    if (!updates.auth?.bearerToken || updates.auth.bearerToken.includes('••') || updates.auth.bearerToken.trim() === '') {
      updatedAuth.bearerToken = current.auth.bearerToken || '';
    }
    if (!updates.auth?.apiKeyValue || updates.auth.apiKeyValue.includes('••') || updates.auth.apiKeyValue.trim() === '') {
      updatedAuth.apiKeyValue = current.auth.apiKeyValue || '';
    }

    const updated: SapIntegrationConfig = {
      ...current,
      ...updates,
      auth: updatedAuth,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.sapConfig = updated;
      return updated;
    }

    await db.collection('sap_config').updateOne(
      { _key: 'sap_active_config' },
      { $set: updated },
      { upsert: true }
    );
    return updated;
  },
};

// ----------------------------------------------------
// 10. SAP Field Mappings Collection
// ----------------------------------------------------
export const dbSapMappings = {
  async getAll(): Promise<SapFieldMapping[]> {
    const db = await getDb();
    if (!db) return [...memoryStore.sapMappings];

    const docs = await db.collection<SapFieldMapping>('sap_mappings').find({}).toArray();
    return docs.map(({ _id, ...rest }: any) => rest as SapFieldMapping);
  },

  async getByTemplateAndEntity(templateId: string, entitySetName: string): Promise<SapFieldMapping | null> {
    const db = await getDb();
    if (!db) {
      return (
        memoryStore.sapMappings.find(
          (m) => m.templateId === templateId && m.entitySetName.toLowerCase() === entitySetName.toLowerCase()
        ) || null
      );
    }

    const doc = await db.collection<SapFieldMapping>('sap_mappings').findOne({
      templateId,
      entitySetName: { $regex: new RegExp(`^${entitySetName}$`, 'i') },
    });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as SapFieldMapping;
  },

  async getByTemplateId(templateId: string): Promise<SapFieldMapping | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.sapMappings.find((m) => m.templateId === templateId) || null;
    }

    const doc = await db.collection<SapFieldMapping>('sap_mappings').findOne({ templateId });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as SapFieldMapping;
  },

  async save(mapping: SapFieldMapping): Promise<SapFieldMapping> {
    const item: SapFieldMapping = {
      ...mapping,
      id: mapping.id || `map_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      const idx = memoryStore.sapMappings.findIndex(
        (m) => m.templateId === item.templateId && m.entitySetName === item.entitySetName
      );
      if (idx >= 0) memoryStore.sapMappings[idx] = item;
      else memoryStore.sapMappings.push(item);
      return item;
    }

    await db.collection('sap_mappings').updateOne(
      { templateId: item.templateId, entitySetName: item.entitySetName },
      { $set: item },
      { upsert: true }
    );
    return item;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.sapMappings.findIndex((m) => m.id === id);
      if (idx === -1) return false;
      memoryStore.sapMappings.splice(idx, 1);
      return true;
    }
    const res = await db.collection('sap_mappings').deleteOne({ id });
    return res.deletedCount > 0;
  },
};

// ----------------------------------------------------
// 11. SAP Upload History Logs Collection
// ----------------------------------------------------
export const dbSapLogs = {
  async getAll(filters?: { templateId?: string; status?: string; recordId?: string }): Promise<SapUploadLog[]> {
    const db = await getDb();
    let logs: SapUploadLog[] = [];

    if (!db) {
      logs = [...memoryStore.sapLogs];
    } else {
      const query: any = {};
      if (filters?.templateId && filters.templateId !== 'All') query.templateId = filters.templateId;
      if (filters?.status && filters.status !== 'All') query.status = filters.status;
      if (filters?.recordId) query.recordId = filters.recordId;

      const docs = await db
        .collection<SapUploadLog>('sap_upload_logs')
        .find(query)
        .sort({ uploadedAt: -1 })
        .toArray();
      logs = docs.map(({ _id, ...rest }: any) => rest as SapUploadLog);
    }

    if (!db) {
      if (filters?.templateId && filters.templateId !== 'All') {
        logs = logs.filter((l) => l.templateId === filters.templateId);
      }
      if (filters?.status && filters.status !== 'All') {
        logs = logs.filter((l) => l.status === filters.status);
      }
      if (filters?.recordId) {
        logs = logs.filter((l) => l.recordId === filters.recordId);
      }
      logs.sort((a, b) => (b.uploadedAt > a.uploadedAt ? 1 : -1));
    }

    return logs;
  },

  async getById(id: string): Promise<SapUploadLog | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.sapLogs.find((l) => l.id === id) || null;
    }
    const doc = await db.collection<SapUploadLog>('sap_upload_logs').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as SapUploadLog;
  },

  async getLatestByRecordId(recordId: string): Promise<SapUploadLog | null> {
    const db = await getDb();
    if (!db) {
      const matches = memoryStore.sapLogs.filter((l) => l.recordId === recordId);
      if (matches.length === 0) return null;
      return matches.sort((a, b) => (b.uploadedAt > a.uploadedAt ? 1 : -1))[0];
    }
    const doc = await db
      .collection<SapUploadLog>('sap_upload_logs')
      .find({ recordId })
      .sort({ uploadedAt: -1 })
      .limit(1)
      .toArray();
    if (doc.length === 0) return null;
    const { _id, ...rest } = doc[0] as any;
    return rest as SapUploadLog;
  },

  async create(data: Omit<SapUploadLog, 'id' | 'uploadedAt'> & { id?: string; uploadedAt?: string }): Promise<SapUploadLog> {
    const log: SapUploadLog = {
      id: data.id || `saplog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recordId: data.recordId,
      templateId: data.templateId,
      templateName: data.templateName || 'Data Record',
      sapConfigId: data.sapConfigId,
      entitySetName: data.entitySetName,
      status: data.status,
      httpStatus: data.httpStatus,
      payload: data.payload,
      sapDocumentId: data.sapDocumentId || null,
      responseBody: data.responseBody,
      errorMessage: data.errorMessage || null,
      uploadedAt: data.uploadedAt || new Date().toISOString(),
      durationMs: data.durationMs || 0,
    };

    const db = await getDb();
    if (!db) {
      memoryStore.sapLogs.unshift(log);
      return log;
    }

    await db.collection('sap_upload_logs').insertOne(log as any);
    return log;
  },

  async clear(): Promise<void> {
    const db = await getDb();
    if (!db) {
      memoryStore.sapLogs = [];
      return;
    }
    await db.collection('sap_upload_logs').deleteMany({});
  },
};

// ----------------------------------------------------
// 12. Companies Collection (Master)
// ----------------------------------------------------
export const dbCompanies = {
  async getAll(): Promise<Company[]> {
    const db = await getDb();
    if (!db) {
      if (memoryStore.companies.length === 0) {
        memoryStore.companies = [...DEFAULT_COMPANIES];
      }
      return [...memoryStore.companies].sort((a, b) => a.name.localeCompare(b.name));
    }

    const docs = await db.collection<Company>('companies').find({}).sort({ name: 1 }).toArray();
    if (docs.length === 0) {
      await db.collection('companies').insertMany(DEFAULT_COMPANIES as any);
      return [...DEFAULT_COMPANIES];
    }
    return docs.map(({ _id, ...rest }: any) => rest as Company);
  },

  async getById(id: string): Promise<Company | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.companies.find((c) => c.id === id) || null;
    }
    const doc = await db.collection<Company>('companies').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as Company;
  },

  async create(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Company> {
    const company: Company = {
      id: data.id || `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      gstin: data.gstin.trim().toUpperCase(),
      pan: data.pan ? data.pan.trim().toUpperCase() : undefined,
      address: data.address.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      stateCode: data.stateCode.trim(),
      pincode: data.pincode.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      bankDetails: data.bankDetails,
      termsAndConditions: data.termsAndConditions,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.companies.unshift(company);
      return company;
    }

    await db.collection('companies').updateOne({ id: company.id }, { $set: company }, { upsert: true });
    return company;
  },

  async update(id: string, updates: Partial<Company>): Promise<Company | null> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.companies.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      memoryStore.companies[idx] = { ...memoryStore.companies[idx], ...payload };
      return memoryStore.companies[idx];
    }

    await db.collection('companies').updateOne({ id }, { $set: payload });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.companies.findIndex((c) => c.id === id);
      if (idx === -1) return false;
      memoryStore.companies.splice(idx, 1);
      return true;
    }
    const res = await db.collection('companies').deleteOne({ id });
    return res.deletedCount > 0;
  },
};

// ----------------------------------------------------
// 13. Suppliers Collection (Master)
// ----------------------------------------------------
export const dbSuppliers = {
  async getAll(): Promise<Supplier[]> {
    const db = await getDb();
    if (!db) {
      if (memoryStore.suppliers.length === 0) {
        memoryStore.suppliers = [...DEFAULT_SUPPLIERS];
      }
      return [...memoryStore.suppliers].sort((a, b) => a.name.localeCompare(b.name));
    }

    const docs = await db.collection<Supplier>('suppliers').find({}).sort({ name: 1 }).toArray();
    if (docs.length === 0) {
      await db.collection('suppliers').insertMany(DEFAULT_SUPPLIERS as any);
      return [...DEFAULT_SUPPLIERS];
    }
    return docs.map(({ _id, ...rest }: any) => rest as Supplier);
  },

  async getById(id: string): Promise<Supplier | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.suppliers.find((s) => s.id === id) || null;
    }
    const doc = await db.collection<Supplier>('suppliers').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as Supplier;
  },

  async create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Supplier> {
    const supplier: Supplier = {
      id: data.id || `supp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      gstin: data.gstin ? data.gstin.trim().toUpperCase() : undefined,
      pan: data.pan ? data.pan.trim().toUpperCase() : undefined,
      address: data.address.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      stateCode: data.stateCode.trim(),
      pincode: data.pincode.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      contactPerson: data.contactPerson?.trim(),
      bankDetails: data.bankDetails,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.suppliers.unshift(supplier);
      return supplier;
    }

    await db.collection('suppliers').updateOne({ id: supplier.id }, { $set: supplier }, { upsert: true });
    return supplier;
  },

  async update(id: string, updates: Partial<Supplier>): Promise<Supplier | null> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.suppliers.findIndex((s) => s.id === id);
      if (idx === -1) return null;
      memoryStore.suppliers[idx] = { ...memoryStore.suppliers[idx], ...payload };
      return memoryStore.suppliers[idx];
    }

    await db.collection('suppliers').updateOne({ id }, { $set: payload });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.suppliers.findIndex((s) => s.id === id);
      if (idx === -1) return false;
      memoryStore.suppliers.splice(idx, 1);
      return true;
    }
    const res = await db.collection('suppliers').deleteOne({ id });
    return res.deletedCount > 0;
  },
};

// ----------------------------------------------------
// 14. Customers Collection (Master)
// ----------------------------------------------------
export const dbCustomers = {
  async getAll(): Promise<Customer[]> {
    const db = await getDb();
    if (!db) {
      if (memoryStore.customers.length === 0) {
        memoryStore.customers = [...DEFAULT_CUSTOMERS];
      }
      return [...memoryStore.customers].sort((a, b) => a.name.localeCompare(b.name));
    }

    const docs = await db.collection<Customer>('customers').find({}).sort({ name: 1 }).toArray();
    if (docs.length === 0) {
      await db.collection('customers').insertMany(DEFAULT_CUSTOMERS as any);
      return [...DEFAULT_CUSTOMERS];
    }
    return docs.map(({ _id, ...rest }: any) => rest as Customer);
  },

  async getById(id: string): Promise<Customer | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.customers.find((c) => c.id === id) || null;
    }
    const doc = await db.collection<Customer>('customers').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as Customer;
  },

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Customer> {
    const customer: Customer = {
      id: data.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      gstin: data.gstin ? data.gstin.trim().toUpperCase() : undefined,
      pan: data.pan ? data.pan.trim().toUpperCase() : undefined,
      address: data.address.trim(),
      city: data.city.trim(),
      state: data.state.trim(),
      stateCode: data.stateCode.trim(),
      pincode: data.pincode.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      contactPerson: data.contactPerson?.trim(),
      shippingAddress: data.shippingAddress,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.customers.unshift(customer);
      return customer;
    }

    await db.collection('customers').updateOne({ id: customer.id }, { $set: customer }, { upsert: true });
    return customer;
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.customers.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      memoryStore.customers[idx] = { ...memoryStore.customers[idx], ...payload };
      return memoryStore.customers[idx];
    }

    await db.collection('customers').updateOne({ id }, { $set: payload });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.customers.findIndex((c) => c.id === id);
      if (idx === -1) return false;
      memoryStore.customers.splice(idx, 1);
      return true;
    }
    const res = await db.collection('customers').deleteOne({ id });
    return res.deletedCount > 0;
  },
};

// ----------------------------------------------------
// 15. Items Collection (Master)
// ----------------------------------------------------
export const dbItems = {
  async getAll(): Promise<Item[]> {
    const db = await getDb();
    if (!db) {
      if (memoryStore.items.length === 0) {
        memoryStore.items = [...DEFAULT_ITEMS];
      }
      return [...memoryStore.items].sort((a, b) => a.name.localeCompare(b.name));
    }

    const docs = await db.collection<Item>('items').find({}).sort({ name: 1 }).toArray();
    if (docs.length === 0) {
      await db.collection('items').insertMany(DEFAULT_ITEMS as any);
      return [...DEFAULT_ITEMS];
    }
    return docs.map(({ _id, ...rest }: any) => rest as Item);
  },

  async getById(id: string): Promise<Item | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.items.find((i) => i.id === id) || null;
    }
    const doc = await db.collection<Item>('items').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as Item;
  },

  async create(data: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Item> {
    const gstPercent = Number(data.gstPercent) || 0;
    const halfGst = Number((gstPercent / 2).toFixed(2));
    const item: Item = {
      id: data.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      hsnCode: data.hsnCode.trim(),
      sku: data.sku?.trim() || undefined,
      unit: (data.unit || 'PCS').trim().toUpperCase(),
      rate: Number(data.rate) || 0,
      gstPercent,
      cgstPercent: halfGst,
      sgstPercent: halfGst,
      igstPercent: gstPercent,
      description: data.description?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.items.unshift(item);
      return item;
    }

    await db.collection('items').updateOne({ id: item.id }, { $set: item }, { upsert: true });
    return item;
  },

  async update(id: string, updates: Partial<Item>): Promise<Item | null> {
    let payload = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.gstPercent !== undefined) {
      const gstPercent = Number(updates.gstPercent) || 0;
      const halfGst = Number((gstPercent / 2).toFixed(2));
      payload = {
        ...payload,
        gstPercent,
        cgstPercent: halfGst,
        sgstPercent: halfGst,
        igstPercent: gstPercent,
      };
    }

    const db = await getDb();
    if (!db) {
      const idx = memoryStore.items.findIndex((i) => i.id === id);
      if (idx === -1) return null;
      memoryStore.items[idx] = { ...memoryStore.items[idx], ...payload };
      return memoryStore.items[idx];
    }

    await db.collection('items').updateOne({ id }, { $set: payload });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.items.findIndex((i) => i.id === id);
      if (idx === -1) return false;
      memoryStore.items.splice(idx, 1);
      return true;
    }
    const res = await db.collection('items').deleteOne({ id });
    return res.deletedCount > 0;
  },
};

// ----------------------------------------------------
// 16. Vouchers Collection (Sales, Purchase, Receipt, Payment)
// ----------------------------------------------------
export const dbVouchers = {
  async getNextVoucherNumber(type: VoucherType): Promise<string> {
    const prefixMap: Record<VoucherType, string> = {
      sales: 'INV-',
      purchase: 'PUR-',
      receipt: 'REC-',
      payment: 'PAY-',
    };
    const prefix = prefixMap[type] || 'VOU-';

    const db = await getDb();
    if (!db) {
      const count = memoryStore.vouchers.filter((v) => v.voucherType === type).length;
      return `${prefix}${1001 + count}`;
    }

    const count = await db.collection('vouchers').countDocuments({ voucherType: type });
    return `${prefix}${1001 + count}`;
  },

  async getAll(filters?: {
    voucherType?: VoucherType | 'all';
    companyId?: string;
    customerId?: string;
    supplierId?: string;
    date?: string;
    search?: string;
  }): Promise<Voucher[]> {
    const db = await getDb();
    let list: Voucher[] = [];

    if (!db) {
      list = [...memoryStore.vouchers];
    } else {
      const query: any = {};
      if (filters?.voucherType && filters.voucherType !== 'all') {
        query.voucherType = filters.voucherType;
      }
      if (filters?.companyId && filters.companyId !== 'all') {
        query.companyId = filters.companyId;
      }
      if (filters?.customerId && filters.customerId !== 'all') {
        query.customerId = filters.customerId;
      }
      if (filters?.supplierId && filters.supplierId !== 'all') {
        query.supplierId = filters.supplierId;
      }
      if (filters?.date) {
        query.date = filters.date;
      }

      const docs = await db
        .collection<Voucher>('vouchers')
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .toArray();
      list = docs.map(({ _id, ...rest }: any) => rest as Voucher);
    }

    // Apply memory filters if offline or additional text search
    if (!db) {
      if (filters?.voucherType && filters.voucherType !== 'all') {
        list = list.filter((v) => v.voucherType === filters.voucherType);
      }
      if (filters?.companyId && filters.companyId !== 'all') {
        list = list.filter((v) => v.companyId === filters.companyId);
      }
      if (filters?.customerId && filters.customerId !== 'all') {
        list = list.filter((v) => v.customerId === filters.customerId);
      }
      if (filters?.supplierId && filters.supplierId !== 'all') {
        list = list.filter((v) => v.supplierId === filters.supplierId);
      }
      if (filters?.date) {
        list = list.filter((v) => v.date === filters.date);
      }
      list.sort((a, b) => (b.date > a.date ? 1 : -1));
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((v) => {
        const num = (v.voucherNumber || '').toLowerCase();
        const comp = (v.companySnapshot?.name || '').toLowerCase();
        const cust = (v.customerSnapshot?.name || '').toLowerCase();
        const supp = (v.supplierSnapshot?.name || '').toLowerCase();
        const ref = (v.referenceInvoiceNumber || v.supplierInvoiceNumber || '').toLowerCase();
        const hasItem = (v.items || []).some((i) => i.itemName.toLowerCase().includes(q));
        return num.includes(q) || comp.includes(q) || cust.includes(q) || supp.includes(q) || ref.includes(q) || hasItem;
      });
    }

    return list;
  },

  async getById(id: string): Promise<Voucher | null> {
    const db = await getDb();
    if (!db) {
      return memoryStore.vouchers.find((v) => v.id === id) || null;
    }
    const doc = await db.collection<Voucher>('vouchers').findOne({ id });
    if (!doc) return null;
    const { _id, ...rest } = doc as any;
    return rest as Voucher;
  },

  async create(data: Omit<Voucher, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Voucher> {
    // 1. Resolve Company snapshot
    const company = await dbCompanies.getById(data.companyId);
    if (!company) {
      throw new Error(`Company with ID "${data.companyId}" not found in Company master.`);
    }

    const companySnapshot: Partial<Company> = {
      id: company.id,
      name: company.name,
      gstin: company.gstin,
      pan: company.pan,
      address: company.address,
      city: company.city,
      state: company.state,
      stateCode: company.stateCode,
      pincode: company.pincode,
      phone: company.phone,
      email: company.email,
      bankDetails: company.bankDetails,
      termsAndConditions: company.termsAndConditions,
    };

    // 2. Resolve Customer snapshot (Sales / Receipt)
    let customerSnapshot: Partial<Customer> | undefined = undefined;
    if (data.customerId) {
      const customer = await dbCustomers.getById(data.customerId);
      if (!customer) {
        throw new Error(`Customer with ID "${data.customerId}" not found in Customer master.`);
      }
      customerSnapshot = {
        id: customer.id,
        name: customer.name,
        gstin: customer.gstin,
        pan: customer.pan,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        stateCode: customer.stateCode,
        pincode: customer.pincode,
        phone: customer.phone,
        email: customer.email,
        contactPerson: customer.contactPerson,
        shippingAddress: customer.shippingAddress,
      };
    }

    // 3. Resolve Supplier snapshot (Purchase / Payment)
    let supplierSnapshot: Partial<Supplier> | undefined = undefined;
    if (data.supplierId) {
      const supplier = await dbSuppliers.getById(data.supplierId);
      if (!supplier) {
        throw new Error(`Supplier with ID "${data.supplierId}" not found in Supplier master.`);
      }
      supplierSnapshot = {
        id: supplier.id,
        name: supplier.name,
        gstin: supplier.gstin,
        pan: supplier.pan,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        stateCode: supplier.stateCode,
        pincode: supplier.pincode,
        phone: supplier.phone,
        email: supplier.email,
        contactPerson: supplier.contactPerson,
      };
    }

    const voucherNumber = data.voucherNumber || (await this.getNextVoucherNumber(data.voucherType));

    const voucher: Voucher = {
      id: data.id || `vouch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      voucherType: data.voucherType,
      voucherNumber,
      date: data.date || new Date().toISOString().split('T')[0],
      companyId: company.id,
      companySnapshot,
      customerId: data.customerId || undefined,
      customerSnapshot,
      supplierId: data.supplierId || undefined,
      supplierSnapshot,
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxableAmount: data.taxableAmount || 0,
      cgstTotal: data.cgstTotal || 0,
      sgstTotal: data.sgstTotal || 0,
      igstTotal: data.igstTotal || 0,
      taxTotal: data.taxTotal || 0,
      roundOff: data.roundOff || 0,
      grandTotal: data.grandTotal,
      placeOfSupply: data.placeOfSupply || customerSnapshot?.state || companySnapshot.state,
      reverseCharge: !!data.reverseCharge,
      supplierInvoiceNumber: data.supplierInvoiceNumber,
      supplierInvoiceDate: data.supplierInvoiceDate,
      shipTo: data.shipTo,
      paymentStatus: data.paymentStatus || 'unpaid',
      amount: data.amount !== undefined ? data.amount : data.grandTotal,
      referenceInvoiceNumber: data.referenceInvoiceNumber,
      paymentMode: data.paymentMode || 'Cash',
      bankName: data.bankName,
      referenceTransactionNumber: data.referenceTransactionNumber,
      narration: data.narration,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions || company.termsAndConditions,
      rawTranscript: data.rawTranscript,
      audioUrl: data.audioUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (!db) {
      memoryStore.vouchers.unshift(voucher);
      return voucher;
    }

    await db.collection('vouchers').updateOne({ id: voucher.id }, { $set: voucher }, { upsert: true });
    return voucher;
  },

  async update(id: string, updates: Partial<Voucher>): Promise<Voucher | null> {
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.vouchers.findIndex((v) => v.id === id);
      if (idx === -1) return null;
      memoryStore.vouchers[idx] = { ...memoryStore.vouchers[idx], ...payload };
      return memoryStore.vouchers[idx];
    }

    await db.collection('vouchers').updateOne({ id }, { $set: payload });
    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      const idx = memoryStore.vouchers.findIndex((v) => v.id === id);
      if (idx === -1) return false;
      memoryStore.vouchers.splice(idx, 1);
      return true;
    }
    const res = await db.collection('vouchers').deleteOne({ id });
    return res.deletedCount > 0;
  },
};

// ----------------------------------------------------
// 17. Account / Ledger Reporting Engine
// ----------------------------------------------------
export const dbLedger = {
  async getTransactions(filters?: {
    companyId?: string;
    customerId?: string;
    supplierId?: string;
    voucherType?: VoucherType | 'all';
    fromDate?: string;
    toDate?: string;
  }): Promise<{ transactions: AccountTransaction[]; summary: LedgerSummary }> {
    const vouchers = await dbVouchers.getAll();

    // Filter vouchers chronologically
    let filtered = vouchers.filter((v) => {
      if (filters?.companyId && filters.companyId !== 'all' && v.companyId !== filters.companyId) {
        return false;
      }
      if (filters?.customerId && filters.customerId !== 'all' && v.customerId !== filters.customerId) {
        return false;
      }
      if (filters?.supplierId && filters.supplierId !== 'all' && v.supplierId !== filters.supplierId) {
        return false;
      }
      if (filters?.voucherType && filters.voucherType !== 'all' && v.voucherType !== filters.voucherType) {
        return false;
      }
      if (filters?.fromDate && v.date < filters.fromDate) {
        return false;
      }
      if (filters?.toDate && v.date > filters.toDate) {
        return false;
      }
      return true;
    });

    // Sort chronologically (oldest to newest) to compute correct running balance
    filtered.sort((a, b) => {
      if (a.date === b.date) return a.createdAt.localeCompare(b.createdAt);
      return a.date.localeCompare(b.date);
    });

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactions: AccountTransaction[] = filtered.map((v) => {
      let partyName = 'Unknown Party';
      let partyType: 'customer' | 'supplier' | 'other' = 'other';
      let partyId = undefined;
      let debit = 0;
      let credit = 0;
      let description = '';

      const amount = v.amount || v.grandTotal || 0;

      switch (v.voucherType) {
        case 'sales':
          partyName = v.customerSnapshot?.name || 'Customer';
          partyType = 'customer';
          partyId = v.customerId;
          description = `Sales Invoice #${v.voucherNumber}`;
          // Company perspective: Sales debits Customer receivables
          debit = amount;
          credit = 0;
          break;

        case 'receipt':
          partyName = v.customerSnapshot?.name || 'Customer';
          partyType = 'customer';
          partyId = v.customerId;
          description = `Money Received #${v.voucherNumber}${
            v.referenceInvoiceNumber ? ` against Inv #${v.referenceInvoiceNumber}` : ''
          } via ${v.paymentMode || 'Payment'}`;
          // Money received: Credits Customer receivables (Cash in)
          debit = 0;
          credit = amount;
          break;

        case 'purchase':
          partyName = v.supplierSnapshot?.name || 'Supplier';
          partyType = 'supplier';
          partyId = v.supplierId;
          description = `Purchase Bill #${v.voucherNumber}${
            v.supplierInvoiceNumber ? ` (Ref: ${v.supplierInvoiceNumber})` : ''
          }`;
          // Purchase bill: Credits Supplier payables
          debit = 0;
          credit = amount;
          break;

        case 'payment':
          partyName = v.supplierSnapshot?.name || 'Supplier';
          partyType = 'supplier';
          partyId = v.supplierId;
          description = `Money Paid #${v.voucherNumber}${
            v.referenceInvoiceNumber ? ` against Bill #${v.referenceInvoiceNumber}` : ''
          } via ${v.paymentMode || 'Payment'}`;
          // Payment to supplier: Debits Supplier payables (Cash out)
          debit = amount;
          credit = 0;
          break;
      }

      totalDebit += debit;
      totalCredit += credit;
      runningBalance += debit - credit;

      return {
        id: `tx_${v.id}`,
        date: v.date,
        voucherId: v.id,
        voucherNumber: v.voucherNumber,
        voucherType: v.voucherType,
        companyId: v.companyId,
        companyName: v.companySnapshot?.name || 'Company',
        partyId,
        partyName,
        partyType,
        description: v.narration || description,
        debit: Number(debit.toFixed(2)),
        credit: Number(credit.toFixed(2)),
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    const summary: LedgerSummary = {
      totalDebit: Number(totalDebit.toFixed(2)),
      totalCredit: Number(totalCredit.toFixed(2)),
      closingBalance: Number(Math.abs(runningBalance).toFixed(2)),
      balanceType: runningBalance >= 0 ? 'Dr' : 'Cr',
      transactionsCount: transactions.length,
    };

    // Return in reverse chronological order (newest first) for UI display
    return {
      transactions: transactions.reverse(),
      summary,
    };
  },
};

