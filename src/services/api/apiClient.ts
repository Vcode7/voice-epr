import { Platform } from 'react-native';
import {
  Transaction,
  Receipt,
  Budget,
  Debt,
  DataTemplate,
  DataEntryRecord,
  UserSettings,
  ExtractedIntentResult,
  ExtractedReceiptResult,
  ExtractedDataResult,
  FlexibleExtractedResult,
  FinancialQueryResult,
} from '../../types';

export const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim() !== '') {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  // Android Emulator default fallback is 10.0.2.2, iOS / Web is localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  }
  return 'http://localhost:3000';
};

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `API request failed (Status ${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch {}
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // ----------------------------------------------------
  // Groq AI Endpoints
  // ----------------------------------------------------
  public static async transcribeAudio(audioUri: string): Promise<string> {
    const formData = new FormData();
    const filename = audioUri.split('/').pop() || 'recording.m4a';

    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: filename,
    } as any);

    const data = await this.request<{ text: string }>('/api/groq/transcribe', {
      method: 'POST',
      body: formData,
    });

    return data.text;
  }

  public static async extractFinancialIntent(transcript: string): Promise<ExtractedIntentResult> {
    return this.request<ExtractedIntentResult>('/api/groq/intent', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  public static async extractVoiceReceipt(transcript: string): Promise<ExtractedReceiptResult> {
    return this.request<ExtractedReceiptResult>('/api/groq/receipt', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  public static async extractCustomData(transcript: string, template: DataTemplate): Promise<ExtractedDataResult> {
    return this.request<ExtractedDataResult>('/api/groq/custom-data', {
      method: 'POST',
      body: JSON.stringify({ transcript, template }),
    });
  }

  public static async extractFlexibleData(transcript: string): Promise<FlexibleExtractedResult> {
    return this.request<FlexibleExtractedResult>('/api/groq/flexible', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  public static async parseFinancialQuery(transcript: string): Promise<FinancialQueryResult> {
    return this.request<FinancialQueryResult>('/api/groq/query', {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  public static async getKeyStatus(): Promise<{
    hasEnvKey: boolean;
    hasCustomKey: boolean;
    isConfigured: boolean;
    activeKeyType: string;
  }> {
    return this.request('/api/groq/status');
  }

  // ----------------------------------------------------
  // Transactions CRUD
  // ----------------------------------------------------
  public static async getTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>('/api/transactions');
  }

  public static async createTransaction(tx: Omit<Transaction, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Transaction> {
    return this.request<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  public static async saveMultipleTransactions(txs: Transaction[]): Promise<Transaction[]> {
    return this.request<Transaction[]>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(txs),
    });
  }

  public static async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    return this.request<Transaction>(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static async deleteTransaction(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // Receipts CRUD
  // ----------------------------------------------------
  public static async getReceipts(): Promise<Receipt[]> {
    return this.request<Receipt[]>('/api/receipts');
  }

  public static async getNextReceiptNumber(): Promise<string> {
    const data = await this.request<{ nextReceiptNumber: string }>('/api/receipts/next-number');
    return data.nextReceiptNumber;
  }

  public static async createReceipt(rcpt: Omit<Receipt, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Receipt> {
    return this.request<Receipt>('/api/receipts', {
      method: 'POST',
      body: JSON.stringify(rcpt),
    });
  }

  public static async saveMultipleReceipts(rcpts: Receipt[]): Promise<Receipt[]> {
    return this.request<Receipt[]>('/api/receipts', {
      method: 'POST',
      body: JSON.stringify(rcpts),
    });
  }

  public static async updateReceipt(id: string, updates: Partial<Receipt>): Promise<Receipt> {
    return this.request<Receipt>(`/api/receipts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static async deleteReceipt(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/receipts/${id}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // Budgets CRUD
  // ----------------------------------------------------
  public static async getBudgets(): Promise<Budget[]> {
    return this.request<Budget[]>('/api/budgets');
  }

  public static async setBudget(category: string, amount: number, period: Budget['period'] = 'monthly'): Promise<Budget> {
    return this.request<Budget>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify({ category, amount, period }),
    });
  }

  public static async deleteBudget(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // Debts CRUD
  // ----------------------------------------------------
  public static async getDebts(): Promise<Debt[]> {
    return this.request<Debt[]>('/api/debts');
  }

  public static async recordDebt(
    personName: string,
    amount: number,
    type: 'given' | 'borrowed',
    notes?: string | null,
    date?: string
  ): Promise<Debt> {
    return this.request<Debt>('/api/debts', {
      method: 'POST',
      body: JSON.stringify({ personName, amount, type, notes, date }),
    });
  }

  public static async recordRepayment(personName: string, amount: number): Promise<Debt | null> {
    return this.request<Debt | null>('/api/debts', {
      method: 'POST',
      body: JSON.stringify({ personName, amount, action: 'repayment' }),
    });
  }

  public static async toggleDebtSettled(id: string): Promise<Debt> {
    return this.request<Debt>(`/api/debts/${id}/toggle`, {
      method: 'POST',
    });
  }

  public static async deleteDebt(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/debts/${id}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // Templates CRUD
  // ----------------------------------------------------
  public static async getTemplates(): Promise<DataTemplate[]> {
    return this.request<DataTemplate[]>('/api/templates');
  }

  public static async saveTemplate(template: DataTemplate): Promise<DataTemplate> {
    return this.request<DataTemplate>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  public static async deleteTemplate(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  public static async resetTemplates(): Promise<DataTemplate[]> {
    return this.request<DataTemplate[]>('/api/templates/reset', {
      method: 'POST',
    });
  }

  // ----------------------------------------------------
  // Data Entries CRUD
  // ----------------------------------------------------
  public static async getDataEntries(): Promise<DataEntryRecord[]> {
    return this.request<DataEntryRecord[]>('/api/data-entries');
  }

  public static async getDataEntryById(id: string): Promise<DataEntryRecord | null> {
    return this.request<DataEntryRecord>(`/api/data-entries/${id}`);
  }

  public static async createDataEntry(entry: Omit<DataEntryRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string }): Promise<DataEntryRecord> {
    return this.request<DataEntryRecord>('/api/data-entries', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }

  public static async saveMultipleDataEntries(entries: DataEntryRecord[]): Promise<DataEntryRecord[]> {
    return this.request<DataEntryRecord[]>('/api/data-entries', {
      method: 'POST',
      body: JSON.stringify(entries),
    });
  }

  public static async updateDataEntry(id: string, updates: Partial<DataEntryRecord>): Promise<DataEntryRecord> {
    return this.request<DataEntryRecord>(`/api/data-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public static async deleteDataEntry(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/data-entries/${id}`, {
      method: 'DELETE',
    });
  }

  // ----------------------------------------------------
  // Settings & DB Utils
  // ----------------------------------------------------
  public static async getSettings(): Promise<UserSettings> {
    return this.request<UserSettings>('/api/settings');
  }

  public static async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.request<UserSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  public static async seedDemoData(): Promise<any> {
    return this.request('/api/seed', { method: 'POST' });
  }

  public static async clearAllData(): Promise<any> {
    return this.request('/api/clear', { method: 'POST' });
  }
}
