import { getDb } from '../mongodb';
import {
  Transaction,
  Receipt,
  Budget,
  Debt,
  DataTemplate,
  DataEntryRecord,
  UserSettings,
} from '../../types';
import { DEFAULT_SETTINGS, DEFAULT_MONITORING_DETAILS_TEMPLATE, NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE } from '../constants';

// In-Memory fallback store if MongoDB URI is not configured or in offline mode
const memoryStore = {
  transactions: [] as Transaction[],
  receipts: [] as Receipt[],
  budgets: [] as Budget[],
  debts: [] as Debt[],
  templates: [DEFAULT_MONITORING_DETAILS_TEMPLATE] as DataTemplate[],
  dataEntries: [] as DataEntryRecord[],
  settings: { ...DEFAULT_SETTINGS } as UserSettings,
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
      // Seed default and indepth templates
      await db.collection('templates').insertMany([NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE] as any);
      return [NEW_DEFAULT_TEMPLATE, INDEPTH_TEMPLATE];
    }

    // Auto-migrate: ensure NEW_DEFAULT_TEMPLATE and INDEPTH_TEMPLATE exist in database
    const hasDefault = docs.some((d) => d.id === NEW_DEFAULT_TEMPLATE.id);
    const hasIndepth = docs.some((d) => d.id === INDEPTH_TEMPLATE.id || d.name === 'Indepth Template');

    if (!hasDefault || !hasIndepth) {
      if (!hasDefault) {
        await db.collection('templates').updateOne(
          { id: NEW_DEFAULT_TEMPLATE.id },
          { $set: NEW_DEFAULT_TEMPLATE },
          { upsert: true }
        );
      }
      if (!hasIndepth) {
        await db.collection('templates').updateOne(
          { id: INDEPTH_TEMPLATE.id },
          { $set: INDEPTH_TEMPLATE },
          { upsert: true }
        );
      }
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
