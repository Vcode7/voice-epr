import { Receipt } from '../types';

export interface IReceiptRepository {
  createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt>;
  getReceipts(): Promise<Receipt[]>;
  getReceipt(id: string): Promise<Receipt | null>;
  updateReceipt(id: string, updates: Partial<Receipt>): Promise<Receipt | null>;
  deleteReceipt(id: string): Promise<boolean>;
  getNextReceiptNumber(): Promise<string>;
  clearAllReceipts(): Promise<void>;
  saveMultipleReceipts(receipts: Receipt[]): Promise<void>;
}
